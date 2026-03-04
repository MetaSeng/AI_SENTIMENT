/**
 * Transforms raw Bright Data Facebook comment data into our application types.
 * Bright Data returns comments with fields like: text, date, author_name, likes, etc.
 * We perform simple keyword-based sentiment analysis here. In production,
 * replace with a proper NLP model or AI-based classification.
 */

import type {
  Comment,
  Product,
  DashboardOverview,
  Recommendation,
  Sentiment,
  Insight,
} from "./types";

// ─── Raw Bright Data comment shape ──────────────────────────────────
export interface BrightDataComment {
  post_id?: string;
  post_url?: string;
  comment_id?: string;
  comment_text?: string;
  text?: string;
  message?: string;
  comment?: string;
  content?: string;
  body?: string;
  comment_date?: string;
  date?: string;
  created_at?: string;
  created_time?: string;
  timestamp?: string;
  author_name?: string;
  name?: string;
  user_name?: string;
  username?: string;
  author?: string;
  author_id?: string;
  likes?: number;
  comment_likes?: number;
  like_count?: number;
  reaction_count?: number;
  comment_like_count?: number;
  replies?: number;
  post_text?: string;
  [key: string]: unknown;
}

// ─── Sentiment keywords ─────────────────────────────────────────────
const POSITIVE_KEYWORDS = [
  "love",
  "great",
  "amazing",
  "beautiful",
  "excellent",
  "awesome",
  "perfect",
  "best",
  "good",
  "nice",
  "fantastic",
  "wonderful",
  "happy",
  "recommend",
  "quality",
  "fast",
  "comfortable",
  "easy",
  "stylish",
  "worth",
  // Khmer positive
  "ស្អាត",
  "ចូលចិត្ត",
  "ល្អ",
  "អស្ចារ្យ",
  "ឆ្ងាញ់",
  "ធន់",
  "រីករាយ",
  "អរគុណ",
  "ពេញចិត្ត",
  "សប្បាយ",
  "ស្រស់ស្អាត",
  "ផាសុក",
  // Khmerlish positive
  "laor",
  "jolechet",
  "lour",
  "ok",
  "kool",
  "cool",
];

const NEGATIVE_KEYWORDS = [
  "bad",
  "terrible",
  "hate",
  "worst",
  "broken",
  "slow",
  "expensive",
  "poor",
  "issue",
  "problem",
  "complaint",
  "damaged",
  "delay",
  "wrong",
  "defect",
  "cheap",
  "disappointing",
  "refund",
  "return",
  "scratch",
  // Khmer negative
  "ថ្លៃ",
  "ពេក",
  "អាក្រក់",
  "ខូច",
  "យឺត",
  "ពិបាក",
  "មិនល្អ",
  "មិនសម",
  "មិនទាន់",
  "ខឹង",
  // Khmerlish negative
  "ot sok",
  "ot laor",
  "komplung",
  "chher",
];

// ─── Helpers ────────────────────────────────────────────────────────

function analyzeSentiment(text: string): {
  sentiment: Sentiment;
  score: number;
} {
  const lower = text.toLowerCase();
  let positiveHits = 0;
  let negativeHits = 0;

  for (const kw of POSITIVE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) positiveHits++;
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) negativeHits++;
  }

  if (positiveHits === 0 && negativeHits === 0) {
    return { sentiment: "neutral", score: 0.5 };
  }

  const total = positiveHits + negativeHits;
  const score = positiveHits / total;

  if (score >= 0.6) return { sentiment: "positive", score: 0.5 + score * 0.5 };
  if (score <= 0.4) return { sentiment: "negative", score: score * 0.5 };
  return { sentiment: "neutral", score: 0.5 };
}

