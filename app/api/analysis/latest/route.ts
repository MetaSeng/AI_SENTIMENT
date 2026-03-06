import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildAnalysisResponse } from "@/lib/server/analysis-response"
import { getSessionUser } from "@/lib/server/auth"
import { getDateFilterFromSearchParams } from "@/lib/server/date-filter"

export async function GET(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const filter = getDateFilterFromSearchParams(new URL(request.url).searchParams)

    const run = await prisma.analysisRun.findFirst({
      where: {
        status: "COMPLETED",
        project: { ownerId: user.id },
      },
      orderBy: { createdAt: "desc" },
      include: {
        cleanedComments: {
          include: { product: true },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!run) {
      return NextResponse.json({ error: "No completed analysis found" }, { status: 404 })
    }

    return NextResponse.json(buildAnalysisResponse(run, filter))
  } catch (error) {
    console.error("Failed to load latest analysis:", error)
    return NextResponse.json(
      { error: "Failed to load latest analysis" },
      { status: 500 },
    )
  }
}
