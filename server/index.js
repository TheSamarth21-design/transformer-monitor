import express from "express";
import cors from "cors";
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { initDb, run, get, all } from "./db.js";
import { processTelemetryProtection } from "./protectionEngine.js";
import { startBlynkPoller, setBlynkRelayState, pollBlynkCloud } from "./blynk.js";
import { syncTelemetryToFirestore, logAlertToFirestore } from "./firebase.js";
import { processMlPredictiveAnalysis } from "./mlEngine.js";
import authRouter from "./auth.js";
import { startReplicationLoop, getReplicationMetrics, queueTelemetryLocally } from "./replicationEngine.js";

const JWT_SECRET = process.env.JWT_SECRET || "transformer_super_secret_jwt_key_2026";
const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// Broadcast helper function for WebSocket clients
function broadcast(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  ws.send(JSON.stringify({ type: "CONNECTED", message: "Connected to Transformer Monitor WS" }));

  ws.on("close", () => {
    console.log("[WS] Client disconnected");
  });
});

// Mount Authentication Router (/api/auth/register, /api/auth/login, /api/auth/me)
app.use("/api/auth", authRouter);

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Health check & Replication status
app.get("/api/health", async (req, res) => {
  const metrics = await getReplicationMetrics();
  res.json({ status: "ok", timestamp: new Date().toISOString(), replication: metrics });
});

app.get("/api/replication/status", async (req, res) => {
  const metrics = await getReplicationMetrics();
  res.json(metrics);
});

