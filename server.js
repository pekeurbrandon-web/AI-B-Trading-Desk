require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_TOKEN = process.env.APP_ACCESS_TOKEN || '';

app.use(express.json({ limit: '15mb' })); // chart screenshots as base64 need real headroom
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- API keys stay in their own small local file ----------------
// Deliberately NOT migrated to Supabase along with settings/journal/patterns: these are
// server secrets, not application data, and keeping them local avoids ever putting a raw
// API key in a database (even your own) unnecessarily.
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const KEYS_FILE = path.join(DATA_DIR, 'keys.json');
function readKeysFile() {
  try { return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')); }
  catch (e) { return {}; }
}
function writeKeysFile(obj) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(obj, null, 2));
}

let runtimeKeys = readKeysFile();
function getAnthropicKey() { return runtimeKeys.anthropic || process.env.ANTHROPIC_API_KEY || ''; }
function getOpenAIKey() { return runtimeKeys.openai || process.env.OPENAI_API_KEY || ''; }
function getOpenRouterKey() { return runtimeKeys.openrouter || process.env.OPENROUTER_API_KEY || ''; }
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

if (!getAnthropicKey()) {
  console.warn('\n⚠  No Anthropic API key set (.env or Settings UI) — the Anthropic provider will fail until you add one.\n');
}
if (!getOpenAIKey()) {
  console.warn('\nℹ  No OpenAI API key set — OpenAI is optional. Add one in Settings if you want to use it as a provider.\n');
}
if (!getOpenRouterKey()) {
  console.warn('\nℹ  No OpenRouter API key set — OpenRouter is optional. It gives access to many more model families (Google, Meta, DeepSeek, Mistral, etc.) through one key, if you want it.\n');
}
if (!ACCESS_TOKEN) {
  console.warn('\n⚠  APP_ACCESS_TOKEN is not set in .env — the API is running WITHOUT auth. Anyone who finds this URL can use your API keys and see your data. Set APP_ACCESS_TOKEN before deploying anywhere public.\n');
}
console.log('Data backend: ' + db.backendType + (db.backendType === 'json' ? ' (./data/*.json — set SUPABASE_URL + SUPABASE_SERVICE_KEY to switch to Supabase)' : ' (Supabase)'));

// ---------------- lightweight call logging ----------------
// Real observability, honestly scoped: a capped log of every AI call (provider, model,
// latency, success/failure) — not a fake "enterprise telemetry platform." Capped at 300
// entries so it can't grow unbounded on a personal server.
const LOG_FILE = path.join(DATA_DIR, 'call-log.json');
function readCallLog() {
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); }
  catch (e) { return []; }
}
function logCall(entry) {
  const log = readCallLog();
  log.unshift(Object.assign({ ts: Date.now() }, entry));
  if (log.length > 300) log.length = 300;
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// ---------------- auth middleware ----------------
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
function requireAuth(req, res, next) {
  if (!ACCESS_TOKEN) return next(); // dev mode only — warned loudly above
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token && safeEqual(token, ACCESS_TOKEN)) return next();
  res.status(401).json({ error: 'Unauthorized — invalid or missing access token' });
}
// ---------------- health check (no auth — lets you verify setup before you even have a token) ----------------
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    anthropicKeyConfigured: !!getAnthropicKey(),
    openaiKeyConfigured: !!getOpenAIKey(),
    openrouterKeyConfigured: !!getOpenRouterKey(),
    authConfigured: !!ACCESS_TOKEN,
    dataBackend: db.backendType
  });
});

app.use('/api', requireAuth);

// ---------------- API key configuration (settable from the app, not just .env) ----------------
function maskKey(k) {
  if (!k) return '';
  if (k.length <= 8) return '••••';
  return k.slice(0, 4) + '••••••••' + k.slice(-4);
}
function keyInfo(provider, getter, envVarName) {
  return { configured: !!getter(), masked: maskKey(getter()), source: runtimeKeys[provider] ? 'settings' : (process.env[envVarName] ? 'env' : 'none') };
}
app.get('/api/config/keys', (req, res) => {
  res.json({
    anthropic: keyInfo('anthropic', getAnthropicKey, 'ANTHROPIC_API_KEY'),
    openai: keyInfo('openai', getOpenAIKey, 'OPENAI_API_KEY'),
    openrouter: keyInfo('openrouter', getOpenRouterKey, 'OPENROUTER_API_KEY')
  });
});
app.put('/api/config/keys', (req, res) => {
  ['anthropic', 'openai', 'openrouter'].forEach((p) => {
    if (typeof req.body[p] === 'string' && req.body[p].trim()) runtimeKeys[p] = req.body[p].trim();
  });
  writeKeysFile(runtimeKeys);
  res.json({
    anthropic: keyInfo('anthropic', getAnthropicKey, 'ANTHROPIC_API_KEY'),
    openai: keyInfo('openai', getOpenAIKey, 'OPENAI_API_KEY'),
    openrouter: keyInfo('openrouter', getOpenRouterKey, 'OPENROUTER_API_KEY')
  });
});
app.delete('/api/config/keys/:provider', (req, res) => {
  var p = req.params.provider;
  if (!['anthropic', 'openai', 'openrouter'].includes(p)) return res.status(400).json({ error: 'provider must be anthropic, openai, or openrouter' });
  delete runtimeKeys[p];
  writeKeysFile(runtimeKeys);
  var envVarName = p === 'anthropic' ? 'ANTHROPIC_API_KEY' : (p === 'openai' ? 'OPENAI_API_KEY' : 'OPENROUTER_API_KEY');
  res.json({ ok: true, fellBackToEnv: !!process.env[envVarName] });
});

