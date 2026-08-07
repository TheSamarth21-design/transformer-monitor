import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, query, orderBy, limit } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// User's New Firebase Credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyASkqOUiQl-i9LKEdUCtDvMQCJlkfB7u5g",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "transformer-monitoring-8a988.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "transformer-monitoring-8a988",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "transformer-monitoring-8a988.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "31791374193",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:31791374193:web:9e739d3ef4d909392ca0d0",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-RFSDV97FW5",
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Save telemetry data point to Cloud Firestore
 */
export async function saveTelemetryToFirestore(reading: any) {
  try {
    // 1. Add to telemetry history collection
    await addDoc(collection(db, "telemetry"), {
      ...reading,
      createdAt: new Date().toISOString(),
    });

    // 2. Update current live device document
    await setDoc(doc(db, "devices", "TR-0042"), {
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
  } catch {
    // Quiet error if firestore rules require auth or initial setup
  }
}

/**
 * Realtime listener for live device document updates
 */
export function subscribeFirebaseLiveDevice(callback: (device: any) => void) {
  return onSnapshot(doc(db, "devices", "TR-0042"), (snapshot: any) => {
    if (snapshot && typeof snapshot.exists === "function" && snapshot.exists()) {
      callback(snapshot.data());
    }
  });
}

/**
 * Realtime listener for recent telemetry history stream
 */
export function subscribeFirebaseTelemetryHistory(callback: (items: any[]) => void) {
  const q = query(collection(db, "telemetry"), orderBy("createdAt", "desc"), limit(20));
  return onSnapshot(q, (snapshot: any) => {
    if (snapshot && snapshot.docs) {
      const items = snapshot.docs.map((docItem: any) => ({ id: docItem.id, ...docItem.data() }));
      callback(items);
    }
  });
}
