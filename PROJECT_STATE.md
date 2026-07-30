# AI-B Trading Desk — Project State Document

*Living reference. Regenerate/update this whenever asked for further changes — don't assume it self-updates.*

---

## 1. What this actually is

A single-file HTML/CSS/JS app (`trading_desk.html`), rendered as a Claude Artifact. No backend, no server, no database beyond the artifact's built-in per-user key-value storage. Every "AI" feature is a direct call to Claude's API from the browser (already authenticated by the artifact platform — no API key handling needed or possible client-side).

This determines everything else below. A browser page cannot securely hold broker credentials, other providers' API keys, or run a persistent backend service. Features that would require that are explicitly out of scope (see §5), not silently faked.

## 2. Architecture

```
trading_desk.html
├── CSS (design tokens: gold/near-black terminal-premium theme)
├── HTML (8 tab pages + sidebar/mobile nav, generated from one NAV_ITEMS array)
└── JS (IIFE, single <script> block)
    ├── Store            — single source of truth. In-memory state + window.storage
    │                      persistence. All reads/writes to settings, journal entries,
    │                      and pattern library go through Store's methods. Nothing
    │                      else touches window.storage directly.
    ├── callClaude()      — the one function that calls api.anthropic.com. Every
    │                      feature (Analyze, Scanner, Coach, Franky Lamps) routes
    │                      through it. model is fixed at claude-sonnet-4-6,
    │                      max_tokens fixed at 1000 per platform requirement.
    ├── classifyGrade()   — one shared A+/B/C setup-quality function, used by
    │                      Analyze results, Scanner results, and Journal cards.
    ├── PRESETS           — one shared symbol → pip size/value table, used by
    │                      Calculator, Analyze's "suggested size," and normalizeSymbol().
    └── Per-tab render functions (renderDashboard, renderJournal, renderStats,
        renderPatterns, renderAnalysis, renderScannerPartial) — all read from
        Store.get(), none maintain their own copy of the data.
```

**Why no formal build step / framework:** a single static file is what an Artifact can render. Adding React/bundlers here would add complexity without adding capability.

## 3. Data schema (all in `window.storage`, personal/non-shared)

**`account-settings`** — `{ balance, riskPct, dailyLoss }`. One object, one key. Read by Dashboard, Calculator, Analyze's suggested-size, and the daily risk budget.

**`journal-entries`** — array of:
```
{ id, ts, symbol, timeframe, bias, confidence, grade, summary,
  tradeIdea: { has_setup, direction, entry_price, stop_price, take_profit_1, take_profit_2, conditions_before_entry },
  plannedRR, outcome: "open"|"win"|"loss"|"be", resultR (number|null),
  session: ""|"Asia"|"London"|"New York"|"Overlap", notes }
```
`resultR` (R-multiple) is what makes expectancy/profit factor computable — it's user-entered on trade close, not inferred.

**`pattern-library`** — array of:
```
{ id, ts, symbol, timeframe, outcome: "win"|"loss"|"be", setupType, notes }
```
No images stored (keeps storage light and avoids per-key size growth) — metadata + description only.

## 4. Feature inventory by phase

**Phase 0/1 (audited and corrected this cycle):**
- Chart upload + AI vision read, with numeric `trade_idea` fields (was free text — now structured, actually feeds the Calculator)
- Risk/position size calculator, deterministic
- Journal with R-multiple tracking (was missing — expectancy was previously uncomputable)
- Dashboard with live stats
- Mobile responsive nav (was missing — sidebar broke below ~820px)
- Visible storage-failure handling on writes (was silently swallowed)