// ---------------- settings ----------------
app.get('/api/settings', async (req, res) => {
  try { res.json(await db.getSettings()); }
  catch (e) { console.error('getSettings error:', e); res.status(500).json({ error: 'Could not load settings' }); }
});
app.put('/api/settings', async (req, res) => {
  try { res.json(await db.setSettings(req.body)); }
  catch (e) { console.error('setSettings error:', e); res.status(500).json({ error: 'Could not save settings' }); }
});

// ---------------- journal ----------------
app.get('/api/journal', async (req, res) => {
  try { res.json(await db.getJournal()); }
  catch (e) { console.error('getJournal error:', e); res.status(500).json({ error: 'Could not load journal' }); }
});
app.post('/api/journal', async (req, res) => {
  try { res.json(await db.addJournalEntry(req.body)); }
  catch (e) { console.error('addJournalEntry error:', e); res.status(500).json({ error: 'Could not save journal entry' }); }
});
app.put('/api/journal/:id', async (req, res) => {
  try {
    const updated = await db.updateJournalEntry(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json(updated);
  } catch (e) { console.error('updateJournalEntry error:', e); res.status(500).json({ error: 'Could not update journal entry' }); }
});
app.delete('/api/journal/:id', async (req, res) => {
  try { await db.deleteJournalEntry(req.params.id); res.json({ ok: true }); }
  catch (e) { console.error('deleteJournalEntry error:', e); res.status(500).json({ error: 'Could not delete journal entry' }); }
});

// ---------------- pattern library ----------------
app.get('/api/patterns', async (req, res) => {
  try { res.json(await db.getPatterns()); }
  catch (e) { console.error('getPatterns error:', e); res.status(500).json({ error: 'Could not load patterns' }); }
});
app.post('/api/patterns', async (req, res) => {
  try { res.json(await db.addPattern(req.body)); }
  catch (e) { console.error('addPattern error:', e); res.status(500).json({ error: 'Could not save pattern' }); }
});
app.delete('/api/patterns/:id', async (req, res) => {
  try { await db.deletePattern(req.params.id); res.json({ ok: true }); }
  catch (e) { console.error('deletePattern error:', e); res.status(500).json({ error: 'Could not delete pattern' }); }
});

// ---------------- AI provider adapters ----------------
// All normalized to the same { ok, text } shape so the route (and the frontend) don't
// need to know which provider answered. These are the ONLY places that talk to any API.
async function callAnthropic(content, maxTokens) {
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getAnthropicKey(),
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: [{ role: 'user', content } ] })
  });
  const data = await upstream.json();
  if (!upstream.ok) return { ok: false, status: upstream.status, error: data };
  const text = (data.content || []).map((b) => b.text || '').join('\n');
  return { ok: true, text, model: 'claude-sonnet-4-6' };
}

function translateToOpenAIContent(content) {
  return content.map((block) => {
    if (block.type === 'image') {
      return { type: 'image_url', image_url: { url: 'data:' + block.source.media_type + ';base64,' + block.source.data } };
    }
    return { type: 'text', text: block.text };
  });
}

async function callOpenAI(content, maxTokens) {
  const translated = translateToOpenAIContent(content);
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getOpenAIKey() },
    body: JSON.stringify({ model: 'gpt-4o', max_tokens: maxTokens, messages: [{ role: 'user', content: translated }] })
  });
  const data = await upstream.json();
  if (!upstream.ok) return { ok: false, status: upstream.status, error: data };
  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  return { ok: true, text, model: 'gpt-4o' };
}

async function callOpenRouter(content, maxTokens) {
  // OpenRouter speaks the same chat/vision format as OpenAI, so the same translation applies.
  // One key here gives access to many model families (Google, Meta, Mistral, DeepSeek, etc.)
  // without a bespoke adapter per provider.
  const translated = translateToOpenAIContent(content);
  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getOpenRouterKey() },
    body: JSON.stringify({ model: OPENROUTER_MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: translated }] })
  });
  const data = await upstream.json();
  if (!upstream.ok) return { ok: false, status: upstream.status, error: data };
  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  return { ok: true, text, model: OPENROUTER_MODEL };
}

