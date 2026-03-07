import type { Prisma } from "@/lib/generated/prisma/client"
import type { Comment, DateFilterOptions, Sentiment } from "@/lib/types"
import { buildOverview, buildProducts, buildRecommendations } from "@/lib/transform"
import { getDateBounds } from "@/lib/server/date-filter"

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export type RunWithDetails = Prisma.AnalysisRunGetPayload<{
  include: {
    cleanedComments: { include: { product: true }; orderBy: { createdAt: "desc" } }
  }
}>

export function buildAnalysisResponse(
  run: RunWithDetails,
  filter: DateFilterOptions,
) {
  const bounds = getDateBounds(filter)

  const comments: Comment[] = run.cleanedComments
    .map((c) => {
      const commentDate = c.normalizedDate ?? c.createdAt
      const meta =
        c.cleaningMeta && typeof c.cleaningMeta === "object"
          ? (c.cleaningMeta as { languageTag?: unknown; clusterId?: unknown })
          : {}
      return {
        id: c.id,
        text: c.cleanedText,
        productMentioned: c.product?.name ?? "General",
        sentiment: c.sentiment as Sentiment,
        sentimentScore: Number(c.sentimentScore),
        date: formatDate(commentDate),
        author: c.normalizedAuthor ?? "Unknown",
        likes: c.normalizedLikes,
        languageTag:
          typeof meta.languageTag === "string" ? meta.languageTag : undefined,
        clusterId:
          typeof meta.clusterId === "number" && Number.isFinite(meta.clusterId)
            ? Math.floor(meta.clusterId)
            : undefined,
      }
    })
    .filter((c) => {
      if (!bounds) return true
      const d = new Date(c.date)
      if (Number.isNaN(d.getTime())) return false
      return d >= bounds.from && d <= bounds.to
    })

  const products = buildProducts(comments)
  const overview = buildOverview(comments, products)
  const recommendations = buildRecommendations(products, comments)

  return {
    runId: run.id,
    createdAt: run.createdAt,
    comments,
    products,
    overview,
    recommendations,
  }
}
