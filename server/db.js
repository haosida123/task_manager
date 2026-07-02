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
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  db = seed;
  persist();
  return db;
}

// Replace the whole database with imported data (used by POST /api/import).
// The caller is expected to have validated `next`; a pre-import snapshot is
// taken so a bad import can be undone.
function replaceAll(next) {
  load();
  backupNow('preimport');
  db = {
    projects: Array.isArray(next.projects) ? next.projects : [],
    tasks: Array.isArray(next.tasks) ? next.tasks : [],
    updates: Array.isArray(next.updates) ? next.updates : [],
  };
  persist();
  return db;
}

let counter = 0;
function id(prefix) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function now() {
  return new Date().toISOString();
}

module.exports = { load, persist, reset, replaceAll, backupNow, id, now };
