import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/server/auth"

export async function GET(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get("limit") ?? "20")
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, 100))
      : 20

    const runs = await prisma.analysisRun.findMany({
      where: {
        project: { ownerId: user.id },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        sources: true,
        productMetrics: {
          include: { product: true },
          orderBy: { mentionCount: "desc" },
          take: 3,
        },
      },
    })

    return NextResponse.json({
      runs: runs.map((run) => ({
        runId: run.id,
        mode: run.mode,
        status: run.status,
        createdAt: run.createdAt.toISOString(),
        finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
        totalComments: run.totalComments,
        productCount: run.productCount,
        avgSentimentScore: run.avgSentimentScore ? Number(run.avgSentimentScore) : 0,
        sourceCount: run.sources.length,
        topProducts: run.productMetrics.map((m) => ({
          name: m.product.name,
          mentionCount: m.mentionCount,
          positivePercent: m.positivePercent,
          negativePercent: m.negativePercent,
        })),
      })),
    })
  } catch (error) {
    console.error("Failed to load analysis history:", error)
    return NextResponse.json(
      { error: "Failed to load analysis history" },
      { status: 500 },
    )
  }
}
