import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/server/auth"

function parseConfidence(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "bigint") return Number(value)
  return null
}

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

    const evaluations = await (prisma as any).modelEvaluation.findMany({
      where: {
        project: { ownerId: user.id },
      },
      orderBy: { evaluatedAt: "desc" },
      take: limit,
    })

    const runs = await prisma.analysisRun.findMany({
      where: {
        status: "COMPLETED",
        project: { ownerId: user.id },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        cleanedComments: {
          select: {
            sentimentScore: true,
            cleaningMeta: true,
          },
        },
      },
    })

    const proxyTrend = runs.map((run) => {
      const totalComments = run.cleanedComments.length
      let positiveScoreSum = 0
      let confidenceSum = 0
      let confidenceCount = 0

      for (const comment of run.cleanedComments) {
        positiveScoreSum += Number(comment.sentimentScore)
        const meta =
          comment.cleaningMeta && typeof comment.cleaningMeta === "object"
            ? (comment.cleaningMeta as Record<string, unknown>)
            : null
        const confidence = parseConfidence(meta?.sentimentConfidence)
        if (confidence !== null) {
          confidenceSum += confidence
          confidenceCount += 1
        }
      }

      return {
        runId: run.id,
        createdAt: run.createdAt.toISOString(),
        totalComments,
        avgPositiveScore:
          totalComments > 0
            ? Number((positiveScoreSum / totalComments).toFixed(4))
            : null,
        avgConfidence:
          confidenceCount > 0
            ? Number((confidenceSum / confidenceCount).toFixed(4))
            : null,
      }
    })

    return NextResponse.json({
      evaluations: evaluations.map((item: any) => ({
        id: item.id,
        modelName: item.modelName,
        modelVersion: item.modelVersion,
        datasetName: item.datasetName,
        sampleSize: item.sampleSize,
        accuracy: toNumberOrNull(item.accuracy),
        precisionMacro: toNumberOrNull(item.precisionMacro),
        recallMacro: toNumberOrNull(item.recallMacro),
        f1Macro: toNumberOrNull(item.f1Macro),
        evaluatedAt: item.evaluatedAt.toISOString(),
      })),
      proxyTrend,
    })
  } catch (error) {
    console.error("Failed to load sentiment model metrics (history):", error)
    return NextResponse.json(
      { error: "Failed to load model metrics history" },
      { status: 500 },
    )
  }
}
