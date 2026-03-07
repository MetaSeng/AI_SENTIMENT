/**
 * Service layer for SocialSight.
 * Calls real Bright Data scraper API routes when not in demo mode.
 * Falls back to mock data in demo mode.
 */

import {
  mockComments,
  mockProducts,
  mockDashboardOverview,
  mockRecommendations,
} from "./mock-data";
import {
  transformComments,
  buildProducts,
  buildOverview,
  buildRecommendations,
  type BrightDataComment,
} from "./transform";
import type {
  Comment,
  Product,
  DashboardOverview,
  Recommendation,
  Sentiment,
  AnalysisHistoryItem,
  DateFilterOptions,
} from "./types";

// ─── In-memory store for the latest analysis results ────────────────
let analysisResults: {
  comments: Comment[];
  products: Product[];
  overview: DashboardOverview;
  recommendations: Recommendation;
} | null = null;
let activeRunId: string | null = null;
let analysisCacheKey: string | null = null;

export function getAnalysisResults() {
  return analysisResults;
}

export function clearAnalysisResults() {
  analysisResults = null;
  activeRunId = null;
  analysisCacheKey = null;
}

// ─── Demo / mock data helpers ───────────────────────────────────────
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ask the server whether the Bright Data API key is configured.
 * Used by the UI to display connection status before running an analysis.
 */
export async function isBrightDataConfigured(): Promise<boolean> {
  try {
    const res = await fetch("/api/config/brightdata");
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.configured);
  } catch {
    return false;
  }
}

// ─── Public API methods ─────────────────────────────────────────────

/** Fetch the dashboard overview KPIs and chart data */
export async function getDashboardOverview(
  demo = true,
  filter?: DateFilterOptions,
): Promise<DashboardOverview> {
  if (!demo) await ensureAnalysisLoaded(filter);
  if (!demo && analysisResults) return analysisResults.overview;
  await delay(400);
  return mockDashboardOverview;
}

/** Fetch paginated comments, optionally filtered by sentiment */
export async function getComments(
  filter?: Sentiment | "all",
  demo = true,
  dateFilter?: DateFilterOptions,
): Promise<Comment[]> {
  if (!demo) await ensureAnalysisLoaded(dateFilter);
  const source =
    !demo && analysisResults ? analysisResults.comments : mockComments;
  await delay(300);
  if (!filter || filter === "all") return source;
  return source.filter((c) => c.sentiment === filter);
}

/** Fetch all products */
export async function getProducts(
  demo = true,
  filter?: DateFilterOptions,
): Promise<Product[]> {
  if (!demo) await ensureAnalysisLoaded(filter);
  if (!demo && analysisResults) return analysisResults.products;
  await delay(350);
  return mockProducts;
}

/** Fetch a single product by ID */
export async function getProductById(
  id: string,
  demo = true,
  filter?: DateFilterOptions,
): Promise<Product | undefined> {
  if (!demo) await ensureAnalysisLoaded(filter);
  const source =
    !demo && analysisResults ? analysisResults.products : mockProducts;
  await delay(200);
  return source.find((p) => p.id === id);
}

/** Fetch recommendations and actionable insights */
export async function getRecommendations(
  demo = true,
  filter?: DateFilterOptions,
): Promise<Recommendation> {
  if (!demo) await ensureAnalysisLoaded(filter);
  if (!demo && analysisResults) return analysisResults.recommendations;
  await delay(400);
  return mockRecommendations;
}

// ─── Real Bright Data scraping flow ─────────────────────────────────

interface ProgressCallback {
  (stage: string, percent: number): void;
}

export interface AnalysisSource {
  url: string;
  productName: string;
}

interface SentimentApiResult {
  label?: unknown;
  sentiment?: unknown;
  prediction?: unknown;
  class?: unknown;
  polarity?: unknown;
  confidence?: unknown;
  scores?: Record<string, unknown>;
  language_tag?: unknown;
  languageTag?: unknown;
}

interface SentimentApiResponse {
  results?: unknown;
  predictions?: unknown;
  data?: {
    results?: unknown;
    predictions?: unknown;
  };
}

interface ClusteringApiResult {
  cluster_id?: number;
}

