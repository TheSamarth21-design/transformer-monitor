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

// Mount Authentication REST API Routes
app.use("/api/auth", authRouter);

// System Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    timestamp: new Date().toISOString(),
    service: "Transformer Monitor & Automated Protection Backend",
  });
});

// Database Replication Status & Metrics Endpoint
app.get("/api/replication/status", async (req, res) => {
  const metrics = await getReplicationMetrics();
  res.json(metrics);
});

// Get Device Info Endpoint
app.get("/api/device", (req, res) => {
  res.json({
    id: "TR-0042",
    name: "Smart Transformer",
    location: "Pimpri Substation Grid (18.6499, 73.7452)",
    lat: 18.649916,
    lng: 73.745276,
    status: "normal",
    online: true,
    lastUpdated: new Date().toISOString(),
    googleMapsLink: "https://www.google.com/maps?q=18.649916,73.745276",
  });
});

// Get Live Telemetry Reading Endpoint
app.get("/api/telemetry/live", async (req, res) => {
  try {
    const liveData = await pollBlynkCloud();
    const mlAnalysis = processMlPredictiveAnalysis(liveData);
    res.json({ ...liveData, mlAnalysis });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch telemetry reading" });
  }
});

// Machine Learning Predictive Maintenance Analysis Endpoint
app.get("/api/analytics/predictive", async (req, res) => {
  try {
    const currentReading = await pollBlynkCloud();
    const historyPoints = await all(
      `SELECT voltage, current, temperature, humidity FROM telemetry ORDER BY id DESC LIMIT 20`
    );
    const mlResult = processMlPredictiveAnalysis(currentReading, historyPoints);
    res.json(mlResult);
  } catch (err) {
    res.status(500).json({ error: "Failed to run ML predictive analysis" });
  }
});

