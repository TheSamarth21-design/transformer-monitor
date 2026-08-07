import { useEffect, useState } from "react";
import type {
  AlertItem,
  HistoryPoint,
  LiveReading,
  RelayEvent,
  RelayStatus,
  TransformerDevice,
} from "@/lib/types";
import { apiRequest, subscribeWebSocket } from "@/lib/api";
import { subscribeFirebaseLiveDevice, saveTelemetryToFirestore } from "@/lib/firebase";

const BLYNK_TOKEN = "uR3iUqcSJMTS7-OEfnsuSDj-5Sqrxl0L";
const BLYNK_POLL_URL = `https://blynk.cloud/external/api/get?token=${BLYNK_TOKEN}&v0&v1&v2&v3&v4&v5&v6&v7&v8&v9`;

const INITIAL_DEVICE: TransformerDevice = {
  id: "TR-0042",
  name: "Smart Transformer",
  location: "Awaiting Blynk Hardware GPS Sync",
  lat: 0,
  lng: 0,
  status: "normal",
  online: false,
  lastUpdated: new Date().toISOString(),
};

export function useLiveReading(): LiveReading & { isHardwareOnline: boolean } {
  const [reading, setReading] = useState<LiveReading>({
    voltage: 0,
    current: 0,
    temperature: 0,
    humidity: 0,
    lat: 0,
    lng: 0,
    health: "Awaiting Hardware Sync...",
    alertMsg: "",
    googleMapUrl: "https://www.google.com/maps",
    timestamp: new Date().toISOString(),
  });

  const [isHardwareOnline, setIsHardwareOnline] = useState<boolean>(false);

  useEffect(() => {
    // 1. Backend REST fetch (if local server running)
    apiRequest<LiveReading>("/telemetry/live")
      .then((data) => {
        if (data && typeof data.voltage === "number") {
          setReading(data);
          setIsHardwareOnline(true);
        }
      })
      .catch(() => {});

    // 2. Local WebSocket Subscription
    const unsubscribeWs = subscribeWebSocket((event) => {
      if (event.type === "LIVE_READING" && event.data) {
        setReading(event.data);
        setIsHardwareOnline(true);
      }
    });

    // 3. Cloud Firestore Realtime Sync
    const unsubscribeFb = subscribeFirebaseLiveDevice((devData: any) => {
      if (devData) {
        setReading((prev) => ({
          ...prev,
          voltage: devData.voltage ?? prev.voltage,
          current: devData.current ?? prev.current,
          temperature: devData.temperature ?? prev.temperature,
          humidity: devData.humidity ?? prev.humidity,
          lat: devData.lat ?? prev.lat,
          lng: devData.lng ?? prev.lng,
          health: devData.health ?? prev.health,
          alertMsg: devData.alertMsg ?? prev.alertMsg,
          googleMapUrl: devData.googleMapUrl ?? prev.googleMapUrl,
          timestamp: devData.lastUpdated ?? new Date().toISOString(),
        }));
        setIsHardwareOnline(Boolean(devData.online));
      }
    });

    // 4. Pure Real Blynk Hardware API Poller (NO DEMO DATA)
    const blynkPoller = setInterval(async () => {
      try {
        const res = await fetch(BLYNK_POLL_URL);
        if (!res.ok) {
          setIsHardwareOnline(false);
          return;
        }
        const blynkData = await res.json();

        // Check if real hardware pins are present
        if (blynkData.v3 === undefined && blynkData.v0 === undefined) {
          setIsHardwareOnline(false);
          return;
        }

        const temp = parseFloat(blynkData.v0) || 0;
        const hum = parseFloat(blynkData.v1) || 0;
        const cur = parseFloat(blynkData.v2) || 0;
        const volt = parseFloat(blynkData.v3) || 0;
        const lat = parseFloat(blynkData.v4) || 0;
        const lng = parseFloat(blynkData.v5) || 0;
        const relayVal = parseInt(blynkData.v6, 10);
        const relayState = relayVal === 1 ? "closed" : "tripped";
        const health = String(blynkData.v7 || "Hardware Online");
        const alertMsg = String(blynkData.v8 || "");

        const googleMapUrl =
          lat !== 0 && lng !== 0
            ? `https://www.google.com/maps?q=${lat},${lng}`
            : "https://www.google.com/maps";

        const realReading: LiveReading = {
          voltage: volt,
          current: cur,
          temperature: temp,
          humidity: hum,
          lat,
          lng,
          relayState,
          health,
          alertMsg,
          googleMapUrl,
          timestamp: new Date().toISOString(),
        };

        setReading(realReading);
        setIsHardwareOnline(true);

        // Sync real hardware telemetry snapshot to Cloud Firestore
        saveTelemetryToFirestore(realReading).catch(() => {});
      } catch {
        setIsHardwareOnline(false);
      }
    }, 3000);

    return () => {
      unsubscribeWs();
      unsubscribeFb();
      clearInterval(blynkPoller);
    };
  }, []);

  const result = { ...reading } as any;
  result.isHardwareOnline = isHardwareOnline;
  return result;
}