function extractProductMentions(text: string): string {
  // Try to detect product names from common patterns
  const patterns = [
    /(?:iPhone|iphone)\s*\d*/i,
    /(?:Samsung|samsung)\s*\w*/i,
    /(?:AirPod|airpod|Earphone|earphone|Earbud|earbud)/i,
    /(?:Laptop|laptop)\s*\w*/i,
    /(?:Watch|watch|Smart\s*Watch)/i,
    /(?:Shoe|shoe|Sneaker|sneaker)/i,
    /(?:Dress|dress|Shirt|shirt|T-shirt)/i,
    /(?:Bag|bag|Backpack|backpack)/i,
    /(?:Coffee|coffee)\s*\w*/i,
    /(?:Camera|camera)/i,
    /(?:Sunglasses|sunglasses)/i,
    /(?:EV|Electric\s*Vehicle)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }

  return "General";
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return d.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// ─── Main transform functions ───────────────────────────────────────

export function transformComments(
  raw: BrightDataComment[],
  options?: { forcedProductName?: string },
): Comment[] {
  const getText = (r: BrightDataComment): string => {
    const candidates = [r.comment_text, r.text, r.message, r.comment, r.content, r.body];
    for (const value of candidates) {
      if (typeof value === "string" && value.trim().length > 0) return value.trim();
    }
    return "";
  };

  const getAuthor = (r: BrightDataComment): string => {
    const candidates = [r.author_name, r.name, r.user_name, r.username, r.author];
    for (const value of candidates) {
      if (typeof value === "string" && value.trim().length > 0) return value.trim();
    }
    return "Unknown";
  };

  const getDate = (r: BrightDataComment): string =>
    formatDate(
      (r.comment_date as string | undefined) ||
        (r.date as string | undefined) ||
        (r.created_at as string | undefined) ||
        (r.created_time as string | undefined) ||
        (r.timestamp as string | undefined),
    );

  const getLikes = (r: BrightDataComment): number => {
    const candidates = [
      r.likes,
      r.comment_likes,
      r.like_count,
      r.reaction_count,
      r.comment_like_count,
    ];
    for (const value of candidates) {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return 0;
  };

  return raw
    .filter((r) => {
      const text = getText(r);
      return text.trim().length > 0;
    })
    .map((r, index) => {
      const text = getText(r);
      const { sentiment, score } = analyzeSentiment(text);
      const product =
        options?.forcedProductName?.trim() || extractProductMentions(text);

      return {
        id: r.comment_id || `bd-${index}`,
        text,
        productMentioned: product,
        sentiment,
        sentimentScore: Math.round(score * 100) / 100,
        date: getDate(r),
        author: getAuthor(r),
        likes: getLikes(r),
      };
    });
}

export function buildProducts(comments: Comment[]): Product[] {
  const productMap = new Map<string, Comment[]>();

  for (const c of comments) {
    const existing = productMap.get(c.productMentioned) || [];
    existing.push(c);
    productMap.set(c.productMentioned, existing);
  }

  const products: Product[] = [];
  let idx = 0;

  for (const [name, pComments] of productMap) {
    idx++;
    const total = pComments.length;
    const positive = pComments.filter((c) => c.sentiment === "positive").length;
    const negative = pComments.filter((c) => c.sentiment === "negative").length;
    const neutral = total - positive - negative;

    const positivePercent = Math.round((positive / total) * 100);
    const negativePercent = Math.round((negative / total) * 100);
    const neutralPercent = 100 - positivePercent - negativePercent;

    const avgScore =
      pComments.reduce((sum, c) => sum + c.sentimentScore, 0) / total;

    // Build keyword frequency
    const wordCounts = new Map<
      string,
      { count: number; sentiment: Sentiment }
    >();
    for (const c of pComments) {
      const words = c.text.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length < 3) continue;
        const existing = wordCounts.get(word);
        if (existing) {
          existing.count++;
        } else {
          wordCounts.set(word, { count: 1, sentiment: c.sentiment });
        }
      }
    }
    const keywords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([word, data]) => ({
        word,
        sentiment: data.sentiment,
        count: data.count,
      }));

    // Build trend data by grouping comments by week
    const dateGroups = new Map<
      string,
      { positive: number; negative: number; neutral: number }
    >();
    for (const c of pComments) {
      const weekKey = c.date.substring(0, 7); // group by month
      const existing = dateGroups.get(weekKey) || {
        positive: 0,
        negative: 0,
        neutral: 0,
      };
      existing[c.sentiment]++;
      dateGroups.set(weekKey, existing);
    }
    const trendData = Array.from(dateGroups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, ...data }));

    // Infer category from product name
    let category = "General";
    if (/iphone|samsung|earphone|earbud|laptop|camera|phone/i.test(name))
      category = "Electronics";
    else if (/dress|shirt|shoe|sneaker|fashion/i.test(name))
      category = "Fashion";
    else if (/bag|backpack|sunglasses|watch/i.test(name))
      category = "Accessories";
    else if (/coffee|maker|home|kitchen/i.test(name)) category = "Home";
    else if (/ev|vehicle|car/i.test(name)) category = "Automotive";

    products.push({
      id: `p-${idx}`,
      name,
      category,
      mentionCount: total,
      positivePercent,
      negativePercent,
      neutralPercent,
      avgSentimentScore: Math.round(avgScore * 100) / 100,
      comments: pComments.slice(0, 20),
      keywords,
      trendData,
    });
  }

  return products.sort((a, b) => b.mentionCount - a.mentionCount);
}

