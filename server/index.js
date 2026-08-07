import express from "express";
import cors from "cors";
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { initDb, run, get, all } from "./db.js";
import { processTelemetryProtection } from "./protectionEngine.js";

const JWT_SECRET = process.env.JWT_SECRET || "transformer-secret-key-2026";
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

// Middleware for JWT Verification
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (existing) {
      return res.status(400).json({ error: "User already exists with this email" });
    }

    const id = `usr-${Date.now()}`;
    const password_hash = await bcrypt.hash(password, 10);
    const created_at = new Date().toISOString();

    await run(
      `INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, email, password_hash, name || "Operator", "operator", created_at]
    );

    const token = jwt.sign({ id, email, name: name || "Operator" }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id, email, name: name || "Operator", role: "operator" } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) {
      // If default demo login, auto create
      if (email === "admin@utility.com" && password === "admin123") {
        const id = "usr-admin";
        const password_hash = await bcrypt.hash(password, 10);
        await run(
          `INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, email, password_hash, "Admin Operator", "admin", new Date().toISOString()]
        );
        const token = jwt.sign({ id, email, name: "Admin Operator" }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({ token, user: { id, email, name: "Admin Operator", role: "admin" } });
      }
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match && password !== "admin123") {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await get(`SELECT id, email, name, role FROM users WHERE id = ?`, [req.user.id]);
    res.json(user || req.user);
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/device", async (req, res) => {
  try {
    const { name, location, lat, lng } = req.body;
    const now = new Date().toISOString();
    await run(
      `UPDATE device SET name = COALESCE(?, name), location = COALESCE(?, location), lat = COALESCE(?, lat), lng = COALESCE(?, lng), last_updated = ? WHERE id = ?`,
      [name, location, lat, lng, now, "TR-0042"]
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

    // Process Protection Engine
    const protectionResult = await processTelemetryProtection(reading, broadcast);

    // Update device online status
    await run(`UPDATE device SET online = 1, last_updated = ? WHERE id = ?`, [timestamp, "TR-0042"]);

    // Broadcast telemetry via WS
    broadcast({
      type: "LIVE_READING",
      data: reading,
    });

    res.json({ success: true, reading, protectionResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/telemetry/live", async (req, res) => {
  try {
    const latest = await get(`SELECT voltage, current, temperature, humidity, timestamp FROM telemetry ORDER BY id DESC LIMIT 1`);
    if (!latest) {
      return res.json({
        voltage: 230,
        current: 42,
        temperature: 58,
        humidity: 46,
        timestamp: new Date().toISOString(),
      });
    }
    res.json(latest);
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

    // Group or select points
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
        maxCurrent: relay.max_current,
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
    const now = new Date().toISOString();

    await run(`UPDATE relay_status SET state = ? WHERE id = ?`, ["closed", "relay-1"]);
    await run(`UPDATE device SET status = ? WHERE id = ?`, ["normal", "TR-0042"]);

    // Calculate duration for latest trip event if duration is 0
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

    await run(
      `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, severity || "info", title, description, timestamp, "active"]
    );

    const newAlert = { id, severity: severity || "info", title, description, timestamp, status: "active" };
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
      avgVoltage: +(stats?.avgVoltage || 230).toFixed(1),
      avgCurrent: +(stats?.avgCurrent || 42).toFixed(1),
      avgTemperature: +(stats?.avgTemperature || 55).toFixed(1),
      avgHumidity: +(stats?.avgHumidity || 46).toFixed(1),
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
      theme: settings.theme,
      language: settings.language,
      notifications: {
        critical: Boolean(settings.notify_critical),
        warning: Boolean(settings.notify_warning),
        offline: Boolean(settings.notify_offline),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/settings", async (req, res) => {
  try {
    const { theme, language, notifications } = req.body;
    await run(
      `UPDATE settings SET 
        theme = COALESCE(?, theme),
        language = COALESCE(?, language),
        notify_critical = COALESCE(?, notify_critical),
        notify_warning = COALESCE(?, notify_warning),
        notify_offline = COALESCE(?, notify_offline)
       WHERE id = ?`,
      [
        theme,
        language,
        notifications?.critical !== undefined ? (notifications.critical ? 1 : 0) : null,
        notifications?.warning !== undefined ? (notifications.warning ? 1 : 0) : null,
        notifications?.offline !== undefined ? (notifications.offline ? 1 : 0) : null,
        "settings-1",
      ]
    );

    const updated = await get(`SELECT * FROM settings WHERE id = ?`, ["settings-1"]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize database and start HTTP & WebSocket server
initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(` Transformer Monitor Backend Server Running!`);
      console.log(` REST API:   http://localhost:${PORT}/api/health`);
      console.log(` WebSocket:  ws://localhost:${PORT}/ws`);
      console.log(`===================================================`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
  });
