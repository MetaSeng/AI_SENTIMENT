# SocialSight AI Sentiment Dashboard

SocialSight is a full-stack dashboard for scraping Facebook comments, running sentiment analysis + clustering, and showing product insights, recommendations, and history.

## Tech Stack

- Next.js (App Router) + React + TypeScript
- Prisma ORM + PostgreSQL
- FastAPI (Python) for ML inference endpoints
- Bright Data dataset API for Facebook scraping
- Gemini API for recommendation enhancement (optional fallback)

## Core Features

- User authentication (register/login/logout/session)
- User-scoped analysis history in PostgreSQL
- Date range filtering (`7d`, `30d`, `90d`, `custom`)
- Demo mode + live Bright Data scraping flow
- AI sentiment via `/api/sentiment/predict/batch` with fallback to rule-based sentiment
- AI clustering via `/api/clustering/predict/batch` (cluster id stored per comment)
- Optional Gemini recommendations via `/api/ai/recommendations` with local fallback

## Project Structure

```txt
app/
  api/
    ai/recommendations/        # Gemini-backed recommendation proxy
    analysis/                  # save + latest + run details + history
    auth/                      # register/login/logout/me
    clustering/predict/batch/  # Next.js route -> FastAPI clustering
    scrape/                    # Bright Data trigger/progress/results
    sentiment/predict/batch/   # Next.js route -> FastAPI sentiment
api/
  app.py                       # FastAPI entrypoint
  routes/                      # sentiment + clustering routes
  services/                    # model loading / inference
lib/
  api.ts                       # frontend analysis orchestration
  server/analysis-response.ts  # DB -> UI mapping (incl. languageTag, clusterId)
prisma/
  schema.prisma
```

## Prerequisites

- Node.js 18+
- pnpm
- Python 3.10+
- PostgreSQL

## Environment Variables

Create/update `.env` in project root:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_sentiment_db"
AUTH_SECRET="replace-with-a-long-random-secret"

# Optional for live scraping
BRIGHTDATA_API_KEY="your-brightdata-api-key"

# Optional for AI recommendation enhancement
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-1.5-pro"
```

## Installation

```bash
pnpm install
pip install -r api/requirements.txt
```

## Database Setup

```bash
npx prisma migrate dev --name init_schema
npx prisma generate
```

## Run (Web + ML Together)

```bash
pnpm dev
```

This starts:
- Next.js at `http://localhost:3000`
- FastAPI ML server at `http://localhost:8000`

## Run Separately

```bash
pnpm run dev:web
pnpm run dev:ml
```

## API Endpoints

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Analysis:
- `POST /api/analysis`
- `GET /api/analysis/latest?range=30d&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/analysis/[runId]?range=30d&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/analysis/history?limit=20`

Scraping:
- `POST /api/scrape/trigger`
- `GET /api/scrape/progress/[snapshotId]`
- `GET /api/scrape/results/[snapshotId]`
- `GET /api/config/brightdata`

AI integration routes (Next.js server routes):
- `POST /api/sentiment/predict/batch`
- `POST /api/clustering/predict/batch`
- `POST /api/ai/recommendations`

## Notes

- If ML API is unavailable, sentiment falls back to local rule-based logic.
- If clustering is unavailable, analysis continues without `clusterId`.
- If Gemini is unavailable, recommendation generation falls back to local logic.
