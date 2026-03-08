# Technical Documentation: SocialSight AI Sentiment Dashboard

## 1. System Overview

SocialSight is a full-stack analytics platform for Facebook comment analysis.

The system allows a user to:
- authenticate into a personal account,
- run analysis in demo mode or live mode (real Facebook links),
- classify sentiment of comments (AI model with fallback),
- optionally cluster comments into themes,
- generate recommendation insights (Gemini + local fallback),
- store each analysis run in PostgreSQL,
- browse history and re-open past runs with date filtering.

Main purpose: convert unstructured social comments into actionable product insights per account.

## 2. Software Architecture

### Architecture Style

The project uses a multi-layer architecture with two backend services:
- Next.js app (UI + server API routes + DB access)
- Python FastAPI ML service (sentiment + clustering inference)

### High-Level Interaction

1. User interacts with Next.js frontend.
2. Frontend calls internal Next.js API routes (`/api/...`).
3. Next.js server routes:
- call Bright Data APIs for scraping,
- call FastAPI ML endpoints for sentiment/clustering,
- call Gemini API for recommendation enhancement,
- persist and query data via Prisma + PostgreSQL.
4. Processed results are returned to frontend dashboards.

### Logical Diagram

```text
Browser UI (React/Next.js)
    |
    | HTTP (same-origin /api)
    v
Next.js Route Handlers (TypeScript)
    |--- Prisma Client ---> PostgreSQL
    |--- Bright Data API -> Facebook comment snapshots
    |--- FastAPI ML API --> Sentiment + Clustering models
    |--- Gemini API ------> AI recommendation synthesis
    v
Response JSON -> Dashboard tabs (sentiment/products/recommendations/history)
```

## 3. Technology Stack

### Frontend

- Language: TypeScript
- Framework: Next.js 16 (App Router) + React 19
- UI: Tailwind CSS + Radix UI components
- State: React state + context (`AppProvider`)

### Backend

- Primary backend: Next.js Route Handlers (`app/api/**`)
- Language: TypeScript (Node.js runtime)
- ML backend: FastAPI (Python, Uvicorn)
- Server startup:
- `npm run dev` runs both Next.js and FastAPI together via `concurrently`

### Database

- Database: PostgreSQL
- ORM: Prisma 7 (`@prisma/client` with `@prisma/adapter-pg`)
- Connection: `DATABASE_URL` env var used in [`lib/prisma.ts`](./lib/prisma.ts)

## 4. System Components

### Frontend Components

- [`components/app-provider.tsx`](./components/app-provider.tsx)
  - Global app state: auth user, active tab, demo/live mode, date range filter.
- [`components/login-page.tsx`](./components/login-page.tsx)
  - Register/login UI and auth API calls.
- [`components/dashboard-home.tsx`](./components/dashboard-home.tsx)
  - Collects input (products + FB links), starts demo/live analysis.
- [`components/sentiment-analysis.tsx`](./components/sentiment-analysis.tsx)
  - Loads overview + comments data for sentiment dashboard.
- [`components/product-performance.tsx`](./components/product-performance.tsx)
  - Product-level metrics and trends.
- [`components/recommendations.tsx`](./components/recommendations.tsx)
  - Displays generated recommendations/insights.
- [`components/history-page.tsx`](./components/history-page.tsx)
  - Lists stored runs and loads a selected run.
- [`components/dashboard-header.tsx`](./components/dashboard-header.tsx)
  - Date range filter control (`7d`, `30d`, `90d`, `custom`).

### Backend Services and APIs (Next.js)

- Auth APIs: register/login/logout/me
- Analysis APIs: save run, latest run, run-by-id, history list
- Scraping APIs: trigger Bright Data, poll progress, fetch snapshot results
- AI proxy APIs: sentiment batch, clustering batch
- Gemini insights API: recommendation generation

### AI Models and Roles

- Sentiment model (FastAPI):
- XLM-RoBERTa fine-tuned model for `Positive/Neutral/Negative` classification.
- CharCNN-BiLSTM language tagger to attach language tags.
- Clustering model (FastAPI):
- Sentence Transformer embeddings + trained KMeans cluster assignment.
- Recommendation model:
- Gemini via REST (`generateContent`) to produce structured recommendation JSON.
- Fallback behaviors:
- If sentiment API fails -> local rule-based sentiment is used.
- If clustering fails -> analysis continues without cluster IDs.
- If Gemini fails -> local recommendation builder is used.

### External APIs / Third-Party Services

- Bright Data dataset API for Facebook scraping workflow.
- Google Gemini API for recommendation enhancement.

## 5. Data Flow

### End-to-End Live Analysis Flow

