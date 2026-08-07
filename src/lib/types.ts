export type HealthStatus = "normal" | "warning" | "critical";

export interface LiveReading {
  voltage: number; // V
  current: number; // A
  temperature: number; // C
  humidity: number; // %
  timestamp: string;
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
}

export type RelayState = "closed" | "tripped";

export interface RelayStatus {
  state: RelayState;
  autoTripEnabled: boolean;
  lastTripReason: string | null;
  lastTripAt: string | null;
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
  durationMinutes: number;
}

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  status: AlertStatus;
}

export interface HistoryPoint {
  time: string;
  voltage: number;
  current: number;
  temperature: number;
  humidity: number;
}
