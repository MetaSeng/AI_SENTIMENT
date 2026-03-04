"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle2, Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/components/app-provider";
import {
  startRealAnalysis,
  startDemoAnalysis,
  isBrightDataConfigured,
  type AnalysisSource,
} from "@/lib/api";

interface ProductRow {
  id: string;
  productName: string;
  postUrl: string;
}

function createEmptyRow(id: number): ProductRow {
  return { id: `row-${id}`, productName: "", postUrl: "" };
}

export function DashboardHome() {
  const {
    setActiveTab,
    setIsAnalysisComplete,
    demoMode,
    setDemoMode,
    setAnalysisSummary,
    analysisSummary,
  } = useApp();

  const [brightDataOk, setBrightDataOk] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ProductRow[]>([createEmptyRow(1)]);
  const [rowCounter, setRowCounter] = useState(2);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisComplete, setAnalysisCompleteLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      const ok = await isBrightDataConfigured();
      setBrightDataOk(ok);
    }
    verify();
  }, []);

  useEffect(() => {
    if (!demoMode && brightDataOk === false) {
      setError(
        "Bright Data API key not configured. Please add BRIGHTDATA_API_KEY to your environment.",
      );
      setDemoMode(true);
    }
  }, [demoMode, brightDataOk, setDemoMode]);

  const filledSources = useMemo(() => {
    return rows
      .map((r) => ({ productName: r.productName.trim(), url: r.postUrl.trim() }))
      .filter((r) => r.productName.length > 0 && r.url.length > 0);
  }, [rows]);

  const canRunLive = useMemo(
    () => brightDataOk !== false && filledSources.length > 0,
    [brightDataOk, filledSources.length],
  );

  const updateRow = (id: string, patch: Partial<ProductRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow(rowCounter)]);
    setRowCounter((n) => n + 1);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [createEmptyRow(rowCounter)];
    });
    setRowCounter((n) => n + 1);
  };

  const validateLiveRows = (): string | null => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const productName = row.productName.trim();
      const postUrl = row.postUrl.trim();
      const hasEither = productName.length > 0 || postUrl.length > 0;
      const hasBoth = productName.length > 0 && postUrl.length > 0;

      if (hasEither && !hasBoth) {
        return `Row ${i + 1}: please fill both product name and post link.`;
      }

      if (hasBoth) {
        let parsed: URL;
        try {
          parsed = new URL(postUrl);
        } catch {
          return `Row ${i + 1}: invalid URL format.`;
        }
        if (!/(^|\.)facebook\.com$/i.test(parsed.hostname)) {
          return `Row ${i + 1}: please use a Facebook URL.`;
        }
      }
    }

    const names = new Set<string>();
    const sourcePairs = new Set<string>();
    for (const source of filledSources) {
      names.add(source.productName.toLowerCase());
      const pair = `${source.productName.toLowerCase()}|${source.url.toLowerCase()}`;
      if (sourcePairs.has(pair)) {
        return "Duplicate product + link pair detected.";
      }
      sourcePairs.add(pair);
    }

    if (filledSources.length === 0) {
      return "Add at least one product with a post link.";
    }

    if (names.size !== filledSources.length) {
      return "Use one row per product. Remove duplicate product names.";
    }

    return null;
  };

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisCompleteLocal(false);
    setError(null);

    try {
      const onProgress = (stage: string, percent: number) => {
        setAnalysisStage(stage);
        setAnalysisProgress(percent);
      };

      let result: {
        success: boolean;
        commentCount: number;
        productCount: number;
      };

      if (demoMode) {
        result = await startDemoAnalysis(onProgress);
      } else {
        if (!brightDataOk) {
          setError("Bright Data API key not configured. Cannot run live analysis.");
          setIsAnalyzing(false);
          return;
        }

        const validationError = validateLiveRows();
        if (validationError) {
          setError(validationError);
          setIsAnalyzing(false);
          return;
        }

        const sources: AnalysisSource[] = filledSources.map((s) => ({
          productName: s.productName,
          url: s.url,
        }));
        result = await startRealAnalysis(sources, onProgress);
      }

      setIsAnalyzing(false);
      setAnalysisCompleteLocal(true);
      setIsAnalysisComplete(true);
      setAnalysisSummary({
        commentCount: result.commentCount,
        productCount: result.productCount,
      });
    } catch (err) {
      setIsAnalyzing(false);
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    }
  };

  const handleViewResults = () => {
    setActiveTab("sentiment");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Analyze Facebook comments and get actionable insights.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-primary" />
            Analyze Facebook Posts
          </CardTitle>
          <CardDescription>
            {demoMode
              ? "Demo mode uses sample Khmer/Khmerlish data. Toggle off to run live scraping."
              : "Fill each row with a product name and its Facebook post link. Click Add New for more products."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {!demoMode && (
            <div className="flex flex-col gap-3">
              <Label>Products and Post Links</Label>
              {rows.map((row, idx) => (
                <div key={row.id} className="rounded-lg border border-border/60 p-3">
                  <p className="mb-2 text-sm font-medium text-foreground">Product {idx + 1}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      placeholder="Product name"
                      value={row.productName}
                      onChange={(e) => updateRow(row.id, { productName: e.target.value })}
                      disabled={isAnalyzing || brightDataOk === false}
                    />
                    <Input
                      placeholder="https://www.facebook.com/{page}/posts/{id}"
                      value={row.postUrl}
                      onChange={(e) => updateRow(row.id, { postUrl: e.target.value })}
                      disabled={isAnalyzing || brightDataOk === false}
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.id)}
                      disabled={isAnalyzing}
                      className="gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRow}
                  disabled={isAnalyzing || brightDataOk === false}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add New
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="demo-mode"
                checked={demoMode}
                onCheckedChange={setDemoMode}
                disabled={isAnalyzing}
              />
              <Label htmlFor="demo-mode" className="text-sm text-muted-foreground">
                Demo Mode (use sample data)
              </Label>
            </div>
            <Button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || (!demoMode && !canRunLive)}
              className="gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isAnalyzing ? "Analyzing..." : demoMode ? "Run Demo Analysis" : "Start Live Analysis"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {(isAnalyzing || analysisComplete) && (
        <Card className="border-border/60">
          <CardContent className="pt-6">
            {isAnalyzing ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium text-foreground">{analysisStage}</span>
                </div>
                <Progress value={analysisProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {demoMode
                    ? "Processing demo comments and generating insights..."
                    : "Scraping real Facebook post data via Bright Data. This may take a few minutes..."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">Analysis Complete!</h3>
                  <p className="text-sm text-muted-foreground">
                    We analyzed {analysisSummary?.commentCount.toLocaleString() ?? 0} comments across{" "}
                    {analysisSummary?.productCount ?? 0} products.
                  </p>
                </div>
                <Button onClick={handleViewResults} className="gap-2">
                  View Results
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