interface ClusteringApiResponse {
  results?: ClusteringApiResult[];
}

function buildFilterQuery(filter?: DateFilterOptions): string {
  if (!filter) return "";
  const qs = new URLSearchParams();
  qs.set("range", filter.preset);
  if (filter.from) qs.set("from", filter.from);
  if (filter.to) qs.set("to", filter.to);
  return `?${qs.toString()}`;
}

function makeCacheKey(runId: string | null, filter?: DateFilterOptions): string {
  return JSON.stringify({
    runId: runId ?? "latest",
    preset: filter?.preset ?? "30d",
    from: filter?.from ?? null,
    to: filter?.to ?? null,
  });
}

async function fetchLatestPersistedAnalysis(filter?: DateFilterOptions): Promise<{
  comments: Comment[];
  products: Product[];
  overview: DashboardOverview;
  recommendations: Recommendation;
} | null> {
  try {
    const res = await fetch(`/api/analysis/latest${buildFilterQuery(filter)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.comments || !data?.products || !data?.overview || !data?.recommendations) {
      return null;
    }
    return {
      comments: data.comments as Comment[],
      products: data.products as Product[],
      overview: data.overview as DashboardOverview,
      recommendations: data.recommendations as Recommendation,
    };
  } catch {
    return null;
  }
}

async function fetchPersistedAnalysisByRunId(
  runId: string,
  filter?: DateFilterOptions,
): Promise<{
  comments: Comment[];
  products: Product[];
  overview: DashboardOverview;
  recommendations: Recommendation;
} | null> {
  try {
    const res = await fetch(`/api/analysis/${runId}${buildFilterQuery(filter)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.comments || !data?.products || !data?.overview || !data?.recommendations) {
      return null;
    }
    return {
      comments: data.comments as Comment[],
      products: data.products as Product[],
      overview: data.overview as DashboardOverview,
      recommendations: data.recommendations as Recommendation,
    };
  } catch {
    return null;
  }
}

export async function getAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
  try {
    const res = await fetch("/api/analysis/history", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.runs) ? (data.runs as AnalysisHistoryItem[]) : [];
  } catch {
    return [];
  }
}

async function ensureAnalysisLoaded(filter?: DateFilterOptions): Promise<void> {
  const nextKey = makeCacheKey(activeRunId, filter);
  if (analysisResults && analysisCacheKey === nextKey) return;

  const persisted = activeRunId
    ? await fetchPersistedAnalysisByRunId(activeRunId, filter)
    : await fetchLatestPersistedAnalysis(filter);
  if (!persisted) return;

  analysisResults = persisted;
  analysisCacheKey = nextKey;
}

export async function loadAnalysisRun(
  runId: string,
  filter?: DateFilterOptions,
): Promise<boolean> {
  const persisted = await fetchPersistedAnalysisByRunId(runId, filter);
  if (!persisted) return false;
  activeRunId = runId;
  analysisResults = persisted;
  analysisCacheKey = makeCacheKey(activeRunId, filter);
  return true;
}

type BrightDataErrorRow = BrightDataComment & {
  error?: string;
  error_code?: string | number;
};

async function triggerSnapshot(url: string): Promise<string> {
  const triggerRes = await fetch("/api/scrape/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!triggerRes.ok) {
    const err = await triggerRes.json().catch(() => ({}));
    const message = err.error || "Failed to trigger scraping";
    if (message.includes("BRIGHTDATA_API_KEY")) {
      throw new Error(
        "Bright Data API key not configured on the server. Please set BRIGHTDATA_API_KEY.",
      );
    }
    throw new Error(message);
  }

  const { snapshot_id } = await triggerRes.json();
  if (!snapshot_id) throw new Error("No snapshot_id received from scraper");
  return snapshot_id;
}

