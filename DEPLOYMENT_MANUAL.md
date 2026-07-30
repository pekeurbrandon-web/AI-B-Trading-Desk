// Persistence abstraction. Two backends behind one interface:
//   - Supabase (Postgres), used automatically when SUPABASE_URL + SUPABASE_SERVICE_KEY are set
//   - JSON files in ./data/, used automatically otherwise (zero-setup default, same as before)
// This satisfies "existing functionality must continue to work throughout the upgrade" —
// nothing breaks if you never touch Supabase; it just becomes available once configured.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

// ---------------- JSON file backend (unchanged behavior from before) ----------------
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
function jsonFile(name) { return path.join(DATA_DIR, name + '.json'); }
function jsonRead(name, fallback) {
  try { return JSON.parse(fs.readFileSync(jsonFile(name), 'utf8')); }
  catch (e) { return fallback; }
}
function jsonWrite(name, value) {
  fs.writeFileSync(jsonFile(name), JSON.stringify(value, null, 2));
}

const jsonBackend = {
  type: 'json',
  async getSettings() {
    return jsonRead('settings', { balance: 10000, riskPct: 1, dailyLoss: 4, aiProvider: 'anthropic', consensusMode: false });
  },
  async setSettings(s) {
    jsonWrite('settings', s);
    return s;
  },
  async getJournal() {
    return jsonRead('journal', []);
  },
  async addJournalEntry(entry) {
    const entries = jsonRead('journal', []);
    const saved = Object.assign({ id: 'j_' + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now() }, entry);
    entries.unshift(saved);
    jsonWrite('journal', entries);
    return saved;
  },
  async updateJournalEntry(id, patch) {
    const entries = jsonRead('journal', []);
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    entries[idx] = Object.assign({}, entries[idx], patch);
    jsonWrite('journal', entries);
    return entries[idx];
  },
  async deleteJournalEntry(id) {
    let entries = jsonRead('journal', []);
    entries = entries.filter((e) => e.id !== id);
    jsonWrite('journal', entries);
    return true;
  },
  async getPatterns() {
    return jsonRead('patterns', []);
  },
  async addPattern(p) {
    const patterns = jsonRead('patterns', []);
    const saved = Object.assign({ id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now() }, p);
    patterns.unshift(saved);
    jsonWrite('patterns', patterns);
    return saved;
  },
  async deletePattern(id) {
    let patterns = jsonRead('patterns', []);
    patterns = patterns.filter((p) => p.id !== id);
    jsonWrite('patterns', patterns);
    return true;
  }
};

// ---------------- Supabase backend ----------------
// snake_case in the DB, camelCase in the app — these two small mappers keep that translation
// in exactly one place instead of scattered through every route.
function journalToDb(e) {
  return {
    id: e.id, ts: e.ts, symbol: e.symbol, timeframe: e.timeframe, bias: e.bias,
    confidence: e.confidence, grade: e.grade, summary: e.summary, trade_idea: e.tradeIdea,
    planned_rr: e.plannedRR, outcome: e.outcome, result_r: e.resultR, session: e.session,
    notes: e.notes, risk_amount_at_entry: e.riskAmountAtEntry
  };
}
function journalFromDb(row) {
  if (!row) return null;
  return {
    id: row.id, ts: Number(row.ts), symbol: row.symbol, timeframe: row.timeframe, bias: row.bias,
    confidence: row.confidence, grade: row.grade, summary: row.summary, tradeIdea: row.trade_idea,
    plannedRR: row.planned_rr, outcome: row.outcome, resultR: row.result_r, session: row.session,
    notes: row.notes, riskAmountAtEntry: row.risk_amount_at_entry
  };
}
function patternToDb(p) {
  return { id: p.id, ts: p.ts, symbol: p.symbol, timeframe: p.timeframe, outcome: p.outcome, setup_type: p.setupType, notes: p.notes, source: p.source };
}
function patternFromDb(row) {
  if (!row) return null;
  return { id: row.id, ts: Number(row.ts), symbol: row.symbol, timeframe: row.timeframe, outcome: row.outcome, setupType: row.setup_type, notes: row.notes, source: row.source };
}
function settingsToDb(s) {
  return { id: 1, balance: s.balance, risk_pct: s.riskPct, daily_loss: s.dailyLoss, ai_provider: s.aiProvider, consensus_mode: s.consensusMode };
}
function settingsFromDb(row) {
  if (!row) return { balance: 10000, riskPct: 1, dailyLoss: 4, aiProvider: 'anthropic', consensusMode: false };
  return { balance: row.balance, riskPct: row.risk_pct, dailyLoss: row.daily_loss, aiProvider: row.ai_provider, consensusMode: row.consensus_mode };
}

