'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEED_FILE = path.join(__dirname, 'seed.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 30;

function ensureLoaded() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seed = fs.readFileSync(SEED_FILE, 'utf8');
    fs.writeFileSync(DB_FILE, seed);
  }
}

// --- Local backups ---------------------------------------------------------
// Best-effort, self-pruning snapshots under data/backups/. They never throw:
// a failed backup must not block a save.

function pruneBackups() {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    files.slice(MAX_BACKUPS).forEach((x) => fs.unlinkSync(path.join(BACKUP_DIR, x.f)));
  } catch {
    /* ignore */
  }
}

// Write a snapshot of the current db. `tag` gives it a stable name (e.g.
// 'preimport'); otherwise it is stamped with a full timestamp.
function backupNow(tag) {
  try {
    if (!db) return null;
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    const name = `db-${stamp}${tag ? '-' + tag : ''}.json`;
    fs.writeFileSync(path.join(BACKUP_DIR, name), JSON.stringify(db, null, 2));
    pruneBackups();
    return name;
  } catch {
    return null;
  }
}

// Keep one snapshot of the first save of each calendar day, so an accidental
// bad edit later in the day can always be rolled back to the morning's state.
function dailyBackup() {
  try {
    if (!db) return;
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const file = path.join(BACKUP_DIR, `db-${day}.json`);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(db, null, 2));
      pruneBackups();
    }
  } catch {
    /* ignore */
  }
}

let db = null;

function load() {
  ensureLoaded();
  if (!db) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  // guarantee shape
  db.projects = db.projects || [];
  db.tasks = db.tasks || [];
  db.updates = db.updates || [];
  db.settings = db.settings || {};
  return db;
}

function persist() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE); // atomic on same filesystem
  dailyBackup();
}

// Reset the database back to the seed data (used by POST /api/reset).
function reset() {
  load();
  backupNow('prereset');
  const prevSettings = db.settings || {};
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  db = seed;
  db.settings = prevSettings; // settings are machine config, not portfolio data
  persist();
  return db;
}

// Replace the whole database with imported data (used by POST /api/import).
// The caller is expected to have validated `next`; a pre-import snapshot is
// taken so a bad import can be undone.
function replaceAll(next) {
  load();
  backupNow('preimport');
  const prevSettings = db.settings || {};
  db = {
    projects: Array.isArray(next.projects) ? next.projects : [],
    tasks: Array.isArray(next.tasks) ? next.tasks : [],
    updates: Array.isArray(next.updates) ? next.updates : [],
    settings: prevSettings, // keep this machine's backup config across restores
  };
  persist();
  return db;
}

// --- Read-only data sources (for the ledger source switcher) ---------------
// Preview the live db, the packaged seed, or any local backup snapshot without
// touching the live data.

// Coerce any parsed object into the canonical {projects,tasks,updates} shape.
function shape(obj) {
  return {
    projects: Array.isArray(obj && obj.projects) ? obj.projects : [],
    tasks: Array.isArray(obj && obj.tasks) ? obj.tasks : [],
    updates: Array.isArray(obj && obj.updates) ? obj.updates : [],
  };
}

function safeProjectCount(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data.projects) ? data.projects.length : 0;
  } catch {
    return 0;
  }
}

// List the sources available to preview: live db, seed, and backups (newest first).
function listSources() {
  const sources = [
    { id: 'live', kind: 'live', file: null, savedAt: null, count: load().projects.length },
    { id: 'seed', kind: 'seed', file: null, savedAt: null, count: safeProjectCount(SEED_FILE) },
  ];
  try {
    fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
      .forEach(({ f, t }) => {
        sources.push({
          id: `backup:${f}`,
          kind: 'backup',
          file: f,
          savedAt: new Date(t).toISOString(),
          count: safeProjectCount(path.join(BACKUP_DIR, f)),
        });
      });
  } catch {
    /* no backups yet */
  }
  return sources;
}

// Read a source's data WITHOUT mutating the live db. Returns the canonical
// shape, or null for an unknown / unsafe source id.
function readSource(sourceId) {
  if (!sourceId || sourceId === 'live') return shape(load());
  if (sourceId === 'seed') {
    try {
      return shape(JSON.parse(fs.readFileSync(SEED_FILE, 'utf8')));
    } catch {
      return null;
    }
  }
  if (sourceId.startsWith('backup:')) {
    const name = path.basename(sourceId.slice('backup:'.length)); // strip path traversal
    if (!name.endsWith('.json')) return null;
    const file = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(file)) return null;
    try {
      return shape(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch {
      return null;
    }
  }
  return null;
}

// --- Settings (stored inside the database) ---------------------------------

function getSettings() {
  return { backupDir: load().settings.backupDir || null };
}

// Merge a partial settings patch and persist. Returns the full settings object.
function updateSettings(patch) {
  load();
  db.settings = { ...db.settings, ...patch };
  persist();
  return getSettings();
}

// Report whether a directory exists and is writable (non-fatal diagnostics).
function dirStatus(dir) {
  if (!dir) return { configured: false, exists: false, writable: false };
  try {
    const ok = fs.statSync(dir).isDirectory();
    if (!ok) return { configured: true, exists: false, writable: false };
    fs.accessSync(dir, fs.constants.W_OK);
    return { configured: true, exists: true, writable: true };
  } catch {
    return { configured: true, exists: fs.existsSync(dir), writable: false };
  }
}

// Write a portable, re-importable snapshot into an external folder (e.g. a
// cloud-synced OneDrive/Drive directory). Best-effort: returns {ok,path|error}.
function backupToDir(dir) {
  if (!dir) return { ok: false, error: 'No backup folder configured.' };
  try {
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    const dest = path.join(dir, `research-ledger-backup-${stamp}.json`);
    const cur = load();
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: cur.projects,
      tasks: cur.tasks,
      updates: cur.updates,
    };
    fs.writeFileSync(dest, JSON.stringify(payload, null, 2));
    return { ok: true, path: dest };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

let counter = 0;
function id(prefix) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function now() {
  return new Date().toISOString();
}

module.exports = {
  load,
  persist,
  reset,
  replaceAll,
  backupNow,
  backupToDir,
  listSources,
  readSource,
  getSettings,
  updateSettings,
  dirStatus,
  id,
  now,
};
