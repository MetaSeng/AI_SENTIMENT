import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/server/auth"
import { getDateBounds, getDateFilterFromSearchParams } from "@/lib/server/date-filter"

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

    const filter = getDateFilterFromSearchParams(new URL(request.url).searchParams)
    const bounds = getDateBounds(filter)

    const latestEvaluation = await (prisma as any).modelEvaluation.findFirst({
      where: {
        project: { ownerId: user.id },
      },
      orderBy: { evaluatedAt: "desc" },
    })

    const comments = await prisma.cleanComment.findMany({
      where: {
        run: {
          status: "COMPLETED",
          project: { ownerId: user.id },
        },
        ...(bounds
          ? {
              createdAt: {
                gte: bounds.from,
                lte: bounds.to,
              },
            }
          : {}),
      },
      select: {
        sentiment: true,
        sentimentScore: true,
        cleaningMeta: true,
      },
    })

    const labelDistribution = {
      positive: 0,
      neutral: 0,
      negative: 0,
    }

    let positiveScoreSum = 0
    let confidenceSum = 0
    let confidenceCount = 0

    for (const comment of comments) {
      labelDistribution[comment.sentiment] += 1
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

    const response = {
      latestEvaluation: latestEvaluation
        ? {
            id: latestEvaluation.id,
            modelName: latestEvaluation.modelName,
            modelVersion: latestEvaluation.modelVersion,
            datasetName: latestEvaluation.datasetName,
            sampleSize: latestEvaluation.sampleSize,
            accuracy: toNumberOrNull(latestEvaluation.accuracy),
            precisionMacro: toNumberOrNull(latestEvaluation.precisionMacro),
            recallMacro: toNumberOrNull(latestEvaluation.recallMacro),
            f1Macro: toNumberOrNull(latestEvaluation.f1Macro),
            evaluatedAt: latestEvaluation.evaluatedAt.toISOString(),
          }
        : null,
      proxy: {
        totalPredictions: comments.length,
        avgPositiveScore:
          comments.length > 0 ? Number((positiveScoreSum / comments.length).toFixed(4)) : null,
        avgConfidence:
          confidenceCount > 0 ? Number((confidenceSum / confidenceCount).toFixed(4)) : null,
        labelDistribution,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Failed to load sentiment model metrics (latest):", error)
    return NextResponse.json(
      { error: "Failed to load model metrics" },
      { status: 500 },
    )
  }
}
