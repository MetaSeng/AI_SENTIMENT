import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/server/auth"

interface CreateModelEvaluationBody {
  modelName?: string
  modelVersion?: string | null
  datasetName?: string | null
  sampleSize?: number
  accuracy?: number | null
  precisionMacro?: number | null
  recallMacro?: number | null
  f1Macro?: number | null
  metrics?: Record<string, unknown> | null
  confusionMatrix?: Record<string, unknown> | null
  notes?: string | null
  evaluatedAt?: string | null
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(1, n))
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as CreateModelEvaluationBody
    const modelName = String(body.modelName ?? "").trim()
    if (!modelName) {
      return NextResponse.json(
        { error: "modelName is required" },
        { status: 400 },
      )
    }

    let project = await prisma.project.findFirst({
      where: {
        ownerId: user.id,
        name: "Default Project",
      },
    })

    if (!project) {
      project = await prisma.project.create({
        data: {
          ownerId: user.id,
          name: "Default Project",
        },
      })
    }

    const evaluatedAt = body.evaluatedAt ? new Date(body.evaluatedAt) : new Date()
    const validEvaluatedAt = Number.isNaN(evaluatedAt.getTime()) ? new Date() : evaluatedAt

    const created = await (prisma as any).modelEvaluation.create({
      data: {
        projectId: project.id,
        modelName,
        modelVersion: body.modelVersion?.trim() || null,
        datasetName: body.datasetName?.trim() || null,
        sampleSize: Number.isFinite(body.sampleSize) ? Math.max(0, Math.floor(body.sampleSize as number)) : 0,
        accuracy: normalizeOptionalNumber(body.accuracy),
        precisionMacro: normalizeOptionalNumber(body.precisionMacro),
        recallMacro: normalizeOptionalNumber(body.recallMacro),
        f1Macro: normalizeOptionalNumber(body.f1Macro),
        metrics: body.metrics ?? null,
        confusionMatrix: body.confusionMatrix ?? null,
        notes: body.notes?.trim() || null,
        evaluatedAt: validEvaluatedAt,
      },
    })

    return NextResponse.json({
      success: true,
      evaluation: {
        id: created.id,
        modelName: created.modelName,
        modelVersion: created.modelVersion,
        datasetName: created.datasetName,
        sampleSize: created.sampleSize,
        accuracy: created.accuracy ? Number(created.accuracy) : null,
        precisionMacro: created.precisionMacro ? Number(created.precisionMacro) : null,
        recallMacro: created.recallMacro ? Number(created.recallMacro) : null,
        f1Macro: created.f1Macro ? Number(created.f1Macro) : null,
        evaluatedAt: created.evaluatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Failed to create model evaluation:", error)
    return NextResponse.json(
      { error: "Failed to create model evaluation" },
      { status: 500 },
    )
  }
}