let supabaseBackend = null;
if (USE_SUPABASE) {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  supabaseBackend = {
    type: 'supabase',
    async getSettings() {
      const { data, error } = await sb.from('settings').select('*').eq('id', 1).maybeSingle();
      if (error) { console.error('Supabase getSettings error:', error.message); return settingsFromDb(null); }
      return settingsFromDb(data);
    },
    async setSettings(s) {
      const { data, error } = await sb.from('settings').upsert(settingsToDb(s)).select().maybeSingle();
      if (error) { console.error('Supabase setSettings error:', error.message); throw new Error('Supabase write failed: ' + error.message); }
      return settingsFromDb(data);
    },
    async getJournal() {
      const { data, error } = await sb.from('journal_entries').select('*').order('ts', { ascending: false });
      if (error) { console.error('Supabase getJournal error:', error.message); return []; }
      return (data || []).map(journalFromDb);
    },
    async addJournalEntry(entry) {
      const saved = Object.assign({ id: 'j_' + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now() }, entry);
      const { data, error } = await sb.from('journal_entries').insert(journalToDb(saved)).select().maybeSingle();
      if (error) { console.error('Supabase addJournalEntry error:', error.message); throw new Error('Supabase write failed: ' + error.message); }
      return journalFromDb(data);
    },
    async updateJournalEntry(id, patch) {
      const dbPatch = journalToDb(Object.assign({ id }, patch));
      delete dbPatch.id; delete dbPatch.ts; // never overwrite identity/creation time on a patch
      Object.keys(dbPatch).forEach((k) => { if (dbPatch[k] === undefined) delete dbPatch[k]; });
      const { data, error } = await sb.from('journal_entries').update(dbPatch).eq('id', id).select().maybeSingle();
      if (error) { console.error('Supabase updateJournalEntry error:', error.message); throw new Error('Supabase write failed: ' + error.message); }
      return journalFromDb(data);
    },
    async deleteJournalEntry(id) {
      const { error } = await sb.from('journal_entries').delete().eq('id', id);
      if (error) { console.error('Supabase deleteJournalEntry error:', error.message); throw new Error('Supabase write failed: ' + error.message); }
      return true;
    },
    async getPatterns() {
      const { data, error } = await sb.from('patterns').select('*').order('ts', { ascending: false });
      if (error) { console.error('Supabase getPatterns error:', error.message); return []; }
      return (data || []).map(patternFromDb);
    },
    async addPattern(p) {
      const saved = Object.assign({ id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now() }, p);
      const { data, error } = await sb.from('patterns').insert(patternToDb(saved)).select().maybeSingle();
      if (error) { console.error('Supabase addPattern error:', error.message); throw new Error('Supabase write failed: ' + error.message); }
      return patternFromDb(data);
    },
    async deletePattern(id) {
      const { error } = await sb.from('patterns').delete().eq('id', id);
      if (error) { console.error('Supabase deletePattern error:', error.message); throw new Error('Supabase write failed: ' + error.message); }
      return true;
    }
  };
}

const backend = USE_SUPABASE ? supabaseBackend : jsonBackend;

module.exports = backend;
module.exports.backendType = backend.type;
