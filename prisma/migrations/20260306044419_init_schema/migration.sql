-- CreateEnum
CREATE TYPE "SentimentLabel" AS ENUM ('positive', 'neutral', 'negative');

-- CreateEnum
CREATE TYPE "RunMode" AS ENUM ('DEMO', 'LIVE');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SourcePlatform" AS ENUM ('FACEBOOK');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('PENDING', 'TRIGGERED', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('success', 'warning', 'danger', 'info');

-- CreateEnum
CREATE TYPE "RecommendationKind" AS ENUM ('TOP_PERFORMER', 'NEEDS_IMPROVEMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT,
    "businessName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "sentimentAlerts" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT,
    "defaultDateRange" TEXT,
    "apiBaseUrl" TEXT,
    "apiKeyEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "platform" "SourcePlatform" NOT NULL,
    "displayName" TEXT,
    "externalPageId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT DEFAULT 'General',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "initiatedByUserId" TEXT,
    "mode" "RunMode" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "avgSentimentScore" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "progressPercent" INTEGER,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisSource" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "productId" TEXT,
    "inputProductName" TEXT NOT NULL,
    "inputUrl" TEXT NOT NULL,
    "resolvedUrl" TEXT,
    "snapshotId" TEXT,
    "status" "SourceStatus" NOT NULL DEFAULT 'PENDING',
    "sourceError" TEXT,
    "triggeredAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawComment" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalPostId" TEXT,
    "externalCommentId" TEXT,
    "externalAuthorId" TEXT,
    "rawText" TEXT,
    "rawDate" TIMESTAMP(3),
    "rawAuthorName" TEXT,
    "rawLikes" INTEGER,
    "rawPayload" JSONB NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanComment" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "rawCommentId" TEXT NOT NULL,
    "productId" TEXT,
    "cleanedText" TEXT NOT NULL,
    "normalizedDate" TIMESTAMP(3),
    "normalizedAuthor" TEXT,
    "normalizedLikes" INTEGER NOT NULL DEFAULT 0,
    "languageCode" TEXT,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "cleaningMeta" JSONB,
    "sentiment" "SentimentLabel" NOT NULL,
    "sentimentScore" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleanComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRunMetric" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mentionCount" INTEGER NOT NULL,
    "positivePercent" INTEGER NOT NULL,
    "neutralPercent" INTEGER NOT NULL,
    "negativePercent" INTEGER NOT NULL,
    "avgSentimentScore" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRunMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordMetric" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "productId" TEXT,
    "word" TEXT NOT NULL,
    "sentiment" "SentimentLabel" NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "productId" TEXT,
    "kind" "RecommendationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "percentValue" INTEGER,
    "bulletPoints" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSetting_userId_key" ON "UserSetting"("userId");

-- CreateIndex
CREATE INDEX "Integration_projectId_platform_idx" ON "Integration"("projectId", "platform");

-- CreateIndex
CREATE INDEX "Product_projectId_idx" ON "Product"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_projectId_name_key" ON "Product"("projectId", "name");

-- CreateIndex
CREATE INDEX "AnalysisRun_projectId_createdAt_idx" ON "AnalysisRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_status_createdAt_idx" ON "AnalysisRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RunEvent_runId_createdAt_idx" ON "RunEvent"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisSource_runId_idx" ON "AnalysisSource"("runId");

-- CreateIndex
CREATE INDEX "AnalysisSource_snapshotId_idx" ON "AnalysisSource"("snapshotId");

-- CreateIndex
CREATE INDEX "RawComment_runId_sourceId_idx" ON "RawComment"("runId", "sourceId");

-- CreateIndex
CREATE INDEX "RawComment_externalCommentId_idx" ON "RawComment"("externalCommentId");

-- CreateIndex
CREATE UNIQUE INDEX "CleanComment_rawCommentId_key" ON "CleanComment"("rawCommentId");

-- CreateIndex
CREATE INDEX "CleanComment_runId_sentiment_idx" ON "CleanComment"("runId", "sentiment");

-- CreateIndex
CREATE INDEX "CleanComment_runId_productId_idx" ON "CleanComment"("runId", "productId");

-- CreateIndex
CREATE INDEX "CleanComment_normalizedDate_idx" ON "CleanComment"("normalizedDate");

-- CreateIndex
CREATE INDEX "ProductRunMetric_runId_idx" ON "ProductRunMetric"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRunMetric_runId_productId_key" ON "ProductRunMetric"("runId", "productId");

-- CreateIndex
CREATE INDEX "KeywordMetric_runId_count_idx" ON "KeywordMetric"("runId", "count");

-- CreateIndex
CREATE INDEX "KeywordMetric_runId_productId_idx" ON "KeywordMetric"("runId", "productId");

-- CreateIndex
CREATE INDEX "Insight_runId_sortOrder_idx" ON "Insight"("runId", "sortOrder");

-- CreateIndex
CREATE INDEX "RecommendationItem_runId_kind_idx" ON "RecommendationItem"("runId", "kind");

-- AddForeignKey
ALTER TABLE "UserSetting" ADD CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunEvent" ADD CONSTRAINT "RunEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisSource" ADD CONSTRAINT "AnalysisSource_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisSource" ADD CONSTRAINT "AnalysisSource_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawComment" ADD CONSTRAINT "RawComment_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawComment" ADD CONSTRAINT "RawComment_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "AnalysisSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanComment" ADD CONSTRAINT "CleanComment_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanComment" ADD CONSTRAINT "CleanComment_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "AnalysisSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanComment" ADD CONSTRAINT "CleanComment_rawCommentId_fkey" FOREIGN KEY ("rawCommentId") REFERENCES "RawComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanComment" ADD CONSTRAINT "CleanComment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRunMetric" ADD CONSTRAINT "ProductRunMetric_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRunMetric" ADD CONSTRAINT "ProductRunMetric_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordMetric" ADD CONSTRAINT "KeywordMetric_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordMetric" ADD CONSTRAINT "KeywordMetric_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
