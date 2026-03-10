export type Sentiment = "positive" | "negative" | "neutral"

export interface Comment {
  id: string
  text: string
  productMentioned: string
  sentiment: Sentiment
  sentimentScore: number
  date: string
  author: string
  likes: number
  languageTag?: string
  clusterId?: number
  sentimentConfidence?: number
}

export interface Product {
  id: string
  name: string
  category: string
  mentionCount: number
  positivePercent: number
  negativePercent: number
  neutralPercent: number
  avgSentimentScore: number
  comments: Comment[]
  keywords: { word: string; sentiment: Sentiment; count: number }[]
  trendData: { date: string; positive: number; negative: number; neutral: number }[]
}

export interface Insight {
  id: string
  icon: string
  title: string
  description: string
  type: "success" | "warning" | "danger" | "info"
}

export interface DashboardOverview {
  totalComments: number
  avgSentimentScore: number
  engagedProducts: number
  recommendationCount: number
  sentimentOverTime: {
    date: string
    positive: number
    negative: number
    neutral: number
  }[]
  sentimentDistribution: {
    name: string
    value: number
    fill: string
  }[]
  engagementVsSentiment: {
    post: string
    likes: number
    sentimentScore: number
  }[]
}

export interface Recommendation {
  topProducts: {
    name: string
    positivePercent: number
    praisePoints: string[]
  }[]
  needsImprovement: {
    name: string
    negativePercent: number
    complaints: string[]
  }[]
  insights: Insight[]
  trendingTopics: {
    word: string
    count: number
    sentiment: Sentiment
  }[]
}

export type AppView = "login" | "dashboard"

export type DateRangePreset = "7d" | "30d" | "90d" | "custom"

export interface DateFilterOptions {
  preset: DateRangePreset
  from?: string | null
  to?: string | null
}

export type DashboardTab =
  | "home"
  | "sentiment"
  | "products"
  | "recommendations"
  | "modelMonitor"
  | "history"
  | "settings"

export interface AnalysisHistoryItem {
  runId: string
  mode: "DEMO" | "LIVE"
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELED"
  createdAt: string
  finishedAt: string | null
  totalComments: number
  productCount: number
  avgSentimentScore: number
  sourceCount: number
  topProducts: {
    name: string
    mentionCount: number
    positivePercent: number
    negativePercent: number
  }[]
}

export interface ModelEvaluationRecord {
  id: string
  modelName: string
  modelVersion: string | null
  datasetName: string | null
  sampleSize: number
  accuracy: number | null
  precisionMacro: number | null
  recallMacro: number | null
  f1Macro: number | null
  evaluatedAt: string
}

export interface SentimentProxyMetrics {
  totalPredictions: number
  avgPositiveScore: number | null
  avgConfidence: number | null
  labelDistribution: {
    positive: number
    neutral: number
    negative: number
  }
}

export interface ModelMonitorLatestResponse {
  latestEvaluation: ModelEvaluationRecord | null
  proxy: SentimentProxyMetrics
}

export interface ModelMonitorHistoryResponse {
  evaluations: ModelEvaluationRecord[]
  proxyTrend: Array<{
    runId: string
    createdAt: string
    avgConfidence: number | null
    avgPositiveScore: number | null
    totalComments: number
  }>
}