const PROVIDER_ADAPTERS = { anthropic: callAnthropic, openai: callOpenAI, openrouter: callOpenRouter };
const PROVIDER_KEY_CHECKS = { anthropic: getAnthropicKey, openai: getOpenAIKey, openrouter: getOpenRouterKey };
const VALID_PROVIDERS = ['anthropic', 'openai', 'openrouter'];

// Single entry point for every non-consensus AI call. Logs every attempt (success or
// failure) and, if enabled, automatically retries with the next configured provider
// on failure — "no user intervention required" per the failover requirement, but the
// response always says plainly if a fallback was used, never silently.
async function callProviderWithFailover(primaryProvider, content, maxTokens, allowFailover) {
  const order = [primaryProvider].concat(VALID_PROVIDERS.filter((p) => p !== primaryProvider));
  const attempted = [];
  for (const provider of order) {
    if (!PROVIDER_KEY_CHECKS[provider]()) continue; // skip providers with no key configured
    const start = Date.now();
    let result;
    try {
      result = await PROVIDER_ADAPTERS[provider](content, maxTokens);
    } catch (e) {
      result = { ok: false, error: String(e && e.message || e) };
    }
    const latencyMs = Date.now() - start;
    attempted.push(provider);
    logCall({ provider, model: result.model || null, ok: result.ok, latencyMs, error: result.ok ? null : JSON.stringify(result.error).slice(0, 300) });
    if (result.ok) {
      return { ok: true, text: result.text, provider, model: result.model, failedOver: attempted.length > 1, attempted };
    }
    if (!allowFailover) {
      return { ok: false, status: result.status, error: result.error, provider, attempted };
    }
    // allowFailover: loop continues to the next configured provider
  }
  return { ok: false, status: 500, error: { message: attempted.length ? 'All configured providers failed.' : 'No provider is configured — add an API key in Settings.' }, provider: primaryProvider, attempted };
}

// ---------------- AI proxy (provider-selectable: anthropic, openai, openrouter, or both at once) ----------------
app.post('/api/claude', async (req, res) => {
  const requested = req.body.provider;
  const provider = requested === 'both' ? 'both' : (VALID_PROVIDERS.includes(requested) ? requested : 'anthropic');
  const maxTokens = Math.min(Number(req.body.max_tokens) || 1000, 1000);
  const allowFailover = req.body.failover !== false; // opt-out, defaults on

  if (provider === 'both') {
    if (!getAnthropicKey() || !getOpenAIKey()) {
      return res.status(500).json({ error: 'Consensus mode needs both an Anthropic and an OpenAI key — set them in Settings or .env.' });
    }
    try {
      const startA = Date.now(), startO = Date.now();
      const [aRes, oRes] = await Promise.all([callAnthropic(req.body.content, maxTokens), callOpenAI(req.body.content, maxTokens)]);
      logCall({ provider: 'anthropic', model: aRes.model || null, ok: aRes.ok, latencyMs: Date.now() - startA, error: aRes.ok ? null : JSON.stringify(aRes.error).slice(0, 300), consensus: true });
      logCall({ provider: 'openai', model: oRes.model || null, ok: oRes.ok, latencyMs: Date.now() - startO, error: oRes.ok ? null : JSON.stringify(oRes.error).slice(0, 300), consensus: true });
      res.json({
        results: [
          { provider: 'anthropic', ok: aRes.ok, text: aRes.ok ? aRes.text : null, error: aRes.ok ? null : aRes.error },
          { provider: 'openai', ok: oRes.ok, text: oRes.ok ? oRes.text : null, error: oRes.ok ? null : oRes.error }
        ]
      });
    } catch (e) {
      console.error('AI proxy error (both):', e);
      res.status(502).json({ error: 'Upstream request failed in consensus mode' });
    }
    return;
  }

  if (!VALID_PROVIDERS.some((p) => PROVIDER_KEY_CHECKS[p]())) {
    return res.status(500).json({ error: 'No AI provider is configured — add at least one API key in Settings.' });
  }

  try {
    const result = await callProviderWithFailover(provider, req.body.content, maxTokens, allowFailover);
    if (!result.ok) {
      return res.status(result.status || 502).json({ error: 'AI request failed', detail: result.error, attempted: result.attempted });
    }
    res.json({ content: [{ type: 'text', text: result.text }], provider: result.provider, model: result.model, failedOver: result.failedOver, attempted: result.attempted });
  } catch (e) {
    console.error('AI proxy error (' + provider + '):', e);
    res.status(502).json({ error: 'Upstream request to ' + provider + ' failed' });
  }
});

// ---------------- call log viewer ----------------
app.get('/api/logs', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 300);
  res.json(readCallLog().slice(0, limit));
});

app.listen(PORT, () => {
  console.log('\nAI-B Trading Desk running at http://localhost:' + PORT + '\n');
});
