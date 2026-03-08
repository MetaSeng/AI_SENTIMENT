"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Package,
  DollarSign,
  Star,
  RefreshCw,
  Megaphone,
  Eye,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecommendations } from "@/lib/api";
import { useApp } from "@/components/app-provider";
import type { Recommendation, Sentiment } from "@/lib/types";

const SENTIMENT_COLORS = {
  positive: "oklch(0.65 0.2 155)",
  neutral: "oklch(0.55 0.01 250)",
  negative: "oklch(0.6 0.2 30)",
};

const INSIGHT_ICONS: Record<string, typeof Package> = {
  package: Package,
  "dollar-sign": DollarSign,
  star: Star,
  "refresh-cw": RefreshCw,
};

const INSIGHT_STYLES: Record<
  string,
  { bg: string; iconColor: string; border: string }
> = {
  success: {
    bg: "bg-success/5",
    iconColor: "text-success",
    border: "border-success/20",
  },
  warning: {
    bg: "bg-warning/5",
    iconColor: "text-warning-foreground",
    border: "border-warning/20",
  },
  danger: {
    bg: "bg-destructive/5",
    iconColor: "text-destructive",
    border: "border-destructive/20",
  },
  info: {
    bg: "bg-primary/5",
    iconColor: "text-primary",
    border: "border-primary/20",
  },
};

function TrendingTag({
  word,
  count,
  sentiment,
}: {
  word: string;
  count: number;
  sentiment: Sentiment;
}) {
  // Scale font size based on count relative to max
  const minSize = 0.75;
  const maxSize = 1.5;
  const maxCount = 45;
  const scale = minSize + (count / maxCount) * (maxSize - minSize);

  return (
    <span
      className="inline-flex cursor-default items-center rounded-md px-2.5 py-1 font-medium transition-transform hover:scale-105"
      style={{
        fontSize: `${scale}rem`,
        color: SENTIMENT_COLORS[sentiment],
        backgroundColor: `color-mix(in oklch, ${SENTIMENT_COLORS[sentiment]} 10%, transparent)`,
      }}
    >
      {word}
      <span className="ml-1 text-xs opacity-60">({count})</span>
    </span>
  );
}

export function Recommendations() {
  const { demoMode, dateRangePreset, customDateFrom, customDateTo } = useApp();
  const [data, setData] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const recs = await getRecommendations(demoMode, {
          preset: dateRangePreset,
          from: customDateFrom,
          to: customDateTo,
        });
        setData(recs);
      } catch (error) {
        console.error("Failed to load recommendations:", error);
        setLoadError("Could not load recommendations. Please try again.");
        setData({
          topProducts: [],
          needsImprovement: [],
          insights: [],
          trendingTopics: [],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [demoMode, dateRangePreset, customDateFrom, customDateTo]);

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Recommendations
        </h2>
        <p className="text-sm text-muted-foreground">
          Actionable insights to grow your business based on customer feedback.
        </p>
      </div>

      {/* Top Satisfying Products */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-success/10">
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Top Performing Products
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.topProducts.map((product) => (
            <Card key={product.name} className="border-success/20 bg-success/2">
              <CardContent className="flex flex-col gap-3 pt-6">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-foreground">
                    {product.name}
                  </h4>
                  <Badge
                    className="bg-success/10 text-success hover:bg-success/20 border-success/20"
                    variant="outline"
                  >
                    {product.positivePercent}% positive
                  </Badge>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {product.praisePoints.map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Button size="sm" className="mt-1 w-full gap-2">
                  <Megaphone className="h-3.5 w-3.5" />
                  Promote This Product
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Needs Improvement */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Needs Improvement
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.needsImprovement.map((product) => (
            <Card
              key={product.name}
              className="border-destructive/20 bg-destructive/2"
            >
              <CardContent className="flex flex-col gap-3 pt-6">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-foreground">
                    {product.name}
                  </h4>
                  <Badge
                    className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
                    variant="outline"
                  >
                    {product.negativePercent}% negative
                  </Badge>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {product.complaints.map((complaint) => (
                    <li
                      key={complaint}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                      {complaint}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 w-full gap-2"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Feedback Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actionable Insights */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <Star className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Actionable Insights
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.insights.map((insight) => {
            const Icon = INSIGHT_ICONS[insight.icon] || Package;
            const style = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.info;
            return (
              <Card key={insight.id} className={`${style.bg} ${style.border}`}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${style.iconColor}`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="font-semibold text-foreground">
                      {insight.title}
                    </h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {insight.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Trending Topics */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Trending Topics</CardTitle>
          <CardDescription>
            Most frequently mentioned words, color-coded by sentiment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {data.trendingTopics
              .sort((a, b) => b.count - a.count)
              .map((topic) => (
                <TrendingTag
                  key={topic.word}
                  word={topic.word}
                  count={topic.count}
                  sentiment={topic.sentiment}
                />
              ))}
          </div>
          <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: SENTIMENT_COLORS.positive }}
              />
              Positive
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: SENTIMENT_COLORS.neutral }}
              />
              Neutral
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: SENTIMENT_COLORS.negative }}
              />
              Negative
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
