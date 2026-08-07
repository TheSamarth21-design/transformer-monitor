import { get, run } from "./db.js";

export async function processTelemetryProtection(telemetry, broadcastWs) {
  try {
    const relay = await get(`SELECT * FROM relay_status WHERE id = ?`, ["relay-1"]);
    if (!relay) return;

    const { voltage, current, temperature } = telemetry;
    let tripReason = null;

    if (temperature > relay.max_temperature) {
      tripReason = `Over-temperature (${temperature}°C > threshold ${relay.max_temperature}°C)`;
    } else if (current > relay.max_current) {
      tripReason = `Over-current (${current}A > threshold ${relay.max_current}A)`;
    } else if (voltage > relay.max_voltage) {
      tripReason = `Over-voltage (${voltage}V > threshold ${relay.max_voltage}V)`;
    }

    let trippedNow = false;

    if (tripReason && relay.auto_trip_enabled && relay.state === "closed") {
      const now = new Date().toISOString();
      const eventId = `evt-${Date.now()}`;
      const alertId = `al-${Date.now()}`;

      // Update relay state
      await run(
        `UPDATE relay_status SET state = ?, last_trip_reason = ?, last_trip_at = ? WHERE id = ?`,
        ["tripped", tripReason, now, "relay-1"]
      );

      // Log relay event
      await run(
        `INSERT INTO relay_events (id, timestamp, cause, duration_minutes) VALUES (?, ?, ?, ?)`,
        [eventId, now, tripReason, 0]
      );

      // Create critical alert
      await run(
        `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          alertId,
          "critical",
          "Relay Tripped Automatically",
          `Protection system activated: ${tripReason}`,
          now,
          "active",
        ]
      );

      // Update device health status to critical
      await run(`UPDATE device SET status = ?, last_updated = ? WHERE id = ?`, [
        "critical",
        now,
        "TR-0042",
      ]);

      trippedNow = true;

      // Broadcast alert & relay update via WS
      if (broadcastWs) {
        broadcastWs({
          type: "RELAY_TRIPPED",
          data: {
            reason: tripReason,
            timestamp: now,
            relayState: "tripped",
          },
        });
      }
    } else if (!tripReason && relay.state === "closed") {
      // Normal operation check
      const deviceStatus = temperature > 60 || current > 80 ? "warning" : "normal";
      await run(`UPDATE device SET status = ?, last_updated = ? WHERE id = ?`, [
        deviceStatus,
        new Date().toISOString(),
        "TR-0042",
      ]);
    }

    return { trippedNow, tripReason };
  } catch (err) {
    console.error("[ProtectionEngine] Error processing telemetry:", err);
  }
}
