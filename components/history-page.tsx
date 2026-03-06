"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Database, Eye, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAnalysisHistory, loadAnalysisRun } from "@/lib/api"
import { useApp } from "@/components/app-provider"
import type { AnalysisHistoryItem } from "@/lib/types"

function modeClass(mode: AnalysisHistoryItem["mode"]) {
  return mode === "LIVE"
    ? "border-primary/30 bg-primary/5 text-primary"
    : "border-muted bg-muted text-muted-foreground"
}

function statusClass(status: AnalysisHistoryItem["status"]) {
  if (status === "COMPLETED") return "border-success/20 bg-success/10 text-success"
  if (status === "FAILED") return "border-destructive/20 bg-destructive/10 text-destructive"
  if (status === "RUNNING") return "border-warning/20 bg-warning/10 text-warning-foreground"
  return "border-border bg-muted text-muted-foreground"
}

function formatDateTime(value: string | null): string {
  if (!value) return "-"
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

export function HistoryPage() {
  const {
    setActiveTab,
    setIsAnalysisComplete,
    setAnalysisSummary,
    dateRangePreset,
    customDateFrom,
    customDateTo,
  } = useApp()
  const [runs, setRuns] = useState<AnalysisHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openingRunId, setOpeningRunId] = useState<string | null>(null)

  async function loadHistory() {
    setLoading(true)
    const data = await getAnalysisHistory()
    setRuns(data)
    setLoading(false)
  }

  useEffect(() => {
    loadHistory()
  }, [])

  async function openRun(run: AnalysisHistoryItem) {
    setOpeningRunId(run.runId)
    const ok = await loadAnalysisRun(run.runId, {
      preset: dateRangePreset,
      from: customDateFrom,
      to: customDateTo,
    })
    setOpeningRunId(null)
    if (!ok) return
    setIsAnalysisComplete(true)
    setAnalysisSummary({
      commentCount: run.totalComments,
      productCount: run.productCount,
    })
    setActiveTab("sentiment")
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Analysis History</h2>
          <p className="text-sm text-muted-foreground">
            Browse previous runs and open any completed result in the dashboard.
          </p>
        </div>
        <Button variant="outline" onClick={loadHistory} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-primary" />
            Past Runs
          </CardTitle>
          <CardDescription>
            {runs.length} run{runs.length === 1 ? "" : "s"} stored in PostgreSQL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Top Products</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.runId}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <span>{formatDateTime(run.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={modeClass(run.mode)}>
                        {run.mode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClass(run.status)}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{run.totalComments.toLocaleString()}</TableCell>
                    <TableCell>{run.productCount}</TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">
                      {run.topProducts.length > 0
                        ? run.topProducts.map((p) => p.name).join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={run.status !== "COMPLETED" || openingRunId === run.runId}
                        onClick={() => openRun(run)}
                      >
                        <Eye className="h-4 w-4" />
                        {openingRunId === run.runId ? "Opening..." : "Open"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {runs.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No analysis runs found yet. Run demo/live analysis first.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
