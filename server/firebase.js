import admin from "firebase-admin";

let isFirebaseInitialized = false;
let db = null;

export function initFirebase() {
  try {
    if (admin.apps.length > 0) {
      isFirebaseInitialized = true;
      db = admin.firestore();
      return;
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.FIREBASE_PROJECT_ID || "transformer-monitor-cloud";

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
      isFirebaseInitialized = true;
      db = admin.firestore();
      console.log("[Firebase] Initialized with Service Account cert.");
    } else {
      // Default / mock initialization fallback
      admin.initializeApp({
        projectId,
      });
      isFirebaseInitialized = true;
      db = admin.firestore();
      console.log(`[Firebase] Initialized with Project ID '${projectId}'.`);
    }
  } catch (err) {
    console.log("[Firebase] Initialization skipped or credentials pending:", err.message);
  }
}

export async function syncTelemetryToFirestore(reading) {
  if (!isFirebaseInitialized || !db) return;
  try {
    const docRef = db.collection("transformers").doc("TR-0042").collection("telemetry").doc();
    await docRef.set({
      ...reading,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update latest document
    await db.collection("transformers").doc("TR-0042").set(
      {
        lastReading: reading,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    // Quietly log sync error
  }
}

export async function syncAlertToFirestore(alert) {
  if (!isFirebaseInitialized || !db) return;
  try {
    await db.collection("alerts").doc(alert.id || `al-${Date.now()}`).set({
      ...alert,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Quietly log
  }
}

export async function syncRelayEventToFirestore(event) {
  if (!isFirebaseInitialized || !db) return;
  try {
    await db.collection("relay_events").doc(event.id || `evt-${Date.now()}`).set({
      ...event,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Quietly log
  }
}
