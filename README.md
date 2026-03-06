# SocialSight AI Sentiment Dashboard

SocialSight is a Next.js dashboard for scraping Facebook comments, running sentiment analysis, and showing product-level insights, recommendations, and history.

It now includes:
- User authentication (register/login/logout/session)
- PostgreSQL + Prisma persistence
- Analysis history by account
- Date range filtering (7d / 30d / 90d / custom)
- Demo mode + live Bright Data scraping flow

## Tech Stack

- Next.js (App Router) + React + TypeScript
- Prisma ORM + PostgreSQL
- ShadCN UI components
- Bright Data dataset API for Facebook comment scraping

## Features

- Authenticate users and scope all data by account
- Run analysis in:
  - Demo mode (mock dataset)
  - Live mode (Bright Data scrape -> transform -> persist)
- Dashboard tabs:
  - Home
  - Sentiment Analysis
  - Product Performance
  - Recommendations
  - History
  - Settings
- View and open previous analysis runs
- Filter all analytics with global date range

## Project Structure

```txt
app/
  api/
    auth/                  # register/login/logout/me
    analysis/              # save analysis + latest + run details + history
    scrape/                # Bright Data trigger/progress/results
components/
  ...                      # dashboard UI pages/components
lib/
  api.ts                   # frontend service layer
  prisma.ts                # Prisma client init (Prisma 7 adapter)
  transform.ts             # data transform + rule-based sentiment helpers
  server/
    auth.ts                # cookie session helpers
    password.ts            # password hash/verify
    analysis-response.ts   # DB -> UI response mapping
    date-filter.ts         # date range parsing/bounds
prisma/
  schema.prisma
  migrations/
```

## Prerequisites

- Node.js 18+ (recommended latest LTS)
- pnpm (recommended)
- PostgreSQL running locally or remotely

## Environment Variables

Create/update `.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_sentiment_db"
AUTH_SECRET="replace-with-a-long-random-secret"

# Optional: required for live scraping
BRIGHTDATA_API_KEY="your-brightdata-api-key"
```

Notes:
- Prisma CLI reads `DATABASE_URL` from `.env` via `prisma.config.ts`.
- `AUTH_SECRET` is required for secure production sessions.
- If `BRIGHTDATA_API_KEY` is missing, use Demo mode.

## Installation

```bash
pnpm install
```

## Database Setup

Run migrations:

```bash
npx prisma migrate dev --name init_schema
npx prisma generate
```

Verify:

```bash
npx prisma migrate status
```

## Run the App

```bash
pnpm dev
```

Open: `http://localhost:3000`

## First End-to-End Test

1. Register a new account on login page.
2. Sign in.
3. Go to Dashboard Home.
4. Run `Demo Analysis` first.
5. Open:
   - Sentiment
   - Products
   - Recommendations
   - History
6. Change date range in header (`7d`, `30d`, `90d`, `custom`) and verify charts/tables update.
7. Open a run from History and confirm the selected run loads.

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Analysis
- `POST /api/analysis`  
  Persist analysis output for current user.
- `GET /api/analysis/latest?range=30d&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/analysis/[runId]?range=30d&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/analysis/history?limit=20`

### Scraping (Bright Data)
- `POST /api/scrape/trigger`
- `GET /api/scrape/progress/[snapshotId]`
- `GET /api/scrape/results/[snapshotId]`
- `GET /api/config/brightdata`

## Date Filter Behavior

Global date range in header drives dashboard data:
- `7d`: from today-6 days to today
- `30d`: from today-29 days to today
- `90d`: from today-89 days to today
- `custom`: uses `from` and `to` date inputs

Applied to:
- comments list
- sentiment overview/charts
- product metrics/trends
- recommendations

## Authentication & Data Isolation

- Session stored in secure HttpOnly cookie (`ss_session`)
- Passwords hashed with Node `scrypt`
- Analysis and history APIs are user-scoped
- Users only see their own runs

## Integrating External Sentiment Model + Gemini Clustering

Current sentiment pipeline is rule-based in `lib/transform.ts`.

To replace with your friend’s model:
1. Add server-side inference client (API call preferred).
2. Replace sentiment assignment in analysis flow.
3. Persist model version and confidence per comment.
4. Add Gemini clustering step after sentiment.
5. Store clusters and surface in Recommendations/History.

Recommended env additions:

```env
SENTIMENT_API_URL="https://your-model-service/predict"
SENTIMENT_API_KEY="optional"
GEMINI_API_KEY="your-gemini-key"
GEMINI_MODEL="gemini-1.5-pro"
```

## Troubleshooting

- `P1001 Can't reach database server`:
  - check PostgreSQL is running
  - verify `.env` host/port/db is correct
  - ensure Prisma uses the same DB you open in pgAdmin
- Empty tables in pgAdmin:
  - run migrations
  - refresh `Schemas > public > Tables`
- `Unauthorized` from analysis APIs:
  - login again
  - verify `/api/auth/me` returns user

## Useful Commands

```bash
npx prisma validate
npx prisma migrate status
npx prisma studio
npx tsc --noEmit
```

## Current Notes

- Google OAuth button is placeholder (disabled)
- Demo mode still useful for local testing without Bright Data key
- History page shows stored runs and allows opening completed runs

