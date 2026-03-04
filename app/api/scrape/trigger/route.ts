import { NextResponse } from "next/server";

const BRIGHTDATA_API = "https://api.brightdata.com/datasets/v3";
const COMMENTS_DATASET_ID = "gd_lkay758p1eanlolqw8";

function looksLikeFacebookUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return /(^|\.)facebook\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function normalizeFacebookHost(url: URL): URL {
  const copy = new URL(url.toString());
  if (/^(m|web)\.facebook\.com$/i.test(copy.hostname)) {
    copy.hostname = "www.facebook.com";
  }
  return copy;
}

function isSharePath(pathname: string): boolean {
  return /\/share\//i.test(pathname);
}

async function resolveFacebookInputUrl(inputUrl: string): Promise<string> {
  const parsed = normalizeFacebookHost(new URL(inputUrl));
  const normalized = parsed.toString();

  // Try to resolve redirects/canonical URL (works for many share links).
  try {
    const response = await fetch(normalized, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    let candidate = response.url || normalized;
    if (looksLikeFacebookUrl(candidate)) {
      candidate = normalizeFacebookHost(new URL(candidate)).toString();
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      const match = html.match(
        /<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i,
      );
      const ogUrl = match?.[1]?.trim();
      if (ogUrl && looksLikeFacebookUrl(ogUrl)) {
        return normalizeFacebookHost(new URL(ogUrl)).toString();
      }
    }

    return candidate;
  } catch {
    // Fallback to normalized input if URL resolution fails.
    return normalized;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "BRIGHTDATA_API_KEY not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Facebook page URL is required" },
        { status: 400 },
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return NextResponse.json(
        { error: "Invalid URL. Please provide a full https://facebook.com/... URL." },
        { status: 400 },
      );
    }

    if (!/(^|\.)facebook\.com$/i.test(parsed.hostname)) {
      return NextResponse.json(
        { error: "Please provide a Facebook URL." },
        { status: 400 },
      );
    }

    const resolvedUrl = await resolveFacebookInputUrl(url.trim());
    const resolvedPath = (() => {
      try {
        return new URL(resolvedUrl).pathname;
      } catch {
        return "";
      }
    })();

    // If still a share URL after resolution, we cannot reliably scrape it.
    if (isSharePath(resolvedPath)) {
      return NextResponse.json(
        {
          error:
            "Could not resolve this share link to a direct post/page URL. Open the shared content and copy its final public URL.",
        },
        { status: 400 },
      );
    }

    // Trigger the Bright Data scraper
    const triggerUrl = `${BRIGHTDATA_API}/trigger?dataset_id=${COMMENTS_DATASET_ID}&include_errors=true`;
    const payload = [{ url: resolvedUrl }];
    console.log("[v0] Triggering Bright Data:", triggerUrl);
    console.log("[v0] Input URL:", url);
    console.log("[v0] Resolved URL:", resolvedUrl);
    console.log("[v0] Payload:", JSON.stringify(payload));

    const response = await fetch(triggerUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("[v0] Bright Data trigger response status:", response.status);
    console.log("[v0] Bright Data trigger response body:", responseText);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Bright Data API error: ${response.status}`,
          details: responseText,
        },
        { status: response.status },
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON from Bright Data", details: responseText },
        { status: 500 },
      );
    }

    console.log("[v0] Parsed trigger data:", JSON.stringify(data));
    if (!data.snapshot_id) {
      return NextResponse.json(
        { error: "Bright Data API did not return a snapshot_id" },
        { status: 500 },
      );
    }
    return NextResponse.json({ snapshot_id: data.snapshot_id });
  } catch (error) {
    console.error("[v0] Scrape trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger scraping" },
      { status: 500 },
    );
  }
}
