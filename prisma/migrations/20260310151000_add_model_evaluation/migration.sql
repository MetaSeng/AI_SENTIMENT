-- CreateTable
CREATE TABLE "ModelEvaluation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT,
    "datasetName" TEXT,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,4),
    "precisionMacro" DECIMAL(5,4),
    "recallMacro" DECIMAL(5,4),
    "f1Macro" DECIMAL(5,4),
    "metrics" JSONB,
    "confusionMatrix" JSONB,
    "notes" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModelEvaluation_projectId_evaluatedAt_idx" ON "ModelEvaluation"("projectId", "evaluatedAt");

-- AddForeignKey
ALTER TABLE "ModelEvaluation" ADD CONSTRAINT "ModelEvaluation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