1. User logs in (`/api/auth/login`), session cookie is created.
2. User enters product names + Facebook URLs in dashboard.
3. Frontend calls `startRealAnalysis()` in [`lib/api.ts`](./lib/api.ts).
4. For each source URL:
- `POST /api/scrape/trigger` -> returns `snapshot_id`.
- `GET /api/scrape/progress/[snapshotId]` until ready.
- `GET /api/scrape/results/[snapshotId]` -> raw comment rows.
5. Raw rows are transformed into internal `Comment[]` shape.
6. Frontend requests AI sentiment:
- `POST /api/sentiment/predict/batch` (Next proxy to FastAPI).
7. Frontend requests clustering:
- `POST /api/clustering/predict/batch` (Next proxy to FastAPI).
8. Frontend builds product metrics + dashboard overview + local recommendations.
9. Frontend optionally requests Gemini recommendations:
- `POST /api/ai/recommendations`.
10. Final analysis payload is persisted:
- `POST /api/analysis`.
11. Dashboard tabs load data from persisted APIs (`latest` or selected `runId`).
12. Date filter is passed to APIs and applied when mapping run comments.

### Demo Mode Flow

1. User runs demo analysis.
2. Mock comments/products are generated.
3. Data is still persisted through `POST /api/analysis` as `mode: DEMO`.

## 6. API Structure

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Analysis Persistence and Retrieval

- `POST /api/analysis`
  - Saves a completed run with comments, products, metrics, insights.
- `GET /api/analysis/latest?range=...&from=...&to=...`
  - Fetches most recent completed run for logged-in user.
- `GET /api/analysis/[runId]?range=...&from=...&to=...`
  - Fetches specific run for logged-in user.
- `GET /api/analysis/history?limit=20`
  - Lists past runs for logged-in user.

### Scraping

- `GET /api/config/brightdata`
- `POST /api/scrape/trigger`
- `GET /api/scrape/progress/[snapshotId]`
- `GET /api/scrape/results/[snapshotId]`

### AI and Recommendation

- `POST /api/sentiment/predict/batch` (proxy to FastAPI)
- `POST /api/clustering/predict/batch` (proxy to FastAPI)
- `POST /api/ai/recommendations` (Gemini)

### Frontend-to-Backend Communication Pattern

- UI components call service functions in [`lib/api.ts`](./lib/api.ts).
- `lib/api.ts` orchestrates multi-step backend calls and handles fallback logic.
- Resulting data is served back to UI via fetch and rendered by dashboard components.

## 7. Database Design

Database schema is defined in [`prisma/schema.prisma`](./prisma/schema.prisma).

### Core Entity Groups

- Identity and ownership:
- `User`, `UserSetting`, `Project`

- Analysis execution:
- `AnalysisRun`, `RunEvent`, `AnalysisSource`

- Comment pipeline:
- `RawComment` (ingested source payload)
- `CleanComment` (normalized + sentiment + metadata)

- Aggregation and insight:
- `Product`, `ProductRunMetric`, `KeywordMetric`, `Insight`, `RecommendationItem`

- Integration config:
- `Integration` (platform links, currently Facebook)

### Relationship Highlights

- One `User` owns many `Project` and `AnalysisRun` records.
- One `AnalysisRun` has many `AnalysisSource`, `RawComment`, `CleanComment`, metrics, insights, and recommendations.
- `RawComment` has one corresponding `CleanComment` (`rawCommentId` unique).
- Product-level metrics are stored per run (`ProductRunMetric` unique on run+product).

### Backend Interaction with DB

- Prisma client in [`lib/prisma.ts`](./lib/prisma.ts).
- Write path: [`app/api/analysis/route.ts`](./app/api/analysis/route.ts).
- Read path:
- [`app/api/analysis/latest/route.ts`](./app/api/analysis/latest/route.ts)
- [`app/api/analysis/[runId]/route.ts`](./app/api/analysis/[runId]/route.ts)
- [`app/api/analysis/history/route.ts`](./app/api/analysis/history/route.ts)
- Date filtering and response shaping:
- [`lib/server/date-filter.ts`](./lib/server/date-filter.ts)
- [`lib/server/analysis-response.ts`](./lib/server/analysis-response.ts)

## 8. Integration (How Everything Connects)

### Runtime Integration

- Single command development mode:
- `npm run dev` starts:
  - Next.js web server (`localhost:3000`)
  - FastAPI ML server (`localhost:8000`)

### Cross-Service Integration Contracts

- Next.js -> FastAPI:
- Sentiment and clustering calls go through Next proxy routes.
- Base URL from `SENTIMENT_API_BASE_URL` (default `http://127.0.0.1:8000`).

- Next.js -> PostgreSQL:
- Prisma adapter uses `DATABASE_URL`.

- Next.js -> Bright Data:
- Uses `BRIGHTDATA_API_KEY` for scrape orchestration.

- Next.js -> Gemini:
- Uses `GEMINI_API_KEY` and optional `GEMINI_MODEL`.

### Security and Data Scoping

- Cookie-based sessions (`ss_session`) signed with `AUTH_SECRET`.
- Analysis/history endpoints require authenticated user.
- Query results are scoped by project owner (`ownerId`).

---

This architecture provides a practical hybrid AI pipeline:
- deterministic scraping + persistence,
- pluggable ML inference service,
- optional LLM enhancement,
- user-scoped historical analytics for dashboard exploration.
