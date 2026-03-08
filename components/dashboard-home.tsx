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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/components/app-provider";
import {
  startRealAnalysis,
  startDemoAnalysis,
  isBrightDataConfigured,
  type AnalysisSource,
} from "@/lib/api";

interface ProductRow {
  id: string;
  name: string;
}

interface PostRow {
  id: string;
  postUrl: string;
  productId: string;
}

function createEmptyProductRow(id: number): ProductRow {
  return { id: `product-${id}`, name: "" };
}

function createEmptyPostRow(id: number): PostRow {
  return { id: `post-${id}`, postUrl: "", productId: "" };
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
  const [products, setProducts] = useState<ProductRow[]>([createEmptyProductRow(1)]);
  const [posts, setPosts] = useState<PostRow[]>([createEmptyPostRow(1)]);
  const [productCounter, setProductCounter] = useState(2);
  const [postCounter, setPostCounter] = useState(2);

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

  const validProducts = useMemo(
    () =>
      products
        .map((p) => ({ id: p.id, name: p.name.trim() }))
        .filter((p) => p.name.length > 0),
    [products],
  );

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of validProducts) map.set(p.id, p.name);
    return map;
  }, [validProducts]);

  const mappedSources = useMemo(() => {
    return posts
      .map((p) => {
        const url = p.postUrl.trim();
        const productName = productNameById.get(p.productId) ?? "";
        return { url, productName };
      })
      .filter((p) => p.url.length > 0 && p.productName.length > 0);
  }, [posts, productNameById]);

  const canRunLive = useMemo(
    () => brightDataOk !== false && validProducts.length > 0 && mappedSources.length > 0,
    [brightDataOk, validProducts.length, mappedSources.length],
  );

  const updateProductRow = (id: string, patch: Partial<ProductRow>) => {
    setProducts((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const updatePostRow = (id: string, patch: Partial<PostRow>) => {
    setPosts((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addProductRow = () => {
    setProducts((prev) => [...prev, createEmptyProductRow(productCounter)]);
    setProductCounter((n) => n + 1);
  };

  const removeProductRow = (id: string) => {
    setProducts((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [createEmptyProductRow(productCounter)];
    });
    setProductCounter((n) => n + 1);
    setPosts((prev) =>
      prev.map((post) => (post.productId === id ? { ...post, productId: "" } : post)),
    );
  };

  const addPostRow = () => {
    setPosts((prev) => [...prev, createEmptyPostRow(postCounter)]);
    setPostCounter((n) => n + 1);
  };

  const removePostRow = (id: string) => {
    setPosts((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [createEmptyPostRow(postCounter)];
    });
    setPostCounter((n) => n + 1);
  };

  const validateLiveRows = (): string | null => {
    if (validProducts.length === 0) {
      return "Add at least one product name.";
    }

    const names = new Set<string>();
    for (const p of validProducts) {
      const key = p.name.toLowerCase();
      if (names.has(key)) {
        return "Duplicate product name detected. Use unique product names.";
      }
      names.add(key);
    }

    for (let i = 0; i < posts.length; i++) {
      const row = posts[i];
      const postUrl = row.postUrl.trim();
      const hasEither = row.productId.length > 0 || postUrl.length > 0;
      const hasBoth = row.productId.length > 0 && postUrl.length > 0;

      if (hasEither && !hasBoth) {
        return `Post ${i + 1}: select a product and add a post link.`;
      }

      if (hasBoth) {
        const selectedProduct = productNameById.get(row.productId);
        if (!selectedProduct) {
          return `Post ${i + 1}: selected product is missing.`;
        }
        let parsed: URL;
        try {
          parsed = new URL(postUrl);
        } catch {
          return `Post ${i + 1}: invalid URL format.`;
        }
        if (!/(^|\.)facebook\.com$/i.test(parsed.hostname)) {
          return `Post ${i + 1}: please use a Facebook URL.`;
        }
      }
    }

    if (mappedSources.length === 0) {
      return "Add at least one post link and associate it to a product.";
    }

    const sourcePairs = new Set<string>();
    for (const source of mappedSources) {
      const pair = `${source.productName.toLowerCase()}|${source.url.toLowerCase()}`;
      if (sourcePairs.has(pair)) {
        return "Duplicate product + link pair detected.";
      }
      sourcePairs.add(pair);
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

        const sources: AnalysisSource[] = mappedSources.map((s) => ({
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
              : "Add products first, then map each Facebook post link to the correct product."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {!demoMode && (
            <div className="flex flex-col gap-6">
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4 md:p-5">
                <Label className="text-sm font-semibold tracking-wide text-foreground">Product Input</Label>
                {products.map((row, idx) => (
                  <div key={row.id} className="rounded-lg border border-border/70 bg-background p-3 md:p-4">
                    <p className="mb-2 text-sm font-medium text-foreground">Product {idx + 1}</p>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                      <Input
                        placeholder="Product name"
                        value={row.name}
                        onChange={(e) => updateProductRow(row.id, { name: e.target.value })}
                        disabled={isAnalyzing || brightDataOk === false}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProductRow(row.id)}
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
                    onClick={addProductRow}
                    disabled={isAnalyzing || brightDataOk === false}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add More Products
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4 md:p-5">
                <Label className="text-sm font-semibold tracking-wide text-foreground">Post Link Input</Label>
                {posts.map((row, idx) => (
                  <div key={row.id} className="rounded-lg border border-border/70 bg-background p-3 md:p-4">
                    <p className="mb-2 text-sm font-medium text-foreground">Post {idx + 1}</p>
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_240px_auto] md:items-center">
                      <Input
                        placeholder="https://www.facebook.com/{page}/posts/{id}"
                        value={row.postUrl}
                        onChange={(e) => updatePostRow(row.id, { postUrl: e.target.value })}
                        disabled={isAnalyzing || brightDataOk === false}
                      />
                      <Select
                        value={row.productId}
                        onValueChange={(value) => updatePostRow(row.id, { productId: value })}
                        disabled={isAnalyzing || brightDataOk === false || validProducts.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Product" />
                        </SelectTrigger>
                        <SelectContent>
                          {validProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePostRow(row.id)}
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
                    onClick={addPostRow}
                    disabled={isAnalyzing || brightDataOk === false}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add More Post Links
                  </Button>
                </div>
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
