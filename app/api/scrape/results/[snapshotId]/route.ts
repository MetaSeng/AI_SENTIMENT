import { NextResponse } from "next/server"

const BRIGHTDATA_API = "https://api.brightdata.com/datasets/v3"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  const apiKey = process.env.BRIGHTDATA_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "BRIGHTDATA_API_KEY not configured" },
      { status: 500 }
    )
  }

  try {
    const { snapshotId } = await params

    const resultsUrl = `${BRIGHTDATA_API}/snapshot/${snapshotId}?format=json`
    console.log("[v0] Fetching results from:", resultsUrl)

    const response = await fetch(resultsUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    const responseText = await response.text()
    console.log("[v0] Results response status:", response.status)
    console.log("[v0] Results response body (first 2000 chars):", responseText.substring(0, 2000))

    if (!response.ok) {
      return NextResponse.json(
        { error: `Bright Data API error: ${response.status}`, details: responseText },
        { status: response.status }
      )
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON from Bright Data", details: responseText.substring(0, 500) },
        { status: 500 }
      )
    }

    console.log("[v0] Results data type:", typeof data, "isArray:", Array.isArray(data), "length:", Array.isArray(data) ? data.length : "N/A")
    if (Array.isArray(data) && data.length > 0) {
      console.log("[v0] First result keys:", Object.keys(data[0]))
      console.log("[v0] First result sample:", JSON.stringify(data[0]).substring(0, 1000))
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Results fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    )
  }
}