async function waitUntilReady(
  snapshotId: string,
  onProgress: ProgressCallback,
  stageLabel: string,
  progressStart: number,
  progressEnd: number,
): Promise<void> {
  let status = "running";
  let pollCount = 0;
  const maxPolls = 120; // max 10 minutes (5s intervals)

  while (status !== "ready" && status !== "failed" && pollCount < maxPolls) {
    await delay(5000);
    pollCount++;

    const progressPercent =
      progressStart + ((progressEnd - progressStart) * pollCount) / maxPolls;
    onProgress(stageLabel, Math.round(progressPercent));

    try {
      const progressRes = await fetch(`/api/scrape/progress/${snapshotId}`);
      if (!progressRes.ok) continue;

      const progressData = await progressRes.json();
      status = progressData.status || "running";

      if (status === "ready") break;
      if (status === "failed") {
        throw new Error(
          "Scraping failed: " + (progressData.error || "Unknown error"),
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Scraping failed")) {
        throw e;
      }
    }
  }

  if (pollCount >= maxPolls) {
    throw new Error("Scraping timed out after 10 minutes");
  }
}

async function fetchSnapshotRows(snapshotId: string): Promise<BrightDataComment[]> {
  const resultsRes = await fetch(`/api/scrape/results/${snapshotId}`);
  if (!resultsRes.ok) {
    throw new Error("Failed to download scraping results");
  }
  return resultsRes.json();
}

const SENTIMENT_REQUEST_BATCH_SIZE = 12;

function parseFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toAppSentiment(value: unknown): Sentiment | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 0) return "negative";
    if (value === 1) return "neutral";
    if (value === 2) return "positive";
    return null;
  }

  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "positive" || normalized === "pos") return "positive";
  if (normalized === "negative" || normalized === "neg") return "negative";
  if (normalized === "neutral" || normalized === "neu") return "neutral";

  if (normalized.includes("positive")) return "positive";
  if (normalized.includes("negative")) return "negative";
  if (normalized.includes("neutral")) return "neutral";

  if (/label[_\s-]*0|class[_\s-]*0/.test(normalized)) return "negative";
  if (/label[_\s-]*1|class[_\s-]*1/.test(normalized)) return "neutral";
  if (/label[_\s-]*2|class[_\s-]*2/.test(normalized)) return "positive";
  return null;
}

function sentimentFromScores(scores: Record<string, unknown> | undefined): Sentiment | null {
  if (!scores) return null;
  const normalized = new Map<string, number>();
  for (const [key, raw] of Object.entries(scores)) {
    const value = parseFiniteNumber(raw);
    if (value === null) continue;
    normalized.set(key.toLowerCase(), value);
  }

  const positive = normalized.get("positive");
  const negative = normalized.get("negative");
  const neutral = normalized.get("neutral");
  if (
    positive === undefined &&
    negative === undefined &&
    neutral === undefined
  ) {
    return null;
  }

  const ranked: Array<[Sentiment, number]> = [
    ["positive", positive ?? Number.NEGATIVE_INFINITY],
    ["neutral", neutral ?? Number.NEGATIVE_INFINITY],
    ["negative", negative ?? Number.NEGATIVE_INFINITY],
  ];
  ranked.sort((a, b) => b[1] - a[1]);
  const winner = ranked[0];

  return winner && Number.isFinite(winner[1]) ? winner[0] : null;
}

function extractSentimentResults(payload: SentimentApiResponse): SentimentApiResult[] {
  const candidates = [
    payload.results,
    payload.predictions,
    payload.data?.results,
    payload.data?.predictions,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as SentimentApiResult[];
    }
  }
  return [];
}

async function fetchAiSentimentBatch(texts: string[]): Promise<SentimentApiResult[]> {
  const res = await fetch("/api/sentiment/predict/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      texts,
      batch_size: Math.min(16, Math.max(1, texts.length)),
    }),
  });

  const rawBody = await res.text();
  let parsed: SentimentApiResponse | null = null;
  try {
    parsed = rawBody ? (JSON.parse(rawBody) as SentimentApiResponse) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    throw new Error(
      `Sentiment API returned ${res.status}${rawBody ? `: ${rawBody.slice(0, 300)}` : ""}`,
    );
  }

  const results = parsed ? extractSentimentResults(parsed) : [];
  if (results.length === 0) {
    throw new Error("Sentiment API returned no result array");
  }

  return results;
}