**Phase 2 (this cycle):**
- Multi-timeframe upload (up to 3 images, higher timeframe stated as dominant in the prompt)
- Analyst council (compact multi-persona reasoning) + opposing case
- Manual economic/context field (no live calendar — trader types known upcoming events)
- Batch Scanner (sequential per-image analysis, ranked by confidence — not a continuous live scan)
- AI Coach (reads closed journal trades, evidence-based review, grounded in logged data only)
- Extended stats: expectancy, profit factor, avg win/loss R, by-symbol and by-session breakdown
- Daily risk budget tracker on Dashboard (reads today's closed trades against the daily loss % setting)

**Phase 3 (this cycle):**
- Single-store refactor (`Store` object) — replaced 17 scattered direct storage calls
- Visual redesign — refined gold/near-black palette, SVG icon set (nav generated from one array, no duplicated markup between desktop/mobile), glass-panel chat overlay
- Pattern Library tab — log historical setups + outcomes; Analyze pulls up to 3 matching-symbol patterns in as qualitative context; win-rate-by-setup-type stat
- Setup grading (A+/B/C) — one shared classifier function, shown consistently in Analyze, Scanner, and Journal
- Franky Lamps — floating chat overlay, same Store/context as the rest of the app, routes through the same `callClaude()` function

## 5. Explicit non-goals (and why)

These appear in a "master directive" style spec but are not implemented, on purpose:

| Requested | Why not built here |
|---|---|
| Authentication / role management | Single personal user, no server to authenticate against — a login screen with nowhere to send credentials is decorative, not functional |
| Multi-provider AI orchestration (OpenAI/Google/xAI adapters) | Only Anthropic's API is available to call securely from this artifact without exposing keys client-side; fake adapters that aren't wired to real providers would be dead code |
| Live broker feed / auto-execution | A browser page can't safely hold broker API credentials; this remains upload-and-analyze, not streaming or order placement |
| CI/CD, deployment scripts, rollback procedures, backups | There's no deployment pipeline for a single HTML file rendered in an artifact — nothing to build these around |
| True statistical backtesting | Requires historical price time-series and a simulation engine, not a handful of tagged screenshots. Pattern Library is qualitative reference, explicitly labeled as such everywhere it appears |
| "Highest probability" / guaranteed-profit signal generation | No system can determine this with certainty. The app surfaces structured, confidence-scored analysis and disciplined risk math — it does not promise outcomes, and the UI says so (ticker, disclaimers, Coach output) |

## 6. Known limitations (current)

- Confidence scores are the model's self-assessment, not independently calibrated against a labeled dataset — treat relative (70 vs 40) more than absolute
- Pip/point values in `PRESETS` are common approximations, not pulled from a real broker spec
- Franky Lamps chat history is session-only (not persisted) — closing the tab loses the conversation
- Pattern Library matching is exact-symbol-string only, no fuzzy matching or setup-similarity scoring
- Scanner processes images sequentially (one API call per image) — 8 images will take roughly 8x a single Analyze call

## 7. Standalone deployment (self-hosted, not an Artifact)

The project now also exists as a real self-hosted app (`ai-b-trading-desk/`), separate from the Claude Artifact preview. Key differences:

- **Backend**: Express server (`server.js`) holds API keys server-side, proxies AI calls, persists data to JSON files in `./data/`.
- **Auth**: `APP_ACCESS_TOKEN` gates all `/api/*` routes — required once the app has a public URL, since an ungated URL would let anyone spend your API credits.
- **Multi-provider AI**: `/api/claude` accepts an optional `provider` field (`anthropic` default, or `openai`). Both adapters (`callAnthropic`, `callOpenAI`) normalize to the same `{content:[{type:'text',text}]}` shape, so the frontend never branches on provider. Selectable live in Dashboard → Account Settings, no restart needed.
- **Data persistence**: server-side JSON files instead of the Artifact's `window.storage` — survives browser cache clears, reachable from any device.

## 8. Engineering audit (this session) — findings and what was actually done

A real audit was run against the standalone build, not a cosmetic pass:

| Finding | Fixed this session? |
|---|---|
| Coach, Franky Lamps, and Library Insights each built their own separate, partial context — no actual shared awareness despite being described as "one mind" | **Yes** — consolidated into one `buildDeskContext()` function in `app.js`, called by all three. This is the real single-brain implementation, not just a claim. |
| Only one AI provider wired in | **Yes** — real server-side OpenAI adapter added alongside Anthropic (see §7). Not a stub — actually implemented, with the testing caveat noted in the README. |
| Saved journal entries had no way to correct entry/stop/TP if the AI misread a price — only outcome/notes were editable | **Yes** — added an inline editable trade-parameters section to each journal card. |
| No data export — a hosting-tier disk reset (already flagged in §8) had no manual escape hatch | **Yes** — CSV export button added to the Journal page, pure client-side. |
| Pattern Library matching is exact-symbol-string only (`EURUSD` ≠ `EUR/USD`) | **No** — logged as backlog, not implemented this session (moderate complexity, lower urgency than the above). |
| No visibility into *which* provider/why an AI call failed beyond a generic banner | Partially — provider-aware error messages now exist server-side (`'Upstream ' + provider + ' error'`), but the frontend still shows a fairly generic banner. Backlog: surface provider name in the UI error too. |

## 9. Visual redesign (this session)

- Palette shifted to Chelsea blue / gold / white (`--blue`, `--blue-deep`, existing `--gold` system), starfield background via a single CSS pseudo-element (no DOM/JS cost)
- Display typography moved from Space Grotesk to Anton (page titles, brand) and Oswald (card titles, nav, buttons) for an athletic-broadcast register — deliberately not UEFA's actual proprietary Champions League typeface, which is licensed
- Franky Lamps' icon is an original blue jersey with the number 8 (Lampard homage) — not Chelsea's actual crest or sponsor branding, which are trademarked
- Removed the animated top ticker banner per request; the safety/scope disclaimer was not deleted, just moved to a quieter italic line in the sidebar footer — a financial-analysis tool foregoing all disclosure felt like the wrong tradeoff even in a more "exclusive" visual register

## 10. Session 3 — real bug fixes, consensus mode, and scope boundary on the "institutional OS" directive

**Bugs found and fixed (not just architecture nits — actual functional problems):**
- Scanner's "Log as Pattern" used a blocking `window.prompt()` — replaced with an inline outcome selector consistent with the rest of the UI
- `buildAnalysisPrompt` (used by both Analyze and Scanner) had no awareness of `buildDeskContext()` — Analyze's AI calls didn't know about settings/journal/pattern performance even though Coach/Franky/Insights did after the prior session's fix. Now included.
- Dashboard showed nothing about the Pattern Library despite it being a core data store — added Pattern Library size and win rate as dashboard stats.

**New this session:**
- **Consensus mode**: optional setting that runs Anthropic and OpenAI concurrently on every Analyze/Scanner call (`provider:'both'` on `/api/claude`, real `Promise.all` server-side). If the two independent reads disagree on trend bias, the app treats that disagreement as a real signal — confidence is capped low and no trade idea is shown, rather than arbitrarily picking one model's answer. This is the honest version of "combine multiple AI sources."
- **Validation layer** (`validateAnalysis()`): checks AI-returned trade parameters for internal consistency (e.g., stop equals entry, or stop/entry/target ordering wrong for the stated direction) before the data reaches the journal or calculator. Failing this check withholds the trade idea and flags it visibly rather than silently passing through bad numbers.
- **Real TradingView chart widget** on the Dashboard — official free embed (`s3.tradingview.com/tv.js`), symbol-changeable, visualization only. No fake integration; genuinely just their public widget.
- Franky Lamps: real personality pass (football/Chelsea-obsessive, self-deprecating humorous storyteller tone) while keeping every substantive constraint (no fabrication, no profit guarantees) unchanged. Jersey icon enlarged for legibility; outer button size unchanged.

**Explicit scope boundary set this session** (in response to a "master directive" document requesting a full institutional OS):
- Declined: live MetaTrader/Exness order execution layer, a literal 12-separate-engine AI Council architecture, genuine ML model retraining/"self-learning," multi-user auth/roles. Reasons: no secure way to hold broker credentials in this architecture; 12 separate reasoning engines would either blow the 1000-token budget or require 12x the API calls per analysis for marginal benefit over a compact multi-perspective council; there's no training pipeline here — the "learning" that exists is real (Coach/Insights synthesize logged data) but it's qualitative synthesis, not model retraining; this remains a single-user tool by design.
- Kept: the council concept, compacted from 4 to 5 named perspectives within the same token budget (Market Structure, Liquidity, Risk Manager, Psychology, Probability) rather than expanded to a fictional 12.
- Confirmed already-satisfied: Franky Lamps has no write-access tools — every data mutation in the app happens through explicit user-clicked buttons, never autonomously through chat. This already satisfies "human-in-command" without needing new confirmation-flow scaffolding.

## 11. Session 4 — API key UI, TradingView link handling completed, and the "Constitution" request

**Real additions:**
- **API keys are now configurable from the app itself** (Dashboard → API Keys card), not just `.env`. Server stores them in `data/keys.json`, takes effect immediately (no restart), never echoes the full key back to the browser (masked display only). `.env` remains the fallback default if nothing's set via the UI.
- **TradingView link handling, two honest paths**: (1) paste a link or symbol → parses out the actual symbol and loads it on the live public widget; (2) for a trader's own drawings/indicators, paste TradingView's own "Publish → Copy embed code" output → rendered in a domain-restricted iframe (verified to reject non-tradingview.com URLs). Explicitly does not and will not support username/password login — no official API exists for that, and building one would mean storing real TradingView credentials, which is a real security/ToS risk to the person's actual account, not a hypothetical one.
- **Jersey icon redesign**: path redrawn to occupy nearly the full 48×48 viewBox (was a smaller silhouette with more padding), button enlarged 54px → 64px, panel position adjusted to match.

**Scope decision on the "AI-B Architecture Constitution" request:** declined to produce a 25-40 page document describing an Event Bus, Context Engine, Decision Engine, Knowledge Graph, versioned ML model releases, and a 12-engine specialist system, because none of that exists in this codebase and writing polished documentation describing non-existent subsystems would actively mislead anyone (including a future Claude session) who read it later expecting those components to be real. What actually exists and is documented accurately in this file instead: one shared `Store` (single source of truth), one AI proxy function per provider, a deterministic Risk Calculator kept separate from AI reasoning, and Franky Lamps having no write-access tools (satisfies "human-in-command" by construction, not by policy document). This file — kept honest and updated each session — is the real version of what a "living constitution" should be for a project this size.

## 12. Session 5 — aggressive bug hunt and correctness audit

Method: automated cross-checks (every JS DOM reference vs actual HTML IDs, duplicate ID scan), unit tests against hand-calculated expected values for every math path, and live security tests against the running server — not a read-through.

**Real bugs found and fixed:**

1. **Validation-layer bypass**: `validateAnalysis()`'s consistency check only fired when `direction` was exactly `'long'` or `'short'`. A malformed AI response with `has_setup: true`, `direction: null`, and nonsensical prices (stop 100 pips from entry, target on the wrong side) passed through untouched, because the check simply never ran for a non-matching direction value. Fixed by explicitly flagging `has_setup: true` with an invalid/missing direction as its own validation failure. Verified with a reproducing test case before and after.

2. **CSV export escaping gap**: only the `notes` field escaped embedded double-quote characters before CSV-quoting; `symbol` and `timeframe` (both free text, from AI detection or manual entry) did not. A stray `"` in either would have silently misaligned columns in the exported file. Fixed by escaping every field consistently. Verified with an adversarial symbol value containing a quote character.

3. **Daily risk budget used current settings for historical trades**: the "today's realized loss" figure multiplied every closed trade's R-multiple by the *current* risk% and balance, even for trades closed earlier in the day under different settings. In a reproducing test scenario (risk changed from 1% to 2% mid-day), this overstated realized loss by 33%. Fixed by capturing the actual dollar risk amount at the moment each trade is saved (`riskAmountAtEntry`) and using that historical value going forward, with a clearly-labeled fallback (and a visible UI note) for entries saved before this fix.

4. **Pattern-extraction silently defaulted to "Win" on an unclear read**: the Outcome dropdown's HTML default is "Win". When the AI's image-based extraction returned `outcome_guess: "unclear"`, the code didn't touch the dropdown — so an admittedly-uncertain read looked identical to a confident "Win" selection unless the person happened to double-check. Fixed to explicitly surface "outcome wasn't clear" in the status message rather than let the default silently stand in for a real answer.

**Checked and confirmed correct (no bug):** every `getElementById` call in `app.js` resolves to a real element (2 apparent mismatches were dynamically-generated buttons, confirmed correct); no duplicate HTML IDs; position sizing and R:R math verified against hand calculations for forex and metals; expectancy/profit-factor math verified including the important edge case of trades with no R-multiple logged (correctly returns `null`, not a misleading `0`); floating-point noise in raw pip-distance calculations is real but invisible to the user because `.toFixed(1)` already rounds it away before display; the `/api/config/keys` endpoints are genuinely protected by auth middleware (verified live: no-token rejected, wrong-token rejected, correct-token succeeds — an earlier apparent bypass in testing turned out to be a shell-escaping artifact in the *test command*, not the app, confirmed by re-running with corrected JSON); TradingView embed domain restriction correctly rejects non-tradingview.com URLs.

**Full regression suite** (health, auth rejection, settings round-trip, journal create/update, pattern create/delete, key config set-and-mask, static file serving) run clean with zero errors after all fixes applied.

## 13. Session 6 — Supabase persistence migration (per the "AI-B Trading System Specification" document)

A new specification document arrived proposing a large architecture (5-layer separation, 9-agent AI council, knowledge graph, React/Next.js rewrite). Two internal contradictions in that document were resolved rather than followed literally:

- **§12 (React/Next.js stack) vs §0/§23 ("do not redesign," "preserve existing UI")**: resolved in favor of §0/§23. No frontend framework migration — it would be pure churn with zero functional gain, and directly violates the document's own stronger constraint.
- **§8 (9 separate specialist AI agents) vs §11/§19 ("AI must only be invoked when reasoning is genuinely required," "reduce AI cost" as a mandatory filter)**: resolved in favor of cost discipline. Nine separate API calls per analysis is a 5-9x cost multiplier for marginal gain over the existing compact 5-perspective council (one call). Kept the existing council rather than building the literal 9-agent version.

**What was actually built — the document's own explicit Week-1/Phase-2 priority, and nothing else:** migrated persistence from JSON-only to a real abstraction (`db.js`) that uses Supabase (free-tier Postgres) when `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` are configured, and falls back to the existing JSON files automatically otherwise — satisfying the document's own "existing functionality must continue to work throughout the upgrade" requirement without needing a feature flag or manual toggle.

- `supabase_schema.sql` — three tables (settings, journal_entries, patterns), each with the same shape as the existing JSON structure, camelCase↔snake_case mapping isolated to `db.js` so routes don't need to know which backend is active. RLS deliberately left off with a documented reason (service_role-only, server-side access pattern — turn it on before ever exposing these tables to a browser client).
- API keys deliberately **not** migrated — they stay in `data/keys.json` regardless of backend, since they're server secrets, not application data.

**Real bug found and fixed during this session's testing** (not just claimed — reproduced and fixed): the first version of the Supabase write functions caught errors, logged them, and then returned the *attempted* data as if the write had succeeded — meaning a failed save would report success to the frontend, which would show "saved" for data that was never actually persisted. Caught by deliberately testing against unreachable dummy Supabase credentials rather than only testing the happy path. Fixed so writes now correctly throw and surface a real error; reads still degrade gracefully to sensible defaults (a failed *read* showing defaults is reasonable; a failed *write* claiming success is not).

**Testing honesty**: the JSON fallback path was fully regression-tested (identical behavior confirmed via live server calls, zero changes from before). The Supabase path's plumbing was verified live (correct backend selection, graceful read degradation, correct write-failure surfacing) against unreachable dummy credentials — a real round-trip against an actual Supabase project could not be verified, since that needs a real account this environment doesn't have. This distinction is stated plainly in the README, not glossed over.

## 14. Session 7 — multi-provider orchestration (per the "Multi-LLM Intelligence Layer" directive)

A directive arrived asking for orchestration across 10 providers, ML-learned routing rules, and a full enterprise observability platform. Scoped down to what's honestly buildable and valuable for a single-user app:

- **Declined**: 8 additional bespoke SDK integrations (Google, xAI, Mistral, DeepSeek, Llama, Ollama, Azure OpenAI direct, etc.) — replaced with **OpenRouter** as a third adapter, which reaches most of those same model families through one OpenAI-compatible API. Real provider access without maintaining 8 separate bespoke clients for providers nobody has asked to use yet.
- **Declined**: "routing rules learned automatically from historical performance" — no training/evaluation infrastructure exists or should exist at this data scale. Built the actual precondition instead: every journal entry and pattern now records which provider/model produced it (`aiProvider` field), so a real accuracy-by-provider analysis becomes possible later from genuine data, rather than faking a learning system with nothing to learn from.
- **Declined**: full "enterprise observability platform" — built real, working call logging instead (provider, model, latency, success/failure, capped at 300 entries), with a working endpoint and a Dashboard viewer. Modest and true, not impressive-sounding and empty.

**Built for real:**
- `callOpenRouter()` adapter, reusing the same OpenAI-compatible content translation as the existing OpenAI adapter
- Failover and provider selection live in the one shared `callClaude()` function — verified by checking every call site (Analyze, Scanner, Pattern extraction, Library Insights, Coach, Franky all call it) rather than assuming. This means all five AI-calling features inherited the new provider/failover behavior automatically, with no per-feature changes needed — the payoff of keeping one shared AI-call function instead of five separate ones.
- **Failover**: `callProviderWithFailover()` tries the requested provider first, then automatically tries the other configured providers in order if it fails — opt-out via a Settings toggle, defaults on. Every response reports which provider(s) were actually attempted; the frontend surfaces this plainly (never a silent substitution) in both the Analyze results banner and the saved journal entry's provider tag.
- Call logging (`logCall()`/`readCallLog()`, server-side JSON, capped) plus `/api/logs` and a Dashboard "Recent AI Calls" panel
- Extended `/api/config/keys` and `/api/health` to cover all three providers using the same DRY pattern as before (one `keyInfo()` helper instead of three near-duplicate blocks)

**Real bug found and fixed during this session, before shipping — not after:** the frontend key-management code was generalized to loop over all three providers using their API names (`anthropic`, `openai`, `openrouter`) to build DOM element IDs — but the actual HTML uses an abbreviated `anth` prefix for Anthropic's fields (`anthKeyStatus`, not `anthropicKeyStatus`), a naming inconsistency from an earlier session. The generalized loop would have called `.addEventListener` on `null` for every Anthropic key button, throwing immediately and potentially breaking the whole script's execution. Caught by actually executing `app.js` against the real `index.html` in a simulated DOM (via `jsdom`) rather than only checking syntax — this is a meaningfully more rigorous test than anything done in earlier sessions, and it's now the standard going forward for any change touching DOM wiring. Fixed with an explicit `KEY_ID_PREFIX` map rather than assuming provider names match HTML ids.

**Testing performed, stated precisely:**
- Full simulated-browser boot test (jsdom): real `index.html` + real `app.js`, mocked `fetch`/`localStorage` responses, confirmed zero runtime errors across the auth-gate path, the unlocked-dashboard path, and Journal-page rendering with a provider-tagged entry
- Live server test of failover logic: confirmed it correctly tries multiple providers in order and reports exactly which ones were attempted, including correctly handling a raw network-level failure (not just clean API error JSON) without crashing
- Live server test confirming failover-disabled mode stops after one attempt as expected
- Could not verify a real successful OpenRouter response (needs a real account/key + the build sandbox's network allowlist doesn't include `openrouter.ai`) — plumbing and error handling verified, live response not

## 15. Updated backlog (supersedes the previous list)

- Fuzzy/tag-based pattern matching instead of exact symbol match
- Persist Franky Lamps conversation server-side (currently session-only)
- Verify the OpenAI, OpenRouter, and Supabase paths with real credentials against a real deployment (all blocked in the build sandbox by its network allowlist and/or lack of real accounts)
- Wire the TradingView widget's symbol to auto-follow the last analyzed symbol instead of requiring manual entry
- Configurable council personas (currently fixed 5)
- A real migration script for existing JSON journal history into Supabase (switching backends currently starts the Supabase tables empty)
- Rule-based (non-AI) market structure detection as a deterministic pre-pass before AI reasoning, per an earlier specification document — a legitimate, larger undertaking not attempted yet
- An actual "accuracy by provider" view now that entries are being tagged with which provider produced them — needs enough tagged, closed trades to be meaningful first

