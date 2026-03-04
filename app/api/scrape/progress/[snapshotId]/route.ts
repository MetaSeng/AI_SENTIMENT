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

    const progressUrl = `${BRIGHTDATA_API}/progress/${snapshotId}`
    console.log("[v0] Checking progress:", progressUrl)

    const response = await fetch(progressUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    const responseText = await response.text()
    console.log("[v0] Progress response status:", response.status)
    console.log("[v0] Progress response body:", responseText.substring(0, 1000))

    if (!response.ok) {
      return NextResponse.json(
        { error: `Bright Data API error: ${response.status}` },
        { status: response.status }
      )
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON from Bright Data" },
        { status: 500 }
      )
    }

    console.log("[v0] Progress data:", JSON.stringify(data))
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Progress check error:", error)
    return NextResponse.json(
      { error: "Failed to check progress" },
      { status: 500 }
    )
  }
}
