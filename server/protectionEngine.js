import { get, run } from "./db.js";
import { setBlynkRelayState } from "./blynk.js";

export async function processTelemetryProtection(telemetry, broadcastWs, blynkToken) {
  try {
    const relay = await get(`SELECT * FROM relay_status WHERE id = ?`, ["relay-1"]);
    const device = await get(`SELECT * FROM device WHERE id = ?`, ["TR-0042"]);
    if (!relay) return;

    const { voltage, current, temperature, humidity } = telemetry;
    const now = new Date().toISOString();
    let trippedNow = false;
    let tripReason = null;

    // RULE 1: Current <= 1.0A -> SAFE
    if (current <= 1.0) {
      if (device?.status !== "normal" && relay.state === "closed") {
        await run(`UPDATE device SET status = ?, last_updated = ? WHERE id = ?`, ["normal", now, "TR-0042"]);
      }
      return { trippedNow: false, status: "safe" };
    }

    // RULE 2: 1.0A < Current <= 2.0A -> ALERT ONLY (Send Message to Technician Notification List)
    if (current > 1.0 && current <= 2.0) {
      const alertId = `al-${Date.now()}`;
      const title = `⚠️ High Current Warning (${current.toFixed(2)}A)`;
      const description = `Load current reached ${current.toFixed(2)}A (above 1.0A safe threshold). Technician notified.`;

      await run(
        `INSERT INTO alerts (id, severity, title, description, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [alertId, "warning", title, description, now, "active"]
      );

      await run(`UPDATE device SET status = ?, last_updated = ? WHERE id = ?`, ["warning", now, "TR-0042"]);

      // Broadcast warning notification message (no pop-up, just notification item)
      if (broadcastWs) {
        broadcastWs({
          type: "NEW_ALERT",
          data: {
            id: alertId,
            severity: "warning",
            title,
            description,
            timestamp: now,
            status: "active",
          },
        });
      }

      return { trippedNow: false, status: "warning" };
    }

    // RULE 3: Current > 2.0A -> CRITICAL EMERGENCY POP-UP ALERT ON TECHNICIAN SCREEN
    if (current > 2.0) {
      tripReason = `Critical Over-current Overload (${current.toFixed(2)}A > 2.0A Safety Limit)`;

      if (relay.auto_trip_enabled && relay.state === "closed") {
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
            "⚡ CRITICAL EMERGENCY: Transformer Damage Protection Interlock Activated",
            `Critical Overload Detected: ${tripReason}`,
            now,
            "active",
          ]
        );

        // Update device health status
        await run(`UPDATE device SET status = ?, last_updated = ? WHERE id = ?`, ["critical", now, "TR-0042"]);

        trippedNow = true;

        const mapUrl = (device?.google_maps_link && device.google_maps_link.startsWith("http"))
          ? device.google_maps_link
          : `https://www.google.com/maps?q=18.650029,73.745274`;

        // Broadcast Google-style Pop-Up Emergency Alert payload to technician's screen
        if (broadcastWs) {
          broadcastWs({
            type: "EMERGENCY_POPUP_ALERT",
            data: {
              alertId,
              deviceId: device?.id || "TR-0042",
              deviceName: device?.name || "Smart Transformer",
              location: device?.location || "Sector 4B, Pimpri-Chinchwad",
              lat: device?.lat || 18.650029,
              lng: device?.lng || 73.745274,
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
    }

    return { trippedNow, tripReason, status: "critical" };
  } catch (err) {
    console.error("[ProtectionEngine] Error processing telemetry:", err);
  }
}
