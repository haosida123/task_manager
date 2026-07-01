'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEED_FILE = path.join(__dirname, 'seed.json');

function ensureLoaded() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seed = fs.readFileSync(SEED_FILE, 'utf8');
    fs.writeFileSync(DB_FILE, seed);
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
}

// Reset the database back to the seed data (used by POST /api/reset).
function reset() {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  db = seed;
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

module.exports = { load, persist, reset, id, now };