export function buildOverview(
  comments: Comment[],
  products: Product[],
): DashboardOverview {
  const total = comments.length;
  const positive = comments.filter((c) => c.sentiment === "positive").length;
  const negative = comments.filter((c) => c.sentiment === "negative").length;
  const neutral = total - positive - negative;

  const positivePercent = total > 0 ? Math.round((positive / total) * 100) : 0;
  const negativePercent = total > 0 ? Math.round((negative / total) * 100) : 0;
  const neutralPercent = 100 - positivePercent - negativePercent;

  // Sentiment over time - group by date
  const dateMap = new Map<
    string,
    { positive: number; negative: number; neutral: number }
  >();
  for (const c of comments) {
    const dateKey = c.date;
    const existing = dateMap.get(dateKey) || {
      positive: 0,
      negative: 0,
      neutral: 0,
    };
    existing[c.sentiment]++;
    dateMap.set(dateKey, existing);
  }
  const sentimentOverTime = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      ...data,
    }));

  // Engagement vs sentiment - use top posts
  const postMap = new Map<string, { likes: number; scores: number[] }>();
  for (const c of comments) {
    const postKey = c.date; // group by date as proxy for posts
    const existing = postMap.get(postKey) || { likes: 0, scores: [] };
    existing.likes += c.likes;
    existing.scores.push(c.sentimentScore);
    postMap.set(postKey, existing);
  }
  const engagementVsSentiment = Array.from(postMap.entries())
    .slice(0, 8)
    .map(([post, data], i) => ({
      post: `Post ${i + 1}`,
      likes: data.likes,
      sentimentScore: Math.round(
        (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100,
      ),
    }));

  // Calculate average sentiment score from all comments
  const avgScore =
    total > 0
      ? Math.round(
          (comments.reduce((sum, c) => sum + c.sentimentScore, 0) / total) *
            100,
        )
      : 0;

  return {
    totalComments: total,
    avgSentimentScore: avgScore,
    engagedProducts: products.length,
    recommendationCount: Math.min(products.length, 8),
    sentimentOverTime,
    sentimentDistribution: [
      { name: "Positive", value: positivePercent, fill: "oklch(0.65 0.2 155)" },
      { name: "Neutral", value: neutralPercent, fill: "oklch(0.65 0.01 250)" },
      { name: "Negative", value: negativePercent, fill: "oklch(0.6 0.2 30)" },
    ],
    engagementVsSentiment,
  };
}

export function buildRecommendations(
  products: Product[],
  comments: Comment[],
): Recommendation {
  const sorted = [...products].sort(
    (a, b) => b.positivePercent - a.positivePercent,
  );

  const topProducts = sorted.slice(0, 3).map((p) => ({
    name: p.name,
    positivePercent: p.positivePercent,
    praisePoints: p.keywords
      .filter((k) => k.sentiment === "positive")
      .slice(0, 3)
      .map((k) => `Customers love the ${k.word} (${k.count} mentions)`),
  }));

  const needsSorted = [...products].sort(
    (a, b) => b.negativePercent - a.negativePercent,
  );
  const needsImprovement = needsSorted.slice(0, 3).map((p) => ({
    name: p.name,
    negativePercent: p.negativePercent,
    complaints: p.keywords
      .filter((k) => k.sentiment === "negative")
      .slice(0, 3)
      .map((k) => `Issues with ${k.word} (${k.count} mentions)`),
  }));

  // Build insights from data
  const insights: Insight[] = [];
  const totalNeg = comments.filter((c) => c.sentiment === "negative").length;
  const shippingComplaints = comments.filter(
    (c) => c.sentiment === "negative" && /ship|deliver|ដឹក|យឺត/i.test(c.text),
  ).length;

  if (shippingComplaints > 0) {
    const pct = Math.round((shippingComplaints / Math.max(totalNeg, 1)) * 100);
    insights.push({
      id: "i1",
      icon: "package",
      title: "Shipping complaints detected",
      description: `${pct}% of negative comments mention shipping delays. Consider faster courier options.`,
      type: "warning",
    });
  }

  if (topProducts.length > 0) {
    insights.push({
      id: "i2",
      icon: "star",
      title: `${topProducts[0].name} is your top performer`,
      description: `With ${topProducts[0].positivePercent}% positive sentiment, feature this product in your next campaign.`,
      type: "success",
    });
  }

  const priceComplaints = comments.filter(
    (c) =>
      c.sentiment === "negative" && /price|ថ្លៃ|expensive|value/i.test(c.text),
  ).length;
  if (priceComplaints > 2) {
    insights.push({
      id: "i3",
      icon: "dollar-sign",
      title: "Price sensitivity detected",
      description: `${priceComplaints} comments mention price concerns. Consider reviewing your pricing strategy.`,
      type: "danger",
    });
  }

  insights.push({
    id: "i4",
    icon: "refresh-cw",
    title: `${comments.length} comments analyzed`,
    description: `Across ${products.length} products. Run analysis regularly to track sentiment trends.`,
    type: "info",
  });

  // Trending topics
  const wordFreq = new Map<
    string,
    { count: number; sentiments: Sentiment[] }
  >();
  for (const c of comments) {
    const words = c.text.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length < 3) continue;
      const existing = wordFreq.get(word) || { count: 0, sentiments: [] };
      existing.count++;
      existing.sentiments.push(c.sentiment);
      wordFreq.set(word, existing);
    }
  }
  const trendingTopics = Array.from(wordFreq.entries())
    .filter(([, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([word, data]) => {
      const posCt = data.sentiments.filter((s) => s === "positive").length;
      const negCt = data.sentiments.filter((s) => s === "negative").length;
      const sentiment: Sentiment =
        posCt > negCt ? "positive" : negCt > posCt ? "negative" : "neutral";
      return { word, count: data.count, sentiment };
    });

  return { topProducts, needsImprovement, insights, trendingTopics };
}
