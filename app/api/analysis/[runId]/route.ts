import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildAnalysisResponse } from "@/lib/server/analysis-response"
import { getSessionUser } from "@/lib/server/auth"
import { getDateFilterFromSearchParams } from "@/lib/server/date-filter"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const filter = getDateFilterFromSearchParams(new URL(_request.url).searchParams)
    const { runId } = await params

    const run = await prisma.analysisRun.findUnique({
      where: { id: runId },
      include: {
        project: { select: { ownerId: true } },
        cleanedComments: {
          include: { product: true },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!run || run.status !== "COMPLETED" || run.project.ownerId !== user.id) {
      return NextResponse.json({ error: "Analysis run not found" }, { status: 404 })
    }

    return NextResponse.json(buildAnalysisResponse(run, filter))
  } catch (error) {
    console.error("Failed to load analysis run:", error)
    return NextResponse.json(
      { error: "Failed to load analysis run" },
      { status: 500 },
    )
  }
}