export function useDevice(): TransformerDevice {
  const [device, setDevice] = useState<TransformerDevice>(INITIAL_DEVICE);

  useEffect(() => {
    apiRequest<TransformerDevice>("/device")
      .then((data) => setDevice(data))
      .catch(() => {});

    const unsubscribeWs = subscribeWebSocket((event) => {
      if (event.type === "DEVICE_UPDATED" && event.data) {
        setDevice(event.data);
      }
    });

    const unsubscribeFb = subscribeFirebaseLiveDevice((devData: any) => {
      if (devData) {
        setDevice((prev) => ({
          ...prev,
          name: devData.name || prev.name,
          location: devData.location || prev.location,
          lat: devData.lat ?? prev.lat,
          lng: devData.lng ?? prev.lng,
          status: devData.status || (devData.current > 2.0 ? "critical" : devData.current > 1.0 ? "warning" : "normal"),
          online: devData.online ?? true,
          lastUpdated: devData.lastUpdated || new Date().toISOString(),
          googleMapsLink: devData.googleMapUrl || prev.googleMapsLink,
        }));
      }
    });

    return () => {
      unsubscribeWs();
      unsubscribeFb();
    };
  }, []);

  return device;
}

export function useRelayStatus(): RelayStatus & {
  tripRelay: (reason?: string) => Promise<void>;
  resetRelay: () => Promise<void>;
  updateThresholds: (thresholds: Partial<RelayStatus["thresholds"]> & { autoTripEnabled?: boolean }) => Promise<void>;
} {
  const [relay, setRelay] = useState<RelayStatus>({
    state: "closed",
    autoTripEnabled: false,
    lastTripReason: "System Nominal",
    lastTripAt: new Date().toISOString(),
    thresholds: {
      maxTemperature: 90,
      maxCurrent: 50,
      maxVoltage: 260,
    },
  });

  const fetchRelay = () => {
    apiRequest<RelayStatus>("/relay/status")
      .then((data) => setRelay(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchRelay();
    const unsubscribe = subscribeWebSocket((event) => {
      if (
        event.type === "RELAY_STATUS_CHANGED" ||
        event.type === "RELAY_TRIPPED" ||
        event.type === "THRESHOLDS_UPDATED"
      ) {
        fetchRelay();
      }
    });
    return unsubscribe;
  }, []);

  const tripRelay = async (reason?: string) => {
    try {
      await apiRequest("/relay/trip", {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    } catch {
      // Direct Blynk Hardware API Command (V6 = 0)
      fetch(`https://blynk.cloud/external/api/update?token=${BLYNK_TOKEN}&v6=0`).catch(() => {});
    }
    setRelay((prev) => ({ ...prev, state: "tripped", lastTripReason: reason || "Manual Trip" }));
  };

  const resetRelay = async () => {
    try {
      await apiRequest("/relay/reset", { method: "POST" });
    } catch {
      // Direct Blynk Hardware API Command (V6 = 1)
      fetch(`https://blynk.cloud/external/api/update?token=${BLYNK_TOKEN}&v6=1`).catch(() => {});
    }
    setRelay((prev) => ({ ...prev, state: "closed" }));
  };

  const updateThresholds = async (
    updates: Partial<RelayStatus["thresholds"]> & { autoTripEnabled?: boolean }
  ) => {
    await apiRequest("/relay/thresholds", {
      method: "PATCH",
      body: JSON.stringify(updates),
    }).catch(() => {});
    fetchRelay();
  };

  return { ...relay, tripRelay, resetRelay, updateThresholds };
}

export function useRelayEvents(): RelayEvent[] {
  const [events, setEvents] = useState<RelayEvent[]>([]);

  const fetchEvents = () => {
    apiRequest<RelayEvent[]>("/relay/events")
      .then((data) => setEvents(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchEvents();
    const unsubscribe = subscribeWebSocket((event) => {
      if (event.type === "RELAY_TRIPPED" || event.type === "RELAY_STATUS_CHANGED") {
        fetchEvents();
      }
    });
    return unsubscribe;
  }, []);

  return events;
}

export function useAlerts(): AlertItem[] & {
  updateAlertStatus: (id: string, status: AlertItem["status"]) => Promise<void>;
} {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const fetchAlerts = () => {
    apiRequest<AlertItem[]>("/alerts")
      .then((data) => setAlerts(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchAlerts();
    const unsubscribe = subscribeWebSocket((event) => {
      if (event.type === "NEW_ALERT" || event.type === "ALERT_UPDATED" || event.type === "RELAY_TRIPPED") {
        fetchAlerts();
      }
    });
    return unsubscribe;
  }, []);

  const updateAlertStatus = async (id: string, status: AlertItem["status"]) => {
    await apiRequest(`/alerts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).catch(() => {});
    fetchAlerts();
  };

  const result = [...alerts] as any;
  result.updateAlertStatus = updateAlertStatus;
  return result;
}

export function useHistory(range: "day" | "week" | "month" | "year"): HistoryPoint[] {
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    apiRequest<HistoryPoint[]>(`/telemetry/history?range=${range}`)
      .then((data) => setHistory(data))
      .catch(() => {});
  }, [range]);

  return history;
}
