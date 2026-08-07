import https from "node:https";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "transformer-monitoring-8a988";

// Simple HTTPS POST JSON helper for Firebase Firestore REST API
function firebaseRestRequest(path, method = "POST", payload = null) {
  return new Promise((resolve) => {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents${path}`;

    const dataString = payload ? JSON.stringify(payload) : "";
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(dataString),
      },
    };

    const req = https.request(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on("error", () => resolve(null));
    if (payload) req.write(dataString);
    req.end();
  });
}

/**
 * Format JS primitive values into Firestore REST API Value JSON objects
 */
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "number") {
      fields[key] = { doubleValue: val };
    } else if (typeof val === "boolean") {
      fields[key] = { booleanValue: val };
    } else {
      fields[key] = { stringValue: String(val ?? "") };
    }
  }
  return fields;
}

/**
 * Sync telemetry data point to Firebase Cloud Firestore
 */
export async function syncTelemetryToFirestore(reading) {
  try {
    const fields = toFirestoreFields({
      ...reading,
      createdAt: new Date().toISOString(),
    });

    // 1. Add document to 'telemetry' collection
    await firebaseRestRequest("/telemetry", "POST", { fields });

    // 2. Patch live device status document in 'devices/TR-0042'
    const deviceFields = toFirestoreFields({
      id: "TR-0042",
      name: "Smart Transformer",
      location: reading.lat !== 0 && reading.lng !== 0 ? `GPS: ${reading.lat}, ${reading.lng}` : "Awaiting Blynk GPS Fix",
      lat: reading.lat || 0,
      lng: reading.lng || 0,
      voltage: reading.voltage,
      current: reading.current,
      temperature: reading.temperature,
      humidity: reading.humidity,
      relayState: reading.relayState,
      health: reading.health,
      healthScore: reading.healthScore,
      alertMsg: reading.alertMsg,
      googleMapUrl: reading.googleMapUrl,
      online: reading.online ?? true,
      lastUpdated: new Date().toISOString(),
    });

    await firebaseRestRequest("/devices/TR-0042", "PATCH", { fields: deviceFields });
  } catch (err) {
    // Quiet fail if Firestore is unreachable
  }
}

/**
 * Log emergency alert event to Firebase Cloud Firestore
 */
export async function logAlertToFirestore(alertData) {
  try {
    const fields = toFirestoreFields({
      ...alertData,
      createdAt: new Date().toISOString(),
    });
    await firebaseRestRequest("/alerts", "POST", { fields });
  } catch (err) {
    // Quiet fail
  }
}

console.log(`[Firebase] Initialized with Project ID '${FIREBASE_PROJECT_ID}'.`);
