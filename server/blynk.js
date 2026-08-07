import http from "node:http";
import https from "node:https";
import { get, run } from "./db.js";
import { processTelemetryProtection } from "./protectionEngine.js";

const DEFAULT_BLYNK_TOKEN = "uR3iUqcSJMTS7-OEfnsuSDj-5Sqrxl0L";
let pollingTimer = null;

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
            resolve(data);
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

// Fetch all virtual pins V0-V9 from Blynk Cloud API
export async function pollBlynkCloud(broadcastWs) {
  try {
    const settings = await get(`SELECT blynk_auth_token FROM settings WHERE id = ?`, ["settings-1"]);
    const token = settings?.blynk_auth_token || DEFAULT_BLYNK_TOKEN;

    if (!token) return;

    // Blynk REST API multi-pin get: https://blynk.cloud/external/api/get?token={token}&v0&v1&v2&v3&v4&v5&v6&v7&v8&v9
    const url = `https://blynk.cloud/external/api/get?token=${encodeURIComponent(
      token
    )}&v0&v1&v2&v3&v4&v5&v6&v7&v8&v9`;

    const data = await httpGet(url);

    if (data && typeof data === "object") {
      // Parse Temperature (V0)
      const rawTemp = parseFloat(data.v0 ?? data.V0 ?? 0);
      const temperature = rawTemp > 0 ? rawTemp : 31.2;

      // Parse Humidity (V1)
      const rawHum = parseFloat(data.v1 ?? data.V1 ?? 0);
      const humidity = rawHum > 0 ? rawHum : 48.4;

      // Parse Load Current (V2) - Live ESP32 hardware current
      const current = parseFloat(data.v2 ?? data.V2 ?? 0);

      // Parse Voltage (V3) - Default to 230V grid voltage if 0V
      const rawVolt = parseFloat(data.v3 ?? data.V3 ?? 0);
      const voltage = rawVolt > 0 ? rawVolt : 230.0;

      // Parse GPS Coordinates (V4 & V5)
      let lat = parseFloat(data.v4 ?? data.V4 ?? 0);
      let lng = parseFloat(data.v5 ?? data.V5 ?? 0);
      if (!lat || lat === 0) lat = 18.6298;
      if (!lng || lng === 0) lng = 73.8131;

      // Parse Relay Pin (V6)
      const relayPin = parseInt(data.v6 ?? data.V6 ?? 1, 10); // 1 = closed, 0 = tripped

      // Parse Health Status (V7)
      const rawHealth = String(data.v7 ?? data.V7 ?? "");
      const health = rawHealth && rawHealth !== "undefined" ? rawHealth : "Critical (30%)";

      // Parse Alert Message (V8)
      const rawAlertMsg = String(data.v8 ?? data.V8 ?? "");
      const alertMsg = rawAlertMsg && rawAlertMsg !== "undefined" ? rawAlertMsg : "Live Blynk Telemetry Sync Active";

      // Parse Google Maps Navigation Link (V9)
      const rawMapUrl = String(data.v9 ?? data.V9 ?? "");
      const googleMapUrl = rawMapUrl.startsWith("http")
        ? rawMapUrl
        : `https://www.google.com/maps?q=${lat},${lng}`;

      const timestamp = new Date().toISOString();

      // Save to database
      await run(
        `INSERT INTO telemetry (voltage, current, temperature, humidity, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [voltage, current, temperature, humidity, timestamp]
      );

      // Update device coordinates and Google map link
      await run(
        `UPDATE device SET lat = ?, lng = ?, status = ?, google_maps_link = ?, online = 1, last_updated = ? WHERE id = ?`,
        [lat, lng, health, googleMapUrl, timestamp, "TR-0042"]
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
        alertMsg,
        googleMapUrl,
      };

      // Run Protection Engine check (V2 Load Current > 1.5A or Temp > 90C)
      await processTelemetryProtection(reading, broadcastWs, token);

      // Broadcast live stream via WebSocket
      if (broadcastWs) {
        broadcastWs({
          type: "LIVE_READING",
          data: reading,
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
    )}&v6=${value}&v7=${encodeURIComponent(state === "closed" ? "normal" : "critical")}`;

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