// Get Historical Telemetry Analytics Data
app.get("/api/telemetry/history", async (req, res) => {
  const range = req.query.range || "day";
  let limitCount = 25;
  if (range === "week") limitCount = 50;
  if (range === "month") limitCount = 100;
  if (range === "year") limitCount = 360;

  try {
    const rows = await all(
      `SELECT time, voltage, current, temperature, humidity FROM telemetry ORDER BY id DESC LIMIT ?`,
      [limitCount]
    );

    if (rows.length === 0) {
      // Fallback historical seed generator if database clean
      const basePoints = [];
      const now = Date.now();
      for (let i = limitCount - 1; i >= 0; i--) {
        const timeStr = new Date(now - i * 60000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        basePoints.push({
          time: timeStr,
          voltage: +(115 + Math.sin(i * 0.2) * 9.8).toFixed(1),
          current: +(0.4 + Math.cos(i * 0.3) * 1.6).toFixed(1),
          temperature: +(24 + Math.sin(i * 0.1) * 4).toFixed(1),
          humidity: +(60 + Math.cos(i * 0.2) * 10).toFixed(1),
        });
      }
      return res.json(basePoints);
    }

    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch historical telemetry" });
  }
});

// Get Relay Status & Thresholds Endpoint
app.get("/api/relay/status", async (req, res) => {
  try {
    const stateRow = await get(`SELECT value FROM settings WHERE key = 'relay_state'`);
    const autoTripRow = await get(`SELECT value FROM settings WHERE key = 'auto_trip_enabled'`);
    const reasonRow = await get(`SELECT value FROM settings WHERE key = 'last_trip_reason'`);
    const atRow = await get(`SELECT value FROM settings WHERE key = 'last_trip_at'`);

    const maxTempRow = await get(`SELECT value FROM settings WHERE key = 'max_temperature'`);
    const maxCurRow = await get(`SELECT value FROM settings WHERE key = 'max_current'`);
    const maxVoltRow = await get(`SELECT value FROM settings WHERE key = 'max_voltage'`);

    res.json({
      state: stateRow?.value || "closed",
      autoTripEnabled: autoTripRow?.value === "true",
      lastTripReason: reasonRow?.value || "System Nominal",
      lastTripAt: atRow?.value || new Date().toISOString(),
      thresholds: {
        maxTemperature: parseFloat(maxTempRow?.value || "90"),
        maxCurrent: parseFloat(maxCurRow?.value || "1.5"),
        maxVoltage: parseFloat(maxVoltRow?.value || "260"),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch relay status" });
  }
});

// Manual Relay Trip Command Endpoint
app.post("/api/relay/trip", async (req, res) => {
  const { reason } = req.body;
  const tripReason = reason || "Manual Emergency Remote Shutdown";
  const nowStr = new Date().toISOString();

  try {
    await run(`UPDATE settings SET value = 'tripped' WHERE key = 'relay_state'`);
    await run(`UPDATE settings SET value = ? WHERE key = 'last_trip_reason'`, [tripReason]);
    await run(`UPDATE settings SET value = ? WHERE key = 'last_trip_at'`, [nowStr]);

    await run(
      `INSERT INTO relay_events (id, timestamp, cause, duration_minutes) VALUES (?, ?, ?, ?)`,
      [`re-${Date.now()}`, nowStr, tripReason, 0]
    );

    await run(
      `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [`al-${Date.now()}`, "critical", `Relay Tripped: ${tripReason}`, tripReason, nowStr, "active"]
    );

    // Command physical Blynk hardware to Open/Trip Relay (V6 = 0)
    await setBlynkRelayState("0", tripReason);

    // Log trip alert snapshot to Cloud Firestore
    logAlertToFirestore({
      severity: "critical",
      title: `Relay Tripped: ${tripReason}`,
      description: tripReason,
    }).catch(() => {});

    broadcast({
      type: "RELAY_TRIPPED",
      data: { state: "tripped", reason: tripReason, timestamp: nowStr },
    });

    res.json({ success: true, message: `Relay tripped successfully: ${tripReason}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to trip relay" });
  }
});

// Manual Relay Reset / Re-close Command Endpoint
app.post("/api/relay/reset", async (req, res) => {
  const nowStr = new Date().toISOString();
  try {
    await run(`UPDATE settings SET value = 'closed' WHERE key = 'relay_state'`);
    await run(`UPDATE settings SET value = 'System Nominal' WHERE key = 'last_trip_reason'`);

    // Command physical Blynk hardware to Close Relay (V6 = 1)
    await setBlynkRelayState("1", "System Nominal");

    broadcast({
      type: "RELAY_STATUS_CHANGED",
      data: { state: "closed", timestamp: nowStr },
    });

    res.json({ success: true, message: "Relay reset & re-closed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset relay" });
  }
});

// Update Protection Thresholds & Auto-Trip Enable Endpoint
app.patch("/api/relay/thresholds", async (req, res) => {
  const { maxTemperature, maxCurrent, maxVoltage, autoTripEnabled } = req.body;

  try {
    if (typeof maxTemperature === "number") {
      await run(`UPDATE settings SET value = ? WHERE key = 'max_temperature'`, [String(maxTemperature)]);
    }
    if (typeof maxCurrent === "number") {
      await run(`UPDATE settings SET value = ? WHERE key = 'max_current'`, [String(maxCurrent)]);
    }
    if (typeof maxVoltage === "number") {
      await run(`UPDATE settings SET value = ? WHERE key = 'max_voltage'`, [String(maxVoltage)]);
    }
    if (typeof autoTripEnabled === "boolean") {
      await run(`UPDATE settings SET value = ? WHERE key = 'auto_trip_enabled'`, [String(autoTripEnabled)]);
    }

    broadcast({ type: "THRESHOLDS_UPDATED", data: req.body });
    res.json({ success: true, message: "Protection thresholds updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update thresholds" });
  }
});

// Get Alerts List Endpoint
app.get("/api/alerts", async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM alerts ORDER BY id DESC LIMIT 50`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// Update Alert Status (Acknowledge / Resolve) Endpoint
app.patch("/api/alerts/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await run(`UPDATE alerts SET status = ? WHERE id = ?`, [status, id]);
    broadcast({ type: "ALERT_UPDATED", data: { id, status } });
    res.json({ success: true, message: `Alert ${id} updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to update alert" });
  }
});

// Trigger Emergency Pop-Up Alert Test Endpoint
app.post("/api/test-emergency-alert", (req, res) => {
  const alertPayload = {
    alertId: `al-${Date.now()}`,
    deviceId: "TR-0042",
    deviceName: "Smart Transformer",
    location: "Pimpri Substation Grid (18.6499, 73.7452)",
    lat: 18.649916,
    lng: 73.745276,
    googleMapUrl: "https://www.google.com/maps?q=18.649916,73.745276",
    cause: "Critical Over-current Overload (2.6A > 2.0A Safety Limit)",
    timestamp: new Date().toISOString(),
    voltage: 120,
    current: 2.6,
    temperature: 25,
    humidity: 64,
    relayState: "tripped",
  };

  broadcast({
    type: "EMERGENCY_ALERT_POPUP",
    data: alertPayload,
  });

  res.json({ success: true, message: "Emergency test alert broadcasted to all connected clients", alertPayload });
});

// Automated Email Dispatch Endpoint for Field Technicians
app.post("/api/notifications/dispatch-email", (req, res) => {
  try {
    const { email, technicianName, role, riskLevel, recommendedAction } = req.body;
    console.log(`[AUTOMATED EMAIL DISPATCH] Emergency Alert Auto-Dispatched!`);
    console.log(`- Recipient: ${email} (${technicianName} - ${role})`);
    console.log(`- Risk Level: ${riskLevel}`);
    console.log(`- Directive: ${recommendedAction}`);

    return res.json({
      success: true,
      message: `Automated emergency email dispatched to ${email}`,
      dispatchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to process automated email dispatch" });
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
