import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/server/auth"
import type { Comment, Product, DashboardOverview, Recommendation } from "@/lib/types"

type SourceInput = { url: string; productName: string }

interface SaveAnalysisPayload {
  mode?: "LIVE" | "DEMO"
  sources?: SourceInput[]
  comments: Comment[]
  products: Product[]
  overview: DashboardOverview
  recommendations: Recommendation
}

function toDateOrNull(value: string): Date | null {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as SaveAnalysisPayload

    if (!body || !Array.isArray(body.comments) || !Array.isArray(body.products)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    let project = await prisma.project.findFirst({
      where: { ownerId: user.id, name: "Default Project" },
    })
    if (!project) {
      project = await prisma.project.create({
        data: { ownerId: user.id, name: "Default Project" },
      })
    }

    const run = await prisma.analysisRun.create({
      data: {
        projectId: project.id,
        initiatedByUserId: user.id,
        mode: body.mode === "DEMO" ? "DEMO" : "LIVE",
        status: "COMPLETED",
        startedAt: new Date(),
        finishedAt: new Date(),
        totalComments: body.overview?.totalComments ?? body.comments.length,
        productCount: body.overview?.engagedProducts ?? body.products.length,
        avgSentimentScore:
          body.comments.length > 0
            ? (body.comments.reduce((sum, c) => sum + c.sentimentScore, 0) /
                body.comments.length)
            : 0,
      },
    })

    const productIdByName = new Map<string, string>()
    for (const p of body.products) {
      const created = await prisma.product.upsert({
        where: {
          projectId_name: {
            projectId: project.id,
            name: p.name,
          },
        },
        update: {
          category: p.category || "General",
          isActive: true,
        },
        create: {
          projectId: project.id,
          name: p.name,
          category: p.category || "General",
        },
      })
      productIdByName.set(p.name, created.id)
    }

    const sourceIdByProductName = new Map<string, string>()
    const sourceRows = body.sources ?? []
    for (const s of sourceRows) {
      const source = await prisma.analysisSource.create({
        data: {
          runId: run.id,
          productId: productIdByName.get(s.productName),
          inputProductName: s.productName,
          inputUrl: s.url,
          resolvedUrl: s.url,
          status: "READY",
          triggeredAt: new Date(),
          readyAt: new Date(),
        },
      })
      sourceIdByProductName.set(s.productName, source.id)
    }

    let fallbackSourceId: string | null = null
    if (sourceRows.length === 0) {
      const source = await prisma.analysisSource.create({
        data: {
          runId: run.id,
          inputProductName: "General",
          inputUrl: "demo://generated",
          resolvedUrl: "demo://generated",
          status: "READY",
          triggeredAt: new Date(),
          readyAt: new Date(),
        },
      })
      fallbackSourceId = source.id
    }

    for (const c of body.comments) {
      const sourceId = sourceIdByProductName.get(c.productMentioned) ?? fallbackSourceId
      if (!sourceId) continue

      const raw = await prisma.rawComment.create({
        data: {
          runId: run.id,
          sourceId,
          externalCommentId: c.id,
          rawText: c.text,
          rawDate: toDateOrNull(c.date),
          rawAuthorName: c.author,
          rawLikes: c.likes,
          rawPayload: c as unknown as object,
        },
      })

      await prisma.cleanComment.create({
        data: {
          runId: run.id,
          sourceId,
          rawCommentId: raw.id,
          productId: productIdByName.get(c.productMentioned),
          cleanedText: c.text,
          normalizedDate: toDateOrNull(c.date),
          normalizedAuthor: c.author,
          normalizedLikes: c.likes,
          cleaningMeta: {
            languageTag: c.languageTag ?? null,
            clusterId: typeof c.clusterId === "number" ? c.clusterId : null,
            sentimentConfidence:
              typeof c.sentimentConfidence === "number" && Number.isFinite(c.sentimentConfidence)
                ? c.sentimentConfidence
                : null,
          },
          sentiment: c.sentiment,
          sentimentScore: c.sentimentScore,
        },
      })
    }

    for (const p of body.products) {
      const productId = productIdByName.get(p.name)
      if (!productId) continue

      await prisma.productRunMetric.create({
        data: {
          runId: run.id,
          productId,
          mentionCount: p.mentionCount,
          positivePercent: p.positivePercent,
          neutralPercent: p.neutralPercent,
          negativePercent: p.negativePercent,
          avgSentimentScore: p.avgSentimentScore,
        },
      })

      for (const kw of p.keywords) {
        await prisma.keywordMetric.create({
          data: {
            runId: run.id,
            productId,
            word: kw.word,
            sentiment: kw.sentiment,
            count: kw.count,
          },
        })
      }
    }

    for (const topic of body.recommendations?.trendingTopics ?? []) {
      await prisma.keywordMetric.create({
        data: {
          runId: run.id,
          productId: null,
          word: topic.word,
          sentiment: topic.sentiment,
          count: topic.count,
        },
      })
    }

    for (let i = 0; i < (body.recommendations?.insights ?? []).length; i++) {
      const insight = body.recommendations.insights[i]
      await prisma.insight.create({
        data: {
          runId: run.id,
          icon: insight.icon,
          title: insight.title,
          description: insight.description,
          type: insight.type,
          sortOrder: i,
        },
      })
    }

    for (const item of body.recommendations?.topProducts ?? []) {
      await prisma.recommendationItem.create({
        data: {
          runId: run.id,
          productId: productIdByName.get(item.name),
          kind: "TOP_PERFORMER",
          title: item.name,
          percentValue: item.positivePercent,
          bulletPoints: item.praisePoints,
        },
      })
    }

    for (const item of body.recommendations?.needsImprovement ?? []) {
      await prisma.recommendationItem.create({
        data: {
          runId: run.id,
          productId: productIdByName.get(item.name),
          kind: "NEEDS_IMPROVEMENT",
          title: item.name,
          percentValue: item.negativePercent,
          bulletPoints: item.complaints,
        },
      })
    }

    await prisma.runEvent.create({
      data: {
        runId: run.id,
        stage: "Complete",
        progressPercent: 100,
        message: "Analysis persisted to database.",
      },
    })

    return NextResponse.json({ success: true, runId: run.id })
  } catch (error) {
    console.error("Failed to save analysis:", error)
    return NextResponse.json(
      { error: "Failed to save analysis to database" },
      { status: 500 },
    )
  }
}
