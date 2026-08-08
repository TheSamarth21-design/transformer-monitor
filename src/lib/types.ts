export type HealthStatus = "normal" | "warning" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface LiveReading {
  voltage: number; // V (V3)
  current: number; // A (V2)
  temperature: number; // C (V0)
  humidity: number; // % (V1)
  lat?: number; // (V4)
  lng?: number; // (V5)
  relayState?: "closed" | "tripped"; // (V6)
  health?: string; // (V7) e.g. "Critical (30%)"
  healthScore?: number; // 0 - 100 Health Index
  alertMsg?: string; // (V8) e.g. "TRIPPED: Manual Remote Shutdown"
  googleMapUrl?: string; // (V9)
  timestamp: string;
  isReplicatedData?: boolean; // True when AI predictive replicator fills in for hardware damage
  sensorStatus?: {
    voltage: "real" | "replicated";
    current: "real" | "replicated";
    temperature: "real" | "replicated";
    humidity: "real" | "replicated";
  };
}

export interface TransformerDevice {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  status: HealthStatus;
  online: boolean;
  lastUpdated: string;
  googleMapsLink?: string;
}

export interface HistoryPoint {
  time: string;
  voltage: number;
  current: number;
  temperature: number;
  humidity: number;
}

export interface RelayStatus {
  state: "closed" | "tripped";
  autoTripEnabled: boolean;
  lastTripReason: string;
  lastTripAt: string;
  thresholds: {
    maxTemperature: number;
    maxCurrent: number;
    maxVoltage: number;
  };
}

export interface RelayEvent {
  id: string;
  timestamp: string;
  cause: string;
  duration_minutes?: number;
  durationMinutes?: number;
}

export interface AlertItem {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  timestamp: string;
  status: AlertStatus;
}
