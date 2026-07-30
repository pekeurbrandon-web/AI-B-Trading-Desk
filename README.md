# AI-B Trading Desk — Standalone Self-Hosted App

Personal, single-user AI-assisted trading analysis desk. Runs as a real website you host yourself — a small Node/Express server holds your Anthropic API key and your data; the browser never sees the key.

## What's actually in this build

- **Analyze Chart** — 5 fixed timeframe upload slots (5M entry required; 15M, 1H, 4H, Daily optional). Higher timeframes set bias, lower timeframes refine entry. Every completed analysis is auto-archived as historical/pattern reference data.
- **Batch Scanner** — upload up to 8 charts at once, ranked by AI confidence. Doubles as a historical-upload tool via "Log as Pattern" on any result.
- **Pattern Library** — log past setups manually, or upload a result screenshot and let the AI extract symbol/setup/outcome for you to review before saving. "Analyze My Pattern Library" surfaces recurring conditions across what you've logged — clearly labeled as qualitative reference, not a statistical backtest.
- **Risk Calculator** — deterministic position sizing, fully interlinked with Analyze's suggested size.
- **Trading Journal** — R-multiple tracking, session tagging, notes.
- **AI Coach** — evidence-based review of your closed trades.
- **Performance Analytics** — win rate, expectancy, profit factor, by symbol/session.
- **Franky Lamps** — floating chat overlay sharing the exact same data/state as the rest of the app.
- **Dashboard** — account settings (single source of truth for the whole app) and a daily risk-budget tracker.

## What this is not

No live broker feed, no auto-execution, no guaranteed outcomes. This is decision support and record-keeping — it doesn't place trades and it doesn't promise anything about future results. See `PROJECT_STATE.md` (carried over from earlier builds) for the full non-goals list and why.

---

## AI provider — Anthropic, OpenAI, or OpenRouter, with optional failover

Three provider options now, all set up the same way (`.env` or the in-app Settings panel):

- **Anthropic** (default) and **OpenAI** — direct integrations, as before.
- **OpenRouter** — one key, many model families (Google Gemini, Meta Llama, Mistral, DeepSeek, and others) through a single OpenAI-compatible API. This is the pragmatic way to reach more providers without a bespoke integration per one — see `PROJECT_STATE.md` for why that approach was chosen over building ~8 separate SDK adapters.

**Failover**: toggle "Auto-failover" in Settings. If your primary provider's call fails (bad key, outage, rate limit), the app automatically retries with the next configured provider — and always tells you plainly when that happened (in the analysis banner and the journal entry's provider tag), never silently.

**Consensus mode** (unchanged, still Anthropic+OpenAI only) takes priority over failover when both are enabled, since they serve different purposes — consensus wants two *independent* reads, failover wants *a* working read.

**Call logging**: every AI call (provider, model, latency, success/failure) is logged and viewable in Dashboard → Recent AI Calls. Real, working observability — not a dashboard that names metrics without collecting them.

**Provider tagging**: every journal entry and pattern now records which provider/model actually produced it. This is groundwork, not a finished feature — there's no "compare accuracy by provider" view yet, but the data is being captured from now on so that becomes possible later without needing to go back and backfill anything.

## Data persistence — JSON files (default) or Supabase

By default, settings/journal/patterns save to `./data/*.json` on your server — zero setup, works immediately. Switch to Supabase (a free hosted Postgres database) if you want your data to survive a redeploy on a platform that wipes disk (flagged as a real risk further down in this README), or want proper SQL access to your own trading history later.