async function applyAiSentiment(comments: Comment[]): Promise<Comment[]> {
  if (comments.length === 0) return comments;

  const mapped = [...comments];

  for (let start = 0; start < comments.length; start += SENTIMENT_REQUEST_BATCH_SIZE) {
    const chunk = comments.slice(start, start + SENTIMENT_REQUEST_BATCH_SIZE);
    const texts = chunk.map((c) => c.text);
    const results = await fetchAiSentimentBatch(texts);

    for (let offset = 0; offset < chunk.length; offset++) {
      const result = results[offset];
      if (!result) continue;

      const sentiment =
        toAppSentiment(result.label) ??
        toAppSentiment(result.sentiment) ??
        toAppSentiment(result.prediction) ??
        toAppSentiment(result.class) ??
        toAppSentiment(result.polarity) ??
        sentimentFromScores(result.scores);

      if (!sentiment) continue;

      const positiveScore =
        parseFiniteNumber(result.scores?.positive) ??
        parseFiniteNumber(result.scores?.Positive) ??
        parseFiniteNumber(result.scores?.POSITIVE);

      const languageTag =
        typeof result.language_tag === "string"
          ? result.language_tag
          : typeof result.languageTag === "string"
            ? result.languageTag
            : undefined;

      const next = mapped[start + offset];
      const nextScore =
        positiveScore !== null
          ? Math.max(0, Math.min(1, positiveScore))
          : next.sentimentScore;

      mapped[start + offset] = {
        ...next,
        sentiment,
        sentimentScore: Math.round(nextScore * 100) / 100,
        languageTag,
      };
    }
  }

  return mapped;
}

async function applyAiClustering(comments: Comment[]): Promise<Comment[]> {
  if (comments.length === 0) return comments;

  const texts = comments.map((c) => c.text);
  const res = await fetch("/api/clustering/predict/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) {
    throw new Error(`Clustering API returned ${res.status}`);
  }

  const data = (await res.json()) as ClusteringApiResponse;
  if (!Array.isArray(data.results) || data.results.length !== comments.length) {
    throw new Error("Clustering API returned an invalid results payload");
  }

  return comments.map((comment, index) => {
    const clusterId = data.results?.[index]?.cluster_id;
    return {
      ...comment,
      clusterId:
        typeof clusterId === "number" && Number.isFinite(clusterId)
          ? Math.floor(clusterId)
          : undefined,
    };
  });
}

/**
 * Start a real analysis using Bright Data scraper.
 * Supports multiple post sources mapped to user-defined products.
 */