// ML Predictive Maintenance Endpoint
app.get("/api/analytics/predictive", async (req, res) => {
  try {
    const latest = await get(`SELECT voltage, current, temperature, humidity, timestamp FROM telemetry ORDER BY id DESC LIMIT 1`);
    const history = await all(`SELECT voltage, current, temperature, humidity, timestamp FROM telemetry ORDER BY id DESC LIMIT 20`);
    
    const reading = latest || {
      voltage: 0,
      current: 0,
      temperature: 0,
      humidity: 0,
      timestamp: new Date().toISOString(),
    };

    const mlAnalysis = processMlPredictiveAnalysis(reading, history);
    res.json(mlAnalysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Blynk Config Routes
app.get("/api/blynk/config", async (req, res) => {
  try {
    const settings = await get(`SELECT blynk_auth_token FROM settings WHERE id = ?`, ["settings-1"]);
    res.json({ authToken: settings?.blynk_auth_token || "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/blynk/config", async (req, res) => {
  try {
    const { authToken } = req.body;
    await run(`UPDATE settings SET blynk_auth_token = ? WHERE id = ?`, [authToken || "", "settings-1"]);
    pollBlynkCloud(broadcast);
    res.json({ success: true, authToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Test 2A Overload Emergency Alert Route
app.post("/api/test-emergency-alert", async (req, res) => {
  try {
    const now = new Date().toISOString();
    const alertId = `al-${Date.now()}`;
    const device = await get(`SELECT * FROM device WHERE id = ?`, ["TR-0042"]);

    const tripReason = "Critical Over-current Overload (3.5A > 2.0A Safety Limit)";

    await run(`UPDATE relay_status SET state = ?, last_trip_reason = ?, last_trip_at = ? WHERE id = ?`, [
      "tripped",
      tripReason,
      now,
      "relay-1",
    ]);

    const newAlert = {
      id: alertId,
      severity: "critical",
      title: "⚡ CRITICAL EMERGENCY: Transformer Overload Detected",
      description: `Over-current overload detected on ${device?.name || "Smart Transformer"}: ${tripReason}`,
      timestamp: now,
      status: "active",
    };

    await run(
      `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [alertId, newAlert.severity, newAlert.title, newAlert.description, now, "active"]
    );

    await run(`UPDATE device SET status = ? WHERE id = ?`, ["critical", "TR-0042"]);

    // Sync alert to Firestore
    logAlertToFirestore(newAlert);

    broadcast({
      type: "EMERGENCY_POPUP_ALERT",
      data: {
        alertId,
        deviceId: device?.id || "TR-0042",
        deviceName: device?.name || "Smart Transformer",
        location: device?.location || "Sector 4B, Pimpri-Chinchwad",
        lat: device?.lat || 18.650029,
        lng: device?.lng || 73.745274,
        googleMapUrl: device?.google_maps_link || `https://www.google.com/maps?q=18.650029,73.745274`,
        cause: tripReason,
        timestamp: now,
        voltage: 231,
        current: 3.5,
        temperature: 64,
        humidity: 48,
        relayState: "tripped",
      },
    });

    res.json({ success: true, message: "Emergency alert test triggered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Device Routes
app.get("/api/device", async (req, res) => {
  try {
    const dev = await get(`SELECT * FROM device WHERE id = ?`, ["TR-0042"]);
    res.json({
      id: dev.id,
      name: dev.name,
      location: dev.location,
      lat: dev.lat,
      lng: dev.lng,
      status: dev.status,
      online: Boolean(dev.online),
      lastUpdated: dev.last_updated,
      googleMapsLink: dev.google_maps_link || `https://www.google.com/maps?q=${dev.lat},${dev.lng}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/device", async (req, res) => {
  try {
    const { name, location, lat, lng, googleMapsLink } = req.body;
    const now = new Date().toISOString();
    await run(
      `UPDATE device SET 
        name = COALESCE(?, name), 
        location = COALESCE(?, location), 
        lat = COALESCE(?, lat), 
        lng = COALESCE(?, lng), 
        google_maps_link = COALESCE(?, google_maps_link),
        last_updated = ? 
       WHERE id = ?`,
      [name, location, lat, lng, googleMapsLink, now, "TR-0042"]
    );
    const updated = await get(`SELECT * FROM device WHERE id = ?`, ["TR-0042"]);
    broadcast({ type: "DEVICE_UPDATED", data: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Telemetry Ingestion & Query Routes
app.post("/api/telemetry", async (req, res) => {
  try {
    const { voltage, current, temperature, humidity } = req.body;
    if (voltage === undefined || current === undefined || temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: "Missing required telemetry fields" });
    }

    const timestamp = req.body.timestamp || new Date().toISOString();
    await run(
      `INSERT INTO telemetry (voltage, current, temperature, humidity, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [voltage, current, temperature, humidity, timestamp]
    );

    const reading = { voltage, current, temperature, humidity, timestamp };
    const mlAnalysis = processMlPredictiveAnalysis(reading);

    // Sync to Firestore Cloud Storage with WAL fallback queue
    try {
      syncTelemetryToFirestore(reading);
    } catch {
      queueTelemetryLocally(reading);
    }

    const protectionResult = await processTelemetryProtection(reading, broadcast);
    await run(`UPDATE device SET online = 1, last_updated = ? WHERE id = ?`, [timestamp, "TR-0042"]);

    broadcast({
      type: "LIVE_READING",
      data: {
        ...reading,
        mlAnalysis,
      },
    });

    res.json({ success: true, reading, mlAnalysis, protectionResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/telemetry/live", async (req, res) => {
  try {
    const latest = await get(`SELECT voltage, current, temperature, humidity, timestamp FROM telemetry ORDER BY id DESC LIMIT 1`);
    const history = await all(`SELECT voltage, current, temperature, humidity, timestamp FROM telemetry ORDER BY id DESC LIMIT 20`);
    const dev = await get(`SELECT * FROM device WHERE id = ?`, ["TR-0042"]);

    const reading = latest || {
      voltage: 0,
      current: 0,
      temperature: 0,
      humidity: 0,
      timestamp: new Date().toISOString(),
    };

    const mlAnalysis = processMlPredictiveAnalysis(reading, history);

    res.json({
      ...reading,
      lat: dev?.lat || 0,
      lng: dev?.lng || 0,
      googleMapUrl: dev?.google_maps_link,
      mlAnalysis,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/telemetry/history", async (req, res) => {
  try {
    const range = req.query.range || "day";
    const limit = range === "day" ? 24 : range === "week" ? 7 : range === "month" ? 30 : 12;

    const rows = await all(`SELECT voltage, current, temperature, humidity, timestamp FROM telemetry ORDER BY id DESC LIMIT ?`, [limit * 10]);
    const reversed = rows.reverse();

    const step = Math.max(1, Math.floor(reversed.length / limit));
    const points = [];

    for (let i = 0; i < reversed.length && points.length < limit; i += step) {
      const item = reversed[i];
      const d = new Date(item.timestamp);
      let label = `${d.getHours()}:00`;
      if (range === "week" || range === "month") {
        label = `Day ${points.length + 1}`;
      } else if (range === "year") {
        label = `Month ${points.length + 1}`;
      }

      points.push({
        time: label,
        voltage: item.voltage,
        current: item.current,
        temperature: item.temperature,
        humidity: item.humidity,
      });
    }

    res.json(points);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Relay Routes
app.get("/api/relay/status", async (req, res) => {
  try {
    const relay = await get(`SELECT * FROM relay_status WHERE id = ?`, ["relay-1"]);
    res.json({
      state: relay.state,
      autoTripEnabled: Boolean(relay.auto_trip_enabled),
      lastTripReason: relay.last_trip_reason,
      lastTripAt: relay.last_trip_at,
      thresholds: {
        maxTemperature: relay.max_temperature,
        maxCurrent: relay.max_current || 50.0,
        maxVoltage: relay.max_voltage,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/relay/trip", async (req, res) => {
  try {
    const reason = req.body.reason || "Manual trip (operator action)";
    const now = new Date().toISOString();
    const eventId = `evt-${Date.now()}`;

    await run(`UPDATE relay_status SET state = ?, last_trip_reason = ?, last_trip_at = ? WHERE id = ?`, [
      "tripped",
      reason,
      now,
      "relay-1",
    ]);

    setBlynkRelayState("tripped");

    const event = { id: eventId, timestamp: now, cause: reason, durationMinutes: 0 };
    await run(`INSERT INTO relay_events (id, timestamp, cause, duration_minutes) VALUES (?, ?, ?, ?)`, [
      eventId,
      now,
      reason,
      0,
    ]);

    await run(`UPDATE device SET status = ? WHERE id = ?`, ["critical", "TR-0042"]);

    const updated = await get(`SELECT * FROM relay_status WHERE id = ?`, ["relay-1"]);
    broadcast({ type: "RELAY_STATUS_CHANGED", data: updated });

    res.json({ success: true, state: "tripped", reason });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/relay/reset", async (req, res) => {
  try {
    await run(`UPDATE relay_status SET state = ? WHERE id = ?`, ["closed", "relay-1"]);
    await run(`UPDATE device SET status = ? WHERE id = ?`, ["normal", "TR-0042"]);

    setBlynkRelayState("closed");

    const lastEvent = await get(`SELECT * FROM relay_events ORDER BY rowid DESC LIMIT 1`);
    if (lastEvent && lastEvent.duration_minutes === 0) {
      const tripTime = new Date(lastEvent.timestamp).getTime();
      const duration = Math.max(1, Math.round((Date.now() - tripTime) / (1000 * 60)));
      await run(`UPDATE relay_events SET duration_minutes = ? WHERE id = ?`, [duration, lastEvent.id]);
    }

    const updated = await get(`SELECT * FROM relay_status WHERE id = ?`, ["relay-1"]);
    broadcast({ type: "RELAY_STATUS_CHANGED", data: updated });

    res.json({ success: true, state: "closed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/relay/thresholds", async (req, res) => {
  try {
    const { maxTemperature, maxCurrent, maxVoltage, autoTripEnabled } = req.body;
    await run(
      `UPDATE relay_status SET 
        max_temperature = COALESCE(?, max_temperature),
        max_current = COALESCE(?, max_current),
        max_voltage = COALESCE(?, max_voltage),
        auto_trip_enabled = COALESCE(?, auto_trip_enabled)
       WHERE id = ?`,
      [
        maxTemperature,
        maxCurrent,
        maxVoltage,
        autoTripEnabled !== undefined ? (autoTripEnabled ? 1 : 0) : null,
        "relay-1",
      ]
    );

    const updated = await get(`SELECT * FROM relay_status WHERE id = ?`, ["relay-1"]);
    broadcast({ type: "THRESHOLDS_UPDATED", data: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/relay/events", async (req, res) => {
  try {
    const events = await all(`SELECT id, timestamp, cause, duration_minutes as durationMinutes FROM relay_events ORDER BY rowid DESC LIMIT 50`);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alert Routes
app.get("/api/alerts", async (req, res) => {
  try {
    const alerts = await all(`SELECT * FROM alerts ORDER BY rowid DESC`);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/alerts", async (req, res) => {
  try {
    const { severity, title, description } = req.body;
    const id = `al-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newAlert = { id, severity: severity || "info", title, description, timestamp, status: "active" };

    await run(
      `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, newAlert.severity, title, description, timestamp, "active"]
    );

    logAlertToFirestore(newAlert);
    broadcast({ type: "NEW_ALERT", data: newAlert });
    res.json(newAlert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/alerts/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    await run(`UPDATE alerts SET status = ? WHERE id = ?`, [status, id]);
    const updated = await get(`SELECT * FROM alerts WHERE id = ?`, [id]);
    if (updated) logAlertToFirestore(updated);
    broadcast({ type: "ALERT_UPDATED", data: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reports Summary Route
app.get("/api/reports/summary", async (req, res) => {
  try {
    const type = req.query.type || "Daily";
    const limit = type === "Daily" ? 24 : type === "Weekly" ? 168 : 720;

    const stats = await get(`
      SELECT 
        AVG(voltage) as avgVoltage,
        AVG(current) as avgCurrent,
        AVG(temperature) as avgTemperature,
        AVG(humidity) as avgHumidity,
        COUNT(*) as count
      FROM (SELECT * FROM telemetry ORDER BY id DESC LIMIT ?)
    `, [limit]);

    const trips = await all(`SELECT * FROM relay_events ORDER BY rowid DESC LIMIT 50`);

    res.json({
      type,
      avgVoltage: +(stats?.avgVoltage || 0).toFixed(1),
      avgCurrent: +(stats?.avgCurrent || 0).toFixed(1),
      avgTemperature: +(stats?.avgTemperature || 0).toFixed(1),
      avgHumidity: +(stats?.avgHumidity || 0).toFixed(1),
      tripsCount: trips.length,
      trips,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings Routes
app.get("/api/settings", async (req, res) => {
  try {
    const settings = await get(`SELECT * FROM settings WHERE id = ?`, ["settings-1"]);
    res.json({
      theme: settings?.theme || "dark",
      language: settings?.language || "English",
      blynkAuthToken: settings?.blynk_auth_token || "",
      notifications: {
        critical: Boolean(settings?.notify_critical),
        warning: Boolean(settings?.notify_warning),
        offline: Boolean(settings?.notify_offline),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/settings", async (req, res) => {
  try {
    const { theme, language, notifications, blynkAuthToken } = req.body;
    await run(
      `UPDATE settings SET 
        theme = COALESCE(?, theme),
        language = COALESCE(?, language),
        notify_critical = COALESCE(?, notify_critical),
        notify_warning = COALESCE(?, notify_warning),
        notify_offline = COALESCE(?, notify_offline),
        blynk_auth_token = COALESCE(?, blynk_auth_token)
       WHERE id = ?`,
      [
        theme,
        language,
        notifications?.critical !== undefined ? (notifications.critical ? 1 : 0) : null,
        notifications?.warning !== undefined ? (notifications.warning ? 1 : 0) : null,
        notifications?.offline !== undefined ? (notifications.offline ? 1 : 0) : null,
        blynkAuthToken,
        "settings-1",
      ]
    );

    const updated = await get(`SELECT * FROM settings WHERE id = ?`, ["settings-1"]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed default Admin User if not present
async function seedDefaultUser() {
  try {
    const existingAdmin = await get(`SELECT * FROM users WHERE email = ?`, ["admin@transformer.com"]);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash("admin123", 10);
      await run(
        `INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        ["usr-admin", "admin@transformer.com", passwordHash, "Senior Grid Engineer", "Substation Engineer", new Date().toISOString()]
      );
      console.log("[SQLite] Seeded default admin user (admin@transformer.com / admin123)");
    }
  } catch (err) {
    console.error("[SQLite] Error seeding admin user:", err);
  }
}

// Initialize DB, HTTP Server, WebSockets, Blynk Poller & WAL Replication Loop
initDb()
  .then(async () => {
    await seedDefaultUser();
    server.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(` Transformer Monitor Backend Server Running!`);
      console.log(` REST API:    http://localhost:${PORT}/api/health`);
      console.log(` ML Engine:   http://localhost:${PORT}/api/analytics/predictive`);
      console.log(` WebSocket:   ws://localhost:${PORT}/ws`);
      console.log(`===================================================`);
      startBlynkPoller(broadcast);
      startReplicationLoop();
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
  });