**To switch to Supabase:**
1. Create a free project at [supabase.com](https://supabase.com)
2. In the Supabase dashboard: **SQL Editor → New query**, paste the contents of `supabase_schema.sql` from this repo, click **Run**
3. **Project Settings → API**, copy the **Project URL** and the **service_role** key (not the `anon` key — service_role is what lets your server bypass Row Level Security, which is correct here since only your server ever calls it)
4. Add both to `.env`:
   ```
   SUPABASE_URL=https://yourproject.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```
5. Restart the server. The startup log will print `Data backend: supabase` — confirm this before assuming the switch worked. `/api/health` also reports `dataBackend` if you want to check without restarting.

**What doesn't migrate automatically:** if you've already been running on JSON files and switch to Supabase, your existing `./data/*.json` history stays where it is — it does not auto-import into the new tables. This is a one-way switch for new data going forward, not a migration script. If you want your existing journal history moved over, that's a real follow-up task (reading the JSON files and bulk-inserting into Supabase), not something implied by just adding the env vars.

**Honesty note on testing:** verified this integration's *plumbing* against a live server — confirmed the backend correctly selects Supabase when configured, confirmed read failures degrade gracefully to sensible defaults instead of crashing the app, and (after finding and fixing a real bug during testing) confirmed write failures now correctly return an error instead of silently claiming success. Could not verify a real round-trip against an actual Supabase project — that requires a real account and credentials that don't exist in the build environment. Test your own setup with a throwaway journal entry before trusting it with real data.

API keys (Anthropic/OpenAI) are deliberately **not** part of this migration — they stay in `./data/keys.json` regardless of which data backend you use, since they're server secrets rather than application data, and there's no good reason to put a raw API key in a database even your own.

## 1. Local setup

Requires Node.js 18+ (for native `fetch`).

```bash
cd ai-b-trading-desk
npm install
cp .env.example .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...           # from https://console.anthropic.com
APP_ACCESS_TOKEN=<a long random string>  # generate: openssl rand -hex 24
PORT=3000
```

Run it:

```bash
npm start
```

Open `http://localhost:3000`. You'll be asked for the access token you set above — enter it once, it's remembered in your browser (`localStorage`) after that.

## 2. How data persists

Everything (settings, journal, pattern library) is saved to JSON files in `./data/` on the server, not in the browser. That means it survives clearing your browser cache and works the same from any device that can reach the server — unlike the earlier Claude Artifact version. `./data/` is gitignored; back it up yourself if it matters to you (it's just JSON files, easy to copy).

## 3. Deploying so you can reach it from anywhere

Pick one:

**Option A — small VPS (DigitalOcean, Hetzner, etc.), full control**
1. Provision a small instance, install Node 18+.
2. Copy this folder up (`scp` or `git clone` your own repo — just don't commit `.env`).
3. `npm install --production`, set `.env` on the server.
4. Run it under a process manager so it survives reboots/crashes:
   ```bash
   npm install -g pm2
   pm2 start server.js --name ai-b-desk
   pm2 save
   pm2 startup
   ```
5. Put a reverse proxy (nginx or Caddy) in front for HTTPS. Caddy is the least fuss — a two-line Caddyfile gets you free auto-renewing HTTPS:
   ```
   yourdomain.com {
     reverse_proxy localhost:3000
   }
   ```

**Option B — managed platform (Render, Railway, Fly.io)**
These build from your repo and give you HTTPS automatically. Steps are roughly the same everywhere:
1. Push this folder to a private GitHub repo (`.env` stays out via `.gitignore`).
2. Connect the repo on the platform.
3. Set `ANTHROPIC_API_KEY` and `APP_ACCESS_TOKEN` as environment variables in the platform's dashboard (not in the repo).
4. Deploy. Start command is `npm start`.
5. **Persistence caveat:** some platforms (Render's free tier, for example) wipe the filesystem on redeploy — meaning `./data/` gets reset. If you use one of these, either upgrade to a plan with a persistent disk/volume, or plan to export your journal periodically. This isn't a bug in the code, it's a property of the hosting tier — check your platform's docs on persistent disks before relying on it long-term.

**Option C — just run it on your own machine**
`npm start` and use it from that machine only. Simplest option if you don't need to reach it from your phone or elsewhere.

## 4. Security notes (read this before deploying anywhere public)

- **`APP_ACCESS_TOKEN` is the only thing standing between the internet and your Anthropic API bill.** If it's blank, the server runs with no auth at all (it'll warn loudly in the console) — fine for `localhost` only, never for anything with a public URL.
- The token is checked on every `/api/*` request server-side; it's never exposed to the page source in a way that reveals your Anthropic key — the key itself never leaves the server.
- There's no rate limiting beyond what your Anthropic plan enforces. For genuinely personal use this is fine; if you're ever worried about cost, Anthropic's console lets you set spend limits on the key itself — that's a more reliable backstop than anything this app can do.
- `express.json({ limit: '15mb' })` is set to accommodate multi-timeframe chart uploads (5 images per Analyze call). This is intentionally generous but not unlimited.

## 5. If something's not working

- Visit `/api/health` directly in your browser (no token needed) — it tells you whether `ANTHROPIC_API_KEY` and `APP_ACCESS_TOKEN` are actually loaded from `.env`.
- Check the server console/logs — every Claude proxy failure and storage error is logged there.
- "Token rejected" on the unlock screen means what you typed doesn't match `APP_ACCESS_TOKEN` in `.env` on the server (not a bug — the check is a timing-safe exact string comparison).

## 6. File structure

```
ai-b-trading-desk/
  server.js          — Express backend: auth, routes, AI provider proxy
  db.js              — persistence abstraction: Supabase or JSON files, picked automatically
  supabase_schema.sql — run once in Supabase's SQL Editor if you switch backends
  package.json
  .env.example        — copy to .env, never commit .env
  .gitignore
  public/
    index.html
    styles.css
    app.js             — all frontend logic (Store, Analyze, Scanner, Pattern Library, Coach, Franky Lamps)
  data/                — created at runtime, gitignored, your actual data lives here
```