export async function startRealAnalysis(
  sources: AnalysisSource[],
  onProgress: ProgressCallback,
): Promise<{ success: boolean; commentCount: number; productCount: number }> {
  const cleanedSources = sources
    .map((s) => ({ url: s.url.trim(), productName: s.productName.trim() }))
    .filter((s) => s.url.length > 0 && s.productName.length > 0);

  if (cleanedSources.length === 0) {
    throw new Error("Please add at least one post link mapped to a product.");
  }

  const allComments: Comment[] = [];
  const sourceWeight = 70 / cleanedSources.length;

  for (let i = 0; i < cleanedSources.length; i++) {
    const source = cleanedSources[i];
    const start = 5 + i * sourceWeight;
    const triggerEnd = start + sourceWeight * 0.15;
    const pollEnd = start + sourceWeight * 0.8;
    const done = start + sourceWeight;

    const sourceLabel = `${source.productName} (${i + 1}/${cleanedSources.length})`;
    onProgress(`Triggering Facebook scraper for ${sourceLabel}...`, Math.round(start));
    const snapshotId = await triggerSnapshot(source.url);

    onProgress(`Scraping comments for ${sourceLabel}...`, Math.round(triggerEnd));
    await waitUntilReady(
      snapshotId,
      onProgress,
      `Scraping comments for ${sourceLabel}...`,
      triggerEnd,
      pollEnd,
    );

    onProgress(`Downloading results for ${sourceLabel}...`, Math.round(pollEnd));
    const rawData = await fetchSnapshotRows(snapshotId);
    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error(
        `No comments found for product "${source.productName}". The linked post may have no public comments.`,
      );
    }

    const rows = rawData as BrightDataErrorRow[];
    const errorRows = rows.filter(
      (r) =>
        (typeof r.error === "string" && r.error.trim().length > 0) ||
        r.error_code !== undefined,
    );
    const usableRows = rows.filter((r) => !errorRows.includes(r));

    if (usableRows.length === 0 && errorRows.length > 0) {
      const firstError = errorRows[0];
      const detail = firstError.error || "Scraper returned an error row";
      const code =
        firstError.error_code !== undefined
          ? ` (code: ${String(firstError.error_code)})`
          : "";
      throw new Error(
        `Bright Data could not scrape "${source.url}" for product "${source.productName}": ${detail}${code}.`,
      );
    }

    const commentsWithFallbackSentiment = transformComments(
      usableRows as BrightDataComment[],
      {
      forcedProductName: source.productName,
      },
    );
    if (commentsWithFallbackSentiment.length === 0 && usableRows.length > 0) {
      const first = usableRows[0] as Record<string, unknown>;
      const keys = Object.keys(first).slice(0, 25).join(", ");
      throw new Error(
        `Scrape returned ${usableRows.length} rows for "${source.productName}", but no comment text could be mapped. First row keys: ${keys}`,
      );
    }

    try {
      const commentsWithAiSentiment = await applyAiSentiment(commentsWithFallbackSentiment);
      try {
        const commentsWithAiClustering = await applyAiClustering(commentsWithAiSentiment);
        allComments.push(...commentsWithAiClustering);
      } catch (error) {
        console.warn("Clustering API unavailable, continuing without clusters.", error);
        allComments.push(...commentsWithAiSentiment);
      }
    } catch (error) {
      console.warn("Sentiment API unavailable, using fallback rule-based sentiment.", error);
      allComments.push(...commentsWithFallbackSentiment);
    }
    onProgress(`Collected comments for ${sourceLabel}.`, Math.round(done));
  }

  onProgress("Analyzing sentiment...", 85);
  await delay(500);

  const products = buildProducts(allComments);
  const overview = buildOverview(allComments, products);
  let recommendations = buildRecommendations(products, allComments);

  try {
    const aiRes = await fetch("/api/ai/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comments: allComments,
        products,
      }),
    });
    if (aiRes.ok) {
      const aiData = (await aiRes.json()) as { recommendations?: Recommendation };
      if (aiData.recommendations) {
        recommendations = aiData.recommendations;
      }
    } else {
      const detail = await aiRes.text().catch(() => "");
      console.warn("Gemini recommendations unavailable, using local recommendations.", detail);
    }
  } catch (error) {
    console.warn("Gemini recommendations failed, using local recommendations.", error);
  }

  onProgress("Generating insights...", 95);
  await delay(500);

  // Store results in memory
  analysisResults = {
    comments: allComments,
    products,
    overview,
    recommendations,
  };
  activeRunId = null;
  analysisCacheKey = null;

  try {
    await fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "LIVE",
        sources: cleanedSources,
        comments: allComments,
        products,
        overview,
        recommendations,
      }),
    });
  } catch (e) {
    console.error("Failed to persist analysis to DB:", e);
  }

  onProgress("Complete!", 100);

  return {
    success: true,
    commentCount: allComments.length,
    productCount: products.length,
  };
}

/** Simulate the scraping + analysis process for demo mode */
export async function startDemoAnalysis(
  onProgress: ProgressCallback,
): Promise<{ success: boolean; commentCount: number; productCount: number }> {
  const stages = [
    { label: "Scraping posts...", duration: 1500 },
    { label: "Analyzing comments...", duration: 2000 },
    { label: "Generating insights...", duration: 1200 },
  ];

  for (const stage of stages) {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      onProgress(stage.label, Math.round((i / steps) * 100));
      await delay(stage.duration / steps);
    }
  }

  analysisResults = {
    comments: mockComments,
    products: mockProducts,
    overview: mockDashboardOverview,
    recommendations: mockRecommendations,
  };
  activeRunId = null;
  analysisCacheKey = null;

  try {
    await fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "DEMO",
        sources: [],
        comments: mockComments,
        products: mockProducts,
        overview: mockDashboardOverview,
        recommendations: mockRecommendations,
      }),
    });
  } catch (e) {
    console.error("Failed to persist demo analysis to DB:", e);
  }

  return {
    success: true,
    commentCount: mockComments.length,
    productCount: mockProducts.length,
  };
}
