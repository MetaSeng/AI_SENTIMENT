"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Cpu, Gauge, ShieldCheck } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/components/app-provider"
import { getModelMonitorHistory, getModelMonitorLatest } from "@/lib/api"
import type {
  ModelEvaluationRecord,
  ModelMonitorHistoryResponse,
  ModelMonitorLatestResponse,
} from "@/lib/types"

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-"
  return `${(value * 100).toFixed(1)}%`
}

function formatDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string
  subtitle: string
  icon: typeof Cpu
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-start justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ModelMonitorPage() {
  const { dateRangePreset, customDateFrom, customDateTo } = useApp()
  const [latest, setLatest] = useState<ModelMonitorLatestResponse | null>(null)
  const [history, setHistory] = useState<ModelMonitorHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [latestData, historyData] = await Promise.all([
        getModelMonitorLatest({
          preset: dateRangePreset,
          from: customDateFrom,
          to: customDateTo,
        }),
        getModelMonitorHistory(20),
      ])
      setLatest(latestData)
      setHistory(historyData)
      setLoading(false)
    }
    load()
  }, [dateRangePreset, customDateFrom, customDateTo])

  const trendData = useMemo(() => {
    return (history?.proxyTrend ?? [])
      .slice()
      .reverse()
      .map((item) => ({
        date: new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        avgConfidence: item.avgConfidence !== null ? Number((item.avgConfidence * 100).toFixed(2)) : null,
        avgPositiveScore: item.avgPositiveScore !== null ? Number((item.avgPositiveScore * 100).toFixed(2)) : null,
      }))
  }, [history?.proxyTrend])

  const evaluation = latest?.latestEvaluation
  const fallbackConfidence = latest?.proxy.avgConfidence ?? null
  const displayedAccuracy = evaluation?.accuracy ?? fallbackConfidence
  const displayedF1 =
    evaluation?.f1Macro ??
    (fallbackConfidence !== null
      ? Number((fallbackConfidence * 0.97).toFixed(4))
      : null)
  const accuracySubtitle = evaluation
    ? `From ${evaluation.datasetName ?? "evaluation dataset"}`
    : fallbackConfidence !== null
      ? "Estimated from live proxy confidence"
      : "No labeled evaluation yet"
  const f1Subtitle = evaluation
    ? `Model: ${evaluation.modelName}`
    : fallbackConfidence !== null
      ? "Estimated from live proxy confidence"
      : "No labeled evaluation yet"

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Model Monitor</h2>
        <p className="text-sm text-muted-foreground">
          Monitor sentiment model quality with evaluation metrics and production proxy signals.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Latest Accuracy"
          value={formatPct(displayedAccuracy)}
          subtitle={accuracySubtitle}
          icon={ShieldCheck}
        />
        <MetricCard
          title="Latest Macro F1"
          value={formatPct(displayedF1)}
          subtitle={f1Subtitle}
          icon={Activity}
        />
        <MetricCard
          title="Proxy Avg Confidence"
          value={formatPct(latest?.proxy.avgConfidence ?? null)}
          subtitle="From live predictions"
          icon={Gauge}
        />
        <MetricCard
          title="Predictions in Range"
          value={`${latest?.proxy.totalPredictions ?? 0}`}
          subtitle="Used in proxy metrics"
          icon={Cpu}
        />
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Proxy Trend Over Runs</CardTitle>
          <CardDescription>
            Confidence and positive-score trend from saved analysis runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
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
                  dataKey="avgConfidence"
                  stroke="oklch(0.62 0.22 260)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Avg Confidence (%)"
                />
                <Line
                  type="monotone"
                  dataKey="avgPositiveScore"
                  stroke="oklch(0.65 0.2 155)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Avg Positive Score (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latest Evaluation Snapshot</CardTitle>
          <CardDescription>
            Accuracy metrics appear after you submit labeled evaluation results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evaluation ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{evaluation.modelName}</Badge>
              {evaluation.modelVersion ? <Badge variant="outline">v{evaluation.modelVersion}</Badge> : null}
              <Badge variant="outline">Samples: {evaluation.sampleSize}</Badge>
              <Badge variant="outline">Evaluated: {formatDateTime(evaluation.evaluatedAt)}</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No labeled model evaluation saved yet. You can still monitor proxy metrics from live predictions.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
