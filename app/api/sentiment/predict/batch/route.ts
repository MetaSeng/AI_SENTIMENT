import { NextResponse } from "next/server"

interface SentimentBatchRequestBody {
  texts?: unknown
  batch_size?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SentimentBatchRequestBody
    const texts = Array.isArray(body.texts)
      ? body.texts.filter((t): t is string => typeof t === "string")
      : []

    if (texts.length === 0) {
      return NextResponse.json(
        { error: "texts must be a non-empty string array" },
        { status: 400 },
      )
    }

    const requestedBatchSize =
      typeof body.batch_size === "number" && Number.isFinite(body.batch_size)
        ? Math.floor(body.batch_size)
        : 16
    const batchSize = Math.max(1, Math.min(requestedBatchSize, 64))
    const configuredBase =
      process.env.SENTIMENT_API_BASE_URL?.trim() ||
      process.env.SENTIMENT_API_URL?.trim() ||
      "http://127.0.0.1:8000"
    const normalizedBase = configuredBase.replace(/\/+$/, "")
    const upstreamUrl = normalizedBase.endsWith("/sentiment/predict/batch")
      ? normalizedBase
      : normalizedBase.endsWith("/sentiment")
        ? `${normalizedBase}/predict/batch`
        : `${normalizedBase}/sentiment/predict/batch`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    const apiKey = process.env.SENTIMENT_API_KEY?.trim()
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ texts, batch_size: batchSize }),
    })

    const raw = await upstream.text()
    let parsed: unknown = null
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      parsed = null
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "Sentiment API request failed",
          status: upstream.status,
          detail: parsed ?? raw,
        },
        { status: 502 },
      )
    }

    return NextResponse.json(parsed ?? {})
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to proxy sentiment request",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
