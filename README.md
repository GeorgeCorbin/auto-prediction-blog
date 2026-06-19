# Auto Prediction Blog

A fully automated sports prediction blog. ESPN provides game schedules, team stats, and probable pitchers (free, no key required). A swappable odds abstraction layer (starting with The Odds API) supplies betting lines. A swappable AI layer writes prediction articles automatically and publishes them to a Next.js site.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend / SSR | Next.js 16 (App Router, ISR) |
| Database / ORM | Prisma 7 + PostgreSQL |
| Game Data | ESPN Scoreboard API (free) |
| Odds Data | The Odds API |
| Article Generation | Swappable AI (OpenAI, Ollama, Anthropic) |
| Scheduling | node-cron (in-process) or pm2 |

---

## Setup

### Prerequisites

- **Node.js 20.9+** (required by Next.js 16)
- **PostgreSQL** running locally (or a connection string to a hosted instance)

### Install

```bash
git clone <repo-url>
cd auto-prediction-blog
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your values (see [Environment Variables](#environment-variables) below).

### Initialize the database

```bash
npm run db:migrate    # applies migrations and creates tables
npm run db:generate   # generates the Prisma client
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://localhost:5432/auto_prediction_blog` |
| `OPENAI_API_KEY` | OpenAI API key — required when using the `production` preset or `AI_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | Anthropic API key — required when using the `claude` preset or `AI_PROVIDER=anthropic` |
| `THE_ODDS_API_KEY` | Your [The Odds API](https://the-odds-api.com) key — free tier is 500 requests/month |
| `AI_PROVIDER` | Optional override: `openai`, `ollama`, or `anthropic` |
| `AI_MODEL` | Optional model name override, e.g. `gpt-4o`, `llama3.2`, `claude-sonnet-4-20250514` |
| `AI_BASE_URL` | Optional API base URL — set to `http://localhost:11434/v1` for Ollama |
| `AI_TEMPERATURE` | Optional sampling temperature (default comes from the active preset) |
| `AI_API_KEY` | Optional generic API key override for any provider |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the deployed site, e.g. `https://yourdomain.com` — used for sitemap and JSON-LD |

---

## Running the Site

```bash
npm run dev     # development server at http://localhost:3000
npm run build   # production build
npm start       # serve the production build
```

---

## Running the Pipeline Manually

Run either script on demand without the scheduler:

```bash
npm run scan      # fetch ESPN games + odds → upsert to DB, mark READY
npm run generate  # find READY games → call GPT-4o → publish articles
```

Run them in sequence to go from scratch to published articles in one pass:

```bash
npm run scan && npm run generate
```

### Feature flags

Pipeline toggles live in `src/lib/feature-flags.ts` (not `.env`). Set `statsPickWithoutOdds: true` to generate articles without odds using stats/pitching analysis instead of spread or moneyline picks. Restart scan/generate/scheduler after changing flags.

### AI model / provider

Article generation uses a swappable provider layer in `src/lib/ai/config.ts`. Change `aiSettings.activePreset` to switch models:

| Preset | Provider | Default model | API key needed |
|---|---|---|---|
| `local` | Ollama | `llama3.2` | No (run `ollama serve` locally) |
| `production` | OpenAI | `gpt-4o` | `OPENAI_API_KEY` |
| `claude` | Anthropic | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |

Env vars (`AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`, etc.) override preset values — useful in production without code changes.

```bash
# Example: test with Ollama locally
# 1. Set activePreset: 'local' in src/lib/ai/config.ts
# 2. ollama pull llama3.2 && ollama serve
npm run generate

# Example: override preset via env in production
AI_PROVIDER=openai AI_MODEL=gpt-4o npm run generate
```

---

## Running the Scheduler

The scheduler keeps both cron jobs running in a single long-lived process:

- **Every hour** — `scan-games`: fetch ESPN scoreboard for today + tomorrow, upsert odds
- **Every 30 minutes** — `generate-articles`: pick up any READY games and publish articles

**Direct (foreground):**

```bash
npm run scheduler
```

**With pm2 (background, auto-restart on crash):**

```bash
pm2 start "npm run scheduler" --name prediction-scheduler
pm2 save          # persist across reboots
pm2 logs prediction-scheduler
```

---

## Adding New Sports

All sport-level configuration lives in a single file: `src/lib/sports/config.ts`.

To **pause a sport**, set `enabled: false` for that entry — the scanner and article generator will skip it automatically.

To **add a new sport** (e.g. NFL):

1. Add an entry to the `SPORTS` array in `src/lib/sports/config.ts` with the correct ESPN sport/league keys and The Odds API sport key.
2. Create a prompt template at `src/lib/ai/prompts/<sport>.ts` (model it on `mlb.ts`).
3. Register the new template in `src/lib/ai/generator.ts`.
4. Run `npm run db:migrate` if the new sport needs additional DB fields.

No other files need to change.

---

## AdSense

Two placeholders need to be updated with your real AdSense publisher ID before going live:

- **`src/app/layout.tsx`** — the `<Script>` tag that loads the AdSense JS (`ca-pub-XXXXXXXXXX`)
- **`src/components/AdSlot.tsx`** — the `data-ad-client` prop on the `<ins>` element (`ca-pub-XXXXXXXXXX`)

Replace both occurrences of `ca-pub-XXXXXXXXXX` with your actual publisher ID from the [AdSense dashboard](https://adsense.google.com).
