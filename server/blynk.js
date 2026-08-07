import http from "node:http";
import https from "node:https";
import { get, run } from "./db.js";
import { processTelemetryProtection } from "./protectionEngine.js";
import { syncTelemetryToFirestore } from "./firebase.js";

const DEFAULT_BLYNK_TOKEN = "uR3iUqcSJMTS7-OEfnsuSDj-5Sqrxl0L";
let pollingTimer = null;
let lastKnownOnlineState = null;

// Simple HTTP/HTTPS GET JSON helper
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data.trim());
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

// Fetch all virtual pins V0-V9 from Blynk Cloud API (100% Direct Hardware Sync)
export async function pollBlynkCloud(broadcastWs) {
  try {
    const settings = await get(`SELECT blynk_auth_token FROM settings WHERE id = ?`, ["settings-1"]);
    const token = settings?.blynk_auth_token || DEFAULT_BLYNK_TOKEN;

    if (!token) return;

    // 1. Check Real ESP32 Hardware Connection Status via Blynk API
    const isConnectedUrl = `https://blynk.cloud/external/api/isHardwareConnected?token=${encodeURIComponent(token)}`;
    const connectionStatus = await httpGet(isConnectedUrl);
    const isHardwareOnline = connectionStatus === true || connectionStatus === "true";

    const timestamp = new Date().toISOString();

    // IF ESP32 HARDWARE IS POWERED OFF / DISCONNECTED
    if (!isHardwareOnline) {
      if (lastKnownOnlineState !== false) {
        console.log("[Blynk Hardware Status] ESP32 is POWERED OFF / DISCONNECTED.");
        lastKnownOnlineState = false;
      }

      await run(
        `UPDATE device SET lat = 0, lng = 0, online = 0, status = 'offline', last_updated = ? WHERE id = ?`,
        [timestamp, "TR-0042"]
      );

      const offlinePayload = {
        voltage: 0,
        current: 0,
        temperature: 0,
        humidity: 0,
        timestamp,
        lat: 0,
        lng: 0,
        relayState: "tripped",
        health: "Hardware Offline",
        healthScore: 0,
        alertMsg: "Device Disconnected from Blynk Cloud",
        googleMapUrl: "https://www.google.com/maps",
        online: false,
      };

      if (broadcastWs) {
        broadcastWs({
          type: "LIVE_READING",
          data: offlinePayload,
        });
        broadcastWs({
          type: "DEVICE_UPDATED",
          data: {
            id: "TR-0042",
            name: "Smart Transformer",
            location: "Substation Location Unset",
            lat: 0,
            lng: 0,
            status: "offline",
            online: false,
            lastUpdated: timestamp,
          },
        });
      }
      return;
    }

    // IF ESP32 HARDWARE IS ONLINE & POWERED ON
    if (lastKnownOnlineState !== true) {
      console.log("[Blynk Hardware Status] ESP32 POWERED ON & CONNECTED!");
      lastKnownOnlineState = true;
    }

    // Fetch live hardware pins V0-V9 from Blynk REST API
    const url = `https://blynk.cloud/external/api/get?token=${encodeURIComponent(
      token
    )}&v0&v1&v2&v3&v4&v5&v6&v7&v8&v9`;

    const data = await httpGet(url);

    if (data && typeof data === "object") {
      // 100% Direct Hardware Telemetry Sync
      const temperature = parseFloat(data.v0 ?? data.V0 ?? 0);
      const humidity = parseFloat(data.v1 ?? data.V1 ?? 0);
      const current = parseFloat(data.v2 ?? data.V2 ?? 0);
      const voltage = parseFloat(data.v3 ?? data.V3 ?? 0);

      // Direct Latitude (V4) & Longitude (V5) Sync from Blynk API
      const lat = parseFloat(data.v4 ?? data.V4 ?? 0);
      const lng = parseFloat(data.v5 ?? data.V5 ?? 0);

      const relayPin = parseInt(data.v6 ?? data.V6 ?? 1, 10); // 1 = closed, 0 = tripped
      
      // Direct Health Index Sync from Blynk V7
      const rawHealthStr = String(data.v7 ?? data.V7 ?? "70");
      const healthDigits = rawHealthStr.match(/\d+/);
      const healthScore = healthDigits ? Math.min(100, Math.max(0, parseInt(healthDigits[0], 10))) : 70;
      const health = rawHealthStr || `${healthScore}%`;

      const alertMsg = String(data.v8 ?? data.V8 ?? "Hardware Online");

      const rawMapUrl = String(data.v9 ?? data.V9 ?? "");
      const googleMapUrl = rawMapUrl.startsWith("http")
        ? rawMapUrl
        : lat !== 0 && lng !== 0
        ? `https://www.google.com/maps?q=${lat},${lng}`
        : "https://www.google.com/maps";

      // Save live hardware telemetry to SQLite database
      await run(
        `INSERT INTO telemetry (voltage, current, temperature, humidity, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [voltage, current, temperature, humidity, timestamp]
      );

      // Sync live hardware telemetry to Firebase Cloud Storage
      syncTelemetryToFirestore({
        voltage,
        current,
        temperature,
        humidity,
        lat,
        lng,
        relayState: relayPin === 1 ? "closed" : "tripped",
        health,
        healthScore,
        alertMsg,
        timestamp,
      });

      // Update device record with live hardware coordinates
      await run(
        `UPDATE device SET lat = ?, lng = ?, status = ?, google_maps_link = ?, online = 1, last_updated = ? WHERE id = ?`,
        [lat, lng, relayPin === 1 ? "normal" : "critical", googleMapUrl, timestamp, "TR-0042"]
      );

      const reading = {
        voltage,
        current,
        temperature,
        humidity,
        timestamp,
        lat,
        lng,
        relayState: relayPin === 1 ? "closed" : "tripped",
        health,
        healthScore,
        alertMsg,
        googleMapUrl,
        online: true,
      };

      // Run Protection Engine check against live telemetry
      await processTelemetryProtection(reading, broadcastWs, token);

      // Broadcast live hardware telemetry via WebSockets
      if (broadcastWs) {
        broadcastWs({
          type: "LIVE_READING",
          data: reading,
        });
        broadcastWs({
          type: "DEVICE_UPDATED",
          data: {
            id: "TR-0042",
            name: "Smart Transformer",
            location: lat !== 0 && lng !== 0 ? `GPS Position: ${lat}, ${lng}` : "Awaiting Blynk GPS Fix",
            lat,
            lng,
            status: relayPin === 1 ? "normal" : "critical",
            online: true,
            lastUpdated: timestamp,
          },
        });
      }
    }
  } catch (err) {
    // Quietly log error if Blynk Cloud API is temporarily unreachable
  }
}

// Send relay update command to Blynk Cloud (v6 = 1 for closed, 0 for tripped)
export async function setBlynkRelayState(state, token) {
  try {
    if (!token) {
      const settings = await get(`SELECT blynk_auth_token FROM settings WHERE id = ?`, ["settings-1"]);
      token = settings?.blynk_auth_token || DEFAULT_BLYNK_TOKEN;
    }
    if (!token) return;

    const value = state === "closed" ? 1 : 0;
    const url = `https://blynk.cloud/external/api/update?token=${encodeURIComponent(
      token
    )}&v6=${value}&v7=${encodeURIComponent(state === "closed" ? "70%" : "30%")}`;

    await httpGet(url);
    console.log(`[Blynk Cloud API] Updated Hardware Relay V6 = ${value} (${state})`);
  } catch (err) {
    console.error("[Blynk Cloud API] Error updating relay:", err.message);
  }
}

export function startBlynkPoller(broadcastWs) {
  if (pollingTimer) clearInterval(pollingTimer);
  console.log("[Blynk] Starting Blynk Cloud Polling Service with Auth Token...");
  pollingTimer = setInterval(() => pollBlynkCloud(broadcastWs), 3000);
}
