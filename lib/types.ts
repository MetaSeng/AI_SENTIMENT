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
export type DashboardTab = "home" | "sentiment" | "products" | "recommendations" | "settings"
