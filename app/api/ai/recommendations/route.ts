import { NextResponse } from "next/server"
import type { Comment, Product, Recommendation, Sentiment } from "@/lib/types"

interface RecommendationsRequest {
  comments?: Comment[]
  products?: Product[]
}

function normalizeSentiment(value: unknown): Sentiment {
  const s = String(value ?? "").trim().toLowerCase()
  if (s === "positive" || s === "negative" || s === "neutral") return s
  return "neutral"
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) throw new Error("Empty Gemini response text")

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fenced?.[1] ?? trimmed
  return JSON.parse(candidate)
}

function validateRecommendationShape(value: unknown): Recommendation {
  const v = value as Partial<Recommendation> | null
  if (!v || typeof v !== "object") {
    throw new Error("Gemini response is not an object")
  }

  return {
    topProducts: Array.isArray(v.topProducts)
      ? v.topProducts.slice(0, 3).map((p) => ({
          name: String((p as { name?: unknown }).name ?? "Unknown"),
          positivePercent: clampInt(
            (p as { positivePercent?: unknown }).positivePercent,
            0,
            100,
            0,
          ),
          praisePoints: Array.isArray((p as { praisePoints?: unknown }).praisePoints)
            ? (p as { praisePoints: unknown[] }).praisePoints
                .slice(0, 5)
                .map((x) => String(x))
            : [],
        }))
      : [],
    needsImprovement: Array.isArray(v.needsImprovement)
      ? v.needsImprovement.slice(0, 3).map((p) => ({
          name: String((p as { name?: unknown }).name ?? "Unknown"),
          negativePercent: clampInt(
            (p as { negativePercent?: unknown }).negativePercent,
            0,
            100,
            0,
          ),
          complaints: Array.isArray((p as { complaints?: unknown }).complaints)
            ? (p as { complaints: unknown[] }).complaints.slice(0, 5).map((x) => String(x))
            : [],
        }))
      : [],
    insights: Array.isArray(v.insights)
      ? v.insights.slice(0, 8).map((i, idx) => ({
          id: String((i as { id?: unknown }).id ?? `g-${idx + 1}`),
          icon: String((i as { icon?: unknown }).icon ?? "lightbulb"),
          title: String((i as { title?: unknown }).title ?? "Insight"),
          description: String((i as { description?: unknown }).description ?? ""),
          type: ((): "success" | "warning" | "danger" | "info" => {
            const t = String((i as { type?: unknown }).type ?? "").toLowerCase()
            if (t === "success" || t === "warning" || t === "danger" || t === "info") return t
            return "info"
          })(),
        }))
      : [],
    trendingTopics: Array.isArray(v.trendingTopics)
      ? v.trendingTopics.slice(0, 20).map((t) => ({
          word: String((t as { word?: unknown }).word ?? ""),
          count: clampInt((t as { count?: unknown }).count, 0, 100000, 0),
          sentiment: normalizeSentiment((t as { sentiment?: unknown }).sentiment),
        }))
      : [],
  }
}

function buildPrompt(comments: Comment[], products: Product[]): string {
  const compactProducts = products.slice(0, 12).map((p) => ({
    name: p.name,
    category: p.category,
    mentionCount: p.mentionCount,
    positivePercent: p.positivePercent,
    negativePercent: p.negativePercent,
    neutralPercent: p.neutralPercent,
    avgSentimentScore: p.avgSentimentScore,
    keywords: p.keywords.slice(0, 8),
  }))

  const compactComments = comments.slice(0, 180).map((c) => ({
    text: c.text.slice(0, 280),
    product: c.productMentioned,
    sentiment: c.sentiment,
    score: c.sentimentScore,
    likes: c.likes,
  }))

  return [
    "You are a product feedback analyst for an e-commerce dashboard.",
    "Generate recommendations JSON from provided comments + product metrics.",
    "Return ONLY valid JSON. No markdown, no explanation.",
    "Schema:",
    `{
  "topProducts":[{"name":"string","positivePercent":0,"praisePoints":["string"]}],
  "needsImprovement":[{"name":"string","negativePercent":0,"complaints":["string"]}],
  "insights":[{"id":"string","icon":"string","title":"string","description":"string","type":"success|warning|danger|info"}],
  "trendingTopics":[{"word":"string","count":0,"sentiment":"positive|neutral|negative"}]
}`,
    "Rules:",
    "- Keep topProducts max 3, needsImprovement max 3, insights max 8, trendingTopics max 20.",
    "- Use concise business wording for descriptions and bullet points.",
    "- `positivePercent`/`negativePercent` must be 0..100 integers.",
    "- Pick realistic insights based on provided data only.",
    "",
    "PRODUCTS:",
    JSON.stringify(compactProducts),
    "",
    "COMMENTS:",
    JSON.stringify(compactComments),
  ].join("\n")
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 503 },
      )
    }

    const body = (await request.json()) as RecommendationsRequest
    const comments = Array.isArray(body.comments) ? body.comments : []
    const products = Array.isArray(body.products) ? body.products : []

    if (comments.length === 0 || products.length === 0) {
      return NextResponse.json(
        { error: "comments and products are required" },
        { status: 400 },
      )
    }

    const model = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim()
    const prompt = buildPrompt(comments, products)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    })

    const raw = await upstream.text()
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "Gemini request failed",
          status: upstream.status,
          detail: parsed,
        },
        { status: 502 },
      )
    }

    const text =
      (parsed?.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined)?.[0]
        ?.content?.parts?.[0]?.text ?? ""
    const json = parseJsonFromText(text)
    const recommendations = validateRecommendationShape(json)
    return NextResponse.json({ recommendations })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate Gemini recommendations",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

