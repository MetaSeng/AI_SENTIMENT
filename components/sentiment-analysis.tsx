"use client"

import { useEffect, useState } from "react"
import {
  MessageSquare,
  Package,
  Lightbulb,
  TrendingUp,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardOverview, getComments } from "@/lib/api"
import { useApp } from "@/components/app-provider"
import type { Comment, DashboardOverview, Sentiment } from "@/lib/types"

const SENTIMENT_COLORS = {
  positive: "oklch(0.65 0.2 155)",
  neutral: "oklch(0.55 0.01 250)",
  negative: "oklch(0.6 0.2 30)",
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string
  subtitle: string
  icon: typeof MessageSquare
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-start justify-between pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className="text-2xl font-bold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  )
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const variants: Record<Sentiment, { label: string; className: string }> = {
    positive: {
      label: "Positive",
      className: "bg-success/10 text-success hover:bg-success/20 border-success/20",
    },
    neutral: {
      label: "Neutral",
      className: "bg-muted text-muted-foreground hover:bg-muted border-border",
    },
    negative: {
      label: "Negative",
      className: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20",
    },
  }
  const v = variants[sentiment]
  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  )
}

export function SentimentAnalysis() {
  const { demoMode, dateRangePreset, customDateFrom, customDateTo } = useApp()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [filter, setFilter] = useState<Sentiment | "all">("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [ov, cm] = await Promise.all([
        getDashboardOverview(demoMode, {
          preset: dateRangePreset,
          from: customDateFrom,
          to: customDateTo,
        }),
        getComments(filter, demoMode, {
          preset: dateRangePreset,
          from: customDateFrom,
          to: customDateTo,
        }),
      ])
      setOverview(ov)
      setComments(cm)
      setLoading(false)
    }
    load()
  }, [filter, demoMode, dateRangePreset, customDateFrom, customDateTo])

  if (loading || !overview) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Sentiment Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Comprehensive analysis of customer feedback and sentiment trends.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Comments"
          value={overview.totalComments.toLocaleString()}
          subtitle="Analyzed this period"
          icon={MessageSquare}
        />
        <KpiCard
          title="Avg Sentiment Score"
          value={`${overview.avgSentimentScore}% Positive`}
          subtitle="Overall positive rate"
          icon={TrendingUp}
        />
        <KpiCard
          title="Engaged Products"
          value={`${overview.engagedProducts} Products`}
          subtitle="Mentioned in comments"
          icon={Package}
        />
        <KpiCard
          title="Recommendation Ready"
          value={`${overview.recommendationCount} Insights`}
          subtitle="Actionable items"
          icon={Lightbulb}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sentiment Over Time */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sentiment Over Time</CardTitle>
            <CardDescription>Comment sentiment trends this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview.sentimentOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="positive"
                    stroke={SENTIMENT_COLORS.positive}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Positive"
                  />
                  <Line
                    type="monotone"
                    dataKey="neutral"
                    stroke={SENTIMENT_COLORS.neutral}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Neutral"
                  />
                  <Line
                    type="monotone"
                    dataKey="negative"
                    stroke={SENTIMENT_COLORS.negative}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Negative"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS.positive }} />
                <span className="text-muted-foreground">Positive</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS.neutral }} />
                <span className="text-muted-foreground">Neutral</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS.negative }} />
                <span className="text-muted-foreground">Negative</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Distribution */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sentiment Distribution</CardTitle>
            <CardDescription>Breakdown of all comment sentiments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview.sentimentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {overview.sentimentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 text-xs">
              {overview.sentimentDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-muted-foreground">
                    {item.name} ({item.value}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comments Table */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent Comments</CardTitle>
            <CardDescription>Latest customer feedback from Facebook</CardDescription>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as Sentiment | "all")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiments</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comment</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell className="max-w-xs truncate font-medium">{comment.text}</TableCell>
                    <TableCell className="text-muted-foreground">{comment.productMentioned}</TableCell>
                    <TableCell>
                      <SentimentBadge sentiment={comment.sentiment} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{comment.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
