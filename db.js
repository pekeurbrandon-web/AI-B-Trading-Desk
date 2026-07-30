const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const JOURNAL_FILE = path.join(DATA_DIR, 'journal.json');
const PATTERNS_FILE = path.join(DATA_DIR, 'patterns.json');

async function ensureFiles() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch (e) {}
  const ensure = async (file, fallback) => {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify(fallback, null, 2), 'utf8');
    }
  };
  await ensure(SETTINGS_FILE, { id: 1, balance: 10000, risk_pct: 1, daily_loss: 4, ai_provider: 'anthropic', consensus_mode: false });
  await ensure(JOURNAL_FILE, []);
  await ensure(PATTERNS_FILE, []);
}

function settingsFromDb(row) {
  if (!row) return { balance: 10000, riskPct: 1, dailyLoss: 4, aiProvider: 'anthropic', consensusMode: false };
  return { balance: row.balance, riskPct: row.risk_pct, dailyLoss: row.daily_loss, aiProvider: row.ai_provider, consensusMode: row.consensus_mode };
}
function settingsToDb(s) {
  return { id: 1, balance: s.balance, risk_pct: s.riskPct, daily_loss: s.dailyLoss, ai_provider: s.aiProvider, consensus_mode: s.consensusMode };
}

module.exports = {
  backendType: 'json',
  async getSettings() {
    await ensureFiles();
    const raw = await fs.readFile(SETTINGS_FILE, 'utf8');
    return settingsFromDb(JSON.parse(raw));
  },
  async setSettings(s) {
    await ensureFiles();
    const dbRow = settingsToDb(s);
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(dbRow, null, 2), 'utf8');
    return settingsFromDb(dbRow);
  },
  async getJournal() {
    await ensureFiles();
    const raw = await fs.readFile(JOURNAL_FILE, 'utf8');
    const arr = JSON.parse(raw || '[]');
    return arr.map((r) => r);
  },
  async addJournalEntry(entry) {
    await ensureFiles();
    const raw = await fs.readFile(JOURNAL_FILE, 'utf8');
    const arr = JSON.parse(raw || '[]');
    const saved = Object.assign({ id: 'j_' + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now() }, entry);
    arr.unshift(saved);
    await fs.writeFile(JOURNAL_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return saved;
  },
  async updateJournalEntry(id, patch) {
    await ensureFiles();
    const raw = await fs.readFile(JOURNAL_FILE, 'utf8');
    const arr = JSON.parse(raw || '[]');
    const idx = arr.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const updated = Object.assign({}, arr[idx], patch);
    arr[idx] = updated;
    await fs.writeFile(JOURNAL_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return updated;
  },
  async deleteJournalEntry(id) {
    await ensureFiles();
    const raw = await fs.readFile(JOURNAL_FILE, 'utf8');
    let arr = JSON.parse(raw || '[]');
    arr = arr.filter((r) => r.id !== id);
    await fs.writeFile(JOURNAL_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return true;
  },
  async getPatterns() {
    await ensureFiles();
    const raw = await fs.readFile(PATTERNS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  },
  async addPattern(p) {
    await ensureFiles();
    const raw = await fs.readFile(PATTERNS_FILE, 'utf8');
    const arr = JSON.parse(raw || '[]');
    const saved = Object.assign({ id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now() }, p);
    arr.unshift(saved);
    await fs.writeFile(PATTERNS_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return saved;
  },
  async deletePattern(id) {
    await ensureFiles();
    const raw = await fs.readFile(PATTERNS_FILE, 'utf8');
    let arr = JSON.parse(raw || '[]');
    arr = arr.filter((r) => r.id !== id);
    await fs.writeFile(PATTERNS_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return true;
  }
};
