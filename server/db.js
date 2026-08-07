import sqlite3 from "sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "transformer.db");
const db = new sqlite3.Database(dbPath);

const DEFAULT_BLYNK_TOKEN = "uR3iUqcSJMTS7-OEfnsuSDj-5Sqrxl0L";
const DEFAULT_TEMPLATE_NAME = "Smart Transformer";

// Helper promise wrappers for sqlite3
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function initDb() {
  db.serialize();

  // Create tables
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      role TEXT,
      created_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS device (
      id TEXT PRIMARY KEY,
      name TEXT,
      location TEXT,
      lat REAL,
      lng REAL,
      status TEXT,
      online INTEGER,
      last_updated TEXT,
      google_maps_link TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voltage REAL,
      current REAL,
      temperature REAL,
      humidity REAL,
      timestamp TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS relay_status (
      id TEXT PRIMARY KEY,
      state TEXT,
      auto_trip_enabled INTEGER,
      last_trip_reason TEXT,
      last_trip_at TEXT,
      max_temperature REAL,
      max_current REAL,
      max_voltage REAL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS relay_events (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      cause TEXT,
      duration_minutes INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      severity TEXT,
      title TEXT,
      description TEXT,
      timestamp TEXT,
      status TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      theme TEXT,
      language TEXT,
      notify_critical INTEGER,
      notify_warning INTEGER,
      notify_offline INTEGER,
      blynk_auth_token TEXT
    )
  `);

  try {
    await run(`ALTER TABLE settings ADD COLUMN blynk_auth_token TEXT`);
  } catch {
    // Column already exists
  }

  try {
    await run(`ALTER TABLE device ADD COLUMN google_maps_link TEXT`);
  } catch {
    // Column already exists
  }

  // Reset device coordinates to 18.650029, 73.745274
  await run(`UPDATE device SET lat = 18.650029, lng = 73.745274, status = ?, name = ?, google_maps_link = ? WHERE id = ?`, [
    "normal",
    DEFAULT_TEMPLATE_NAME,
    "https://www.google.com/maps?q=18.650029,73.745274",
    "TR-0042",
  ]);

  // Seed default relay status with 50A threshold limit for presentation
  const existingRelay = await get(`SELECT * FROM relay_status WHERE id = ?`, ["relay-1"]);
  if (!existingRelay) {
    await run(
      `INSERT INTO relay_status (id, state, auto_trip_enabled, last_trip_reason, last_trip_at, max_temperature, max_current, max_voltage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "relay-1",
        "closed",
        0,
        "System Nominal",
        new Date().toISOString(),
        90,
        50.0,
        260,
      ]
    );
  } else {
    await run(`UPDATE relay_status SET state = ?, auto_trip_enabled = 0, max_current = ? WHERE id = ?`, [
      "closed",
      50.0,
      "relay-1",
    ]);
  }

  // Seed settings with user's Blynk Auth Token
  const existingSettings = await get(`SELECT * FROM settings WHERE id = ?`, ["settings-1"]);
  if (!existingSettings) {
    await run(
      `INSERT INTO settings (id, theme, language, notify_critical, notify_warning, notify_offline, blynk_auth_token) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["settings-1", "dark", "English", 1, 1, 0, DEFAULT_BLYNK_TOKEN]
    );
  } else {
    await run(`UPDATE settings SET blynk_auth_token = ? WHERE id = ?`, [DEFAULT_BLYNK_TOKEN, "settings-1"]);
  }

  console.log(`[SQLite] Database initialized with location 18.650029, 73.745274.`);
}

export default db;
