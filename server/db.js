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
      last_updated TEXT
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
      notify_offline INTEGER
    )
  `);

  // Seed default device if missing
  const existingDevice = await get(`SELECT * FROM device WHERE id = ?`, ["TR-0042"]);
  if (!existingDevice) {
    await run(
      `INSERT INTO device (id, name, location, lat, lng, status, online, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "TR-0042",
        "Distribution Transformer 42",
        "Sector 4B, Pimpri-Chinchwad",
        18.6298,
        73.8131,
        "warning",
        1,
        new Date().toISOString(),
      ]
    );
  }

  // Seed default relay status if missing
  const existingRelay = await get(`SELECT * FROM relay_status WHERE id = ?`, ["relay-1"]);
  if (!existingRelay) {
    await run(
      `INSERT INTO relay_status (id, state, auto_trip_enabled, last_trip_reason, last_trip_at, max_temperature, max_current, max_voltage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "relay-1",
        "closed",
        1,
        "Over-temperature (92C)",
        new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        90,
        100,
        260,
      ]
    );
  }

  // Seed initial relay events if empty
  const eventCount = await get(`SELECT COUNT(*) as count FROM relay_events`);
  if (eventCount && eventCount.count === 0) {
    const now = Date.now();
    await run(
      `INSERT INTO relay_events (id, timestamp, cause, duration_minutes) VALUES (?, ?, ?, ?)`,
      ["evt-1", new Date(now - 1000 * 60 * 60 * 26).toISOString(), "Over-temperature (92C)", 14]
    );
    await run(
      `INSERT INTO relay_events (id, timestamp, cause, duration_minutes) VALUES (?, ?, ?, ?)`,
      ["evt-2", new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(), "Over-current (108A)", 6]
    );
    await run(
      `INSERT INTO relay_events (id, timestamp, cause, duration_minutes) VALUES (?, ?, ?, ?)`,
      ["evt-3", new Date(now - 1000 * 60 * 60 * 24 * 11).toISOString(), "Manual trip (maintenance)", 120]
    );
  }

  // Seed initial alerts if empty
  const alertCount = await get(`SELECT COUNT(*) as count FROM alerts`);
  if (alertCount && alertCount.count === 0) {
    const now = Date.now();
    await run(
      `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ["al-1", "critical", "High temperature", "Oil temperature reached 63C, above the 60C warning threshold.", new Date(now - 1000 * 60 * 12).toISOString(), "active"]
    );
    await run(
      `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ["al-2", "warning", "Current overload", "Load current at 96% of rated capacity.", new Date(now - 1000 * 60 * 55).toISOString(), "active"]
    );
    await run(
      `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ["al-3", "warning", "High humidity", "Enclosure humidity at 78%, above nominal range.", new Date(now - 1000 * 60 * 60 * 3).toISOString(), "acknowledged"]
    );
    await run(
      `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ["al-4", "info", "Device reconnected", "ESP32 node came back online after a 4 minute gap.", new Date(now - 1000 * 60 * 60 * 9).toISOString(), "resolved"]
    );
    await run(
      `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ["al-5", "critical", "Relay tripped", "Automatic trip triggered by over-temperature protection.", new Date(now - 1000 * 60 * 60 * 26).toISOString(), "resolved"]
    );
  }

  // Seed initial telemetry points if empty
  const telemetryCount = await get(`SELECT COUNT(*) as count FROM telemetry`);
  if (telemetryCount && telemetryCount.count === 0) {
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const timestamp = new Date(now - i * 3600 * 1000).toISOString();
      const v = 228 + Math.random() * 6;
      const c = 40 + Math.random() * 8;
      const t = 52 + Math.random() * 10;
      const h = 45 + Math.random() * 6;
      await run(
        `INSERT INTO telemetry (voltage, current, temperature, humidity, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [+v.toFixed(1), +c.toFixed(1), +t.toFixed(1), +h.toFixed(1), timestamp]
      );
    }
  }

  // Seed settings if missing
  const existingSettings = await get(`SELECT * FROM settings WHERE id = ?`, ["settings-1"]);
  if (!existingSettings) {
    await run(
      `INSERT INTO settings (id, theme, language, notify_critical, notify_warning, notify_offline) VALUES (?, ?, ?, ?, ?, ?)`,
      ["settings-1", "dark", "English", 1, 1, 0]
    );
  }

  console.log("[SQLite] Database initialized and seeded successfully.");
}

export default db;
