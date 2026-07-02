require('dotenv').config();
const express = require('express');
const path    = require('path');
const { MongoClient } = require('mongodb');

const app  = express();
const PORT = process.env.PORT || 3001;
const URI  = process.env.MONGO_URI;

if (!URI) {
  console.error('[ERROR] MONGO_URI is not set in .env');
  process.exit(1);
}

// ── CORS (allow requests from any origin, needed for file:// or any port) ──
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

// ── Request logger ──────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

app.use(express.static(path.join(__dirname)));

// ── MongoDB connection ──────────────────────────────────────────────
let db;

async function connect() {
  console.log('[DB] Connecting to MongoDB...');
  const client = new MongoClient(URI);
  await client.connect();
  db = client.db('CheckCalc');
  console.log('[DB] Connected — database: CheckCalc');
}

function col(name) {
  return db.collection(name);
}

// ── API ─────────────────────────────────────────────────────────────

app.get('/api/state/:profile?', async (req, res) => {
  const profile = req.params.profile || 'default';
  console.log(`[LOAD] Loading profile "${profile}"`);
  try {
    const doc = await col('paycheck_state').findOne({ profile });
    if (!doc) {
      console.log(`[LOAD] No saved state found for "${profile}"`);
      return res.json({ ok: true, state: null });
    }
    const { _id, profile: _p, ...state } = doc;
    console.log(`[LOAD] Loaded profile "${profile}" (savedAt: ${doc.savedAt})`);
    res.json({ ok: true, state });
  } catch (err) {
    console.error('[LOAD] Error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/state/:profile?', async (req, res) => {
  const profile = req.params.profile || 'default';
  const state   = req.body;
  console.log(`[SAVE] Saving profile "${profile}" — keys: ${Object.keys(state).join(', ')}`);
  try {
    const result = await col('paycheck_state').updateOne(
      { profile },
      { $set: { profile, ...state, savedAt: new Date() } },
      { upsert: true }
    );
    const action = result.upsertedCount > 0 ? 'inserted' : 'updated';
    console.log(`[SAVE] ${action} profile "${profile}" OK`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[SAVE] Error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/profiles', async (req, res) => {
  try {
    const docs = await col('paycheck_state')
      .find({}, { projection: { profile: 1, savedAt: 1, _id: 0 } })
      .toArray();
    res.json({ ok: true, profiles: docs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Bills ────────────────────────────────────────────────────────────

app.get('/api/bills/:profile?', async (req, res) => {
  const profile = req.params.profile || 'default';
  console.log(`[BILLS LOAD] Loading bills for "${profile}"`);
  try {
    const doc = await col('bills').findOne({ profile });
    if (!doc) {
      console.log(`[BILLS LOAD] No bills found for "${profile}"`);
      return res.json({ ok: true, state: null });
    }
    const { _id, profile: _p, ...state } = doc;
    console.log(`[BILLS LOAD] Found ${state.bills?.length ?? 0} bills`);
    res.json({ ok: true, state });
  } catch (err) {
    console.error('[BILLS LOAD] Error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/bills/:profile?', async (req, res) => {
  const profile = req.params.profile || 'default';
  const state   = req.body;
  console.log(`[BILLS SAVE] Saving ${state.bills?.length ?? 0} bills for "${profile}"`);
  try {
    await col('bills').updateOne(
      { profile },
      { $set: { profile, ...state, savedAt: new Date() } },
      { upsert: true }
    );
    console.log(`[BILLS SAVE] OK`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[BILLS SAVE] Error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Start ────────────────────────────────────────────────────────────
let resolveReady;
const ready = new Promise(resolve => { resolveReady = resolve; });
module.exports = { ready };

function tryListen(port) {
  const server = app.listen(port);
  server.on('listening', () => {
    console.log(`[SERVER] Paycheck Calculator running at http://localhost:${port}`);
    resolveReady({ port });
  });
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[SERVER] Port ${port} in use, trying ${port + 1}`);
      tryListen(port + 1);
    } else {
      console.error('[SERVER] Listen error:', err.message);
      process.exit(1);
    }
  });
}

connect()
  .then(() => tryListen(PORT))
  .catch(err => {
    console.error('[ERROR] MongoDB connection failed:', err.message);
    process.exit(1);
  });
