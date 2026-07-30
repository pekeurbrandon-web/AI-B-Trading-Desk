-- AI-B Trading Desk — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / ON CONFLICT).

create table if not exists settings (
  id int primary key default 1,
  balance numeric not null default 10000,
  risk_pct numeric not null default 1,
  daily_loss numeric not null default 4,
  ai_provider text not null default 'anthropic',
  consensus_mode boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1) -- one settings row, this is a single-user app
);
insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists journal_entries (
  id text primary key,
  ts bigint not null,
  symbol text,
  timeframe text,
  bias text,
  confidence numeric,
  grade text,
  summary text,
  trade_idea jsonb,
  planned_rr numeric,
  outcome text default 'open',
  result_r numeric,
  session text,
  notes text,
  risk_amount_at_entry numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_journal_ts on journal_entries (ts desc);
create index if not exists idx_journal_symbol on journal_entries (symbol);
create index if not exists idx_journal_outcome on journal_entries (outcome);

create table if not exists patterns (
  id text primary key,
  ts bigint not null,
  symbol text,
  timeframe text,
  outcome text,
  setup_type text,
  notes text,
  source text default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists idx_patterns_ts on patterns (ts desc);
create index if not exists idx_patterns_symbol on patterns (symbol);

-- Referential note: trade_idea is stored as jsonb on journal_entries rather than a separate
-- foreign-keyed table. A trade idea has no independent existence outside its parent analysis —
-- it's a property of the entry, not a distinct entity other tables need to reference. Splitting
-- it into its own table would add a join for every read with no real integrity benefit here.

-- Row Level Security: left OFF intentionally. This schema is accessed only by your own server
-- using the service_role key (never the anon/public key), so RLS policies would just add
-- complexity without a real security boundary for a single-user, server-only access pattern.
-- If you ever expose these tables directly to a browser client, turn RLS on before doing so.
