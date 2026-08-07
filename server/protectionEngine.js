import { get, run } from "./db.js";
import { setBlynkRelayState } from "./blynk.js";

export async function processTelemetryProtection(telemetry, broadcastWs, blynkToken) {
  try {
    const relay = await get(`SELECT * FROM relay_status WHERE id = ?`, ["relay-1"]);
    const device = await get(`SELECT * FROM device WHERE id = ?`, ["TR-0042"]);
    if (!relay) return;

    const { voltage, current, temperature, humidity } = telemetry;
    const maxCurrentLimit = relay.max_current || 50.0; // 50A safety threshold limit
    let tripReason = null;

    if (current > maxCurrentLimit) {
      tripReason = `Over-current Overload (${current.toFixed(1)}A > ${maxCurrentLimit.toFixed(1)}A safety limit)`;
    } else if (temperature > relay.max_temperature) {
      tripReason = `Over-temperature Heat Damage (${temperature.toFixed(1)}°C > ${relay.max_temperature.toFixed(1)}°C limit)`;
    } else if (voltage > relay.max_voltage) {
      tripReason = `Over-voltage Voltage Surge (${voltage.toFixed(1)}V > ${relay.max_voltage.toFixed(1)}V limit)`;
    }

    let trippedNow = false;

    if (tripReason && relay.auto_trip_enabled && relay.state === "closed") {
      const now = new Date().toISOString();
      const eventId = `evt-${Date.now()}`;
      const alertId = `al-${Date.now()}`;

      // Update local SQLite relay state to tripped
      await run(
        `UPDATE relay_status SET state = ?, last_trip_reason = ?, last_trip_at = ? WHERE id = ?`,
        ["tripped", tripReason, now, "relay-1"]
      );

      // Hardware relay trip via Blynk Cloud API (V6=0)
      if (blynkToken) {
        await setBlynkRelayState("tripped", blynkToken);
      }

      // Log relay trip event
      await run(
        `INSERT INTO relay_events (id, timestamp, cause, duration_minutes) VALUES (?, ?, ?, ?)`,
        [eventId, now, tripReason, 0]
      );

      // Create critical emergency alert record
      await run(
        `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          alertId,
          "critical",
          "⚡ CRITICAL EMERGENCY: Transformer Damage Protection Activated",
          `Overload Detected on ${device?.name || "Distribution Transformer 42"}: ${tripReason}`,
          now,
          "active",
        ]
      );

      // Update device health status
      await run(`UPDATE device SET status = ?, last_updated = ? WHERE id = ?`, [
        "critical",
        now,
        "TR-0042",
      ]);

      trippedNow = true;

      const mapUrl = (device?.google_maps_link && device.google_maps_link.startsWith("http"))
        ? device.google_maps_link
        : `https://www.google.com/maps?q=18.650029,73.745274`;

      // Broadcast full emergency diagnostic payload via WebSockets
      if (broadcastWs) {
        broadcastWs({
          type: "EMERGENCY_POPUP_ALERT",
          data: {
            alertId,
            deviceId: device?.id || "TR-0042",
            deviceName: device?.name || "Distribution Transformer 42",
            location: device?.location || "Sector 4B, Pimpri-Chinchwad",
            lat: 18.650029,
            lng: 73.745274,
            googleMapUrl: mapUrl,
            cause: tripReason,
            timestamp: now,
            voltage,
            current,
            temperature,
            humidity,
            relayState: "tripped",
          },
        });
      }
    }

    return { trippedNow, tripReason };
  } catch (err) {
    console.error("[ProtectionEngine] Error processing telemetry:", err);
  }
}
