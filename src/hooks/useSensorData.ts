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
import { subscribeFirebaseLiveDevice, subscribeFirebaseTelemetryHistory, saveTelemetryToFirestore } from "@/lib/firebase";

const BLYNK_TOKEN = "uR3iUqcSJMTS7-OEfnsuSDj-5Sqrxl0L";
const BLYNK_POLL_URL = `https://blynk.cloud/external/api/get?token=${BLYNK_TOKEN}&v0&v1&v2&v3&v4&v5&v6&v7&v8&v9`;

const INITIAL_DEVICE: TransformerDevice = {
  id: "TR-0042",
  name: "Smart Transformer",
  location: "Awaiting Blynk Hardware GPS Sync",
  lat: 0,
  lng: 0,
  status: "warning",
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
          setIsHardwareOnline(Boolean(data.voltage > 0 || data.current > 0));
        }
      })
      .catch(() => {});

    // 2. Local WebSocket Subscription
    const unsubscribeWs = subscribeWebSocket((event) => {
      if (event.type === "LIVE_READING" && event.data) {
        setReading(event.data);
        setIsHardwareOnline(Boolean(event.data.voltage > 0 || event.data.current > 0));
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
        setIsHardwareOnline(Boolean((devData.voltage || 0) > 0 || (devData.current || 0) > 0));
      }
    });

    // 4. Pure Real Blynk Hardware API Poller (ONLINE ONLY WHEN VOLTAGE > 0 OR CURRENT > 0)
    const blynkPoller = setInterval(async () => {
      try {
        const res = await fetch(BLYNK_POLL_URL);
        if (!res.ok) {
          setIsHardwareOnline(false);
          return;
        }
        const blynkData = await res.json();

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
        
        // STRICT RULE: Device is ONLINE ONLY when Voltage > 0 or Current > 0
        const activeOnline = Boolean(volt > 0 || cur > 0);
        setIsHardwareOnline(activeOnline);

        // Sync real hardware telemetry snapshot to Cloud Firestore if active
        if (activeOnline) {
          saveTelemetryToFirestore(realReading).catch(() => {});
        }
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
          online: Boolean((devData.voltage || 0) > 0 || (devData.current || 0) > 0),
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
  const liveReading = useLiveReading();

  useEffect(() => {
    // 1. Local backend REST fetch
    apiRequest<HistoryPoint[]>(`/telemetry/history?range=${range}`)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setHistory(data);
        }
      })
      .catch(() => {});

    // 2. Cloud Firestore Telemetry stream listener
    const unsubscribeFb = subscribeFirebaseTelemetryHistory((fbItems: any[]) => {
      if (Array.isArray(fbItems) && fbItems.length > 0) {
        const formatted = fbItems
          .reverse()
          .map((item) => ({
            time: new Date(item.createdAt || item.timestamp || Date.now()).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            voltage: Number(item.voltage || 0),
            current: Number(item.current || 0),
            temperature: Number(item.temperature || 0),
            humidity: Number(item.humidity || 0),
          }));
        setHistory(formatted);
      }
    });

    return () => {
      unsubscribeFb();
    };
  }, [range]);

  // 3. Continuously append live streaming Blynk hardware telemetry to historical chart buffer
  useEffect(() => {
    if (liveReading.timestamp) {
      const timeStr = new Date(liveReading.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setHistory((prev) => {
        // If history is empty, generate an initial rolling history around active readings
        if (prev.length === 0) {
          const now = Date.now();
          const basePoints: HistoryPoint[] = [];
          for (let i = 9; i >= 0; i--) {
            const pastTime = new Date(now - i * 3000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            basePoints.push({
              time: pastTime,
              voltage: Number(liveReading.voltage.toFixed(1)),
              current: Number(liveReading.current.toFixed(1)),
              temperature: Number(liveReading.temperature.toFixed(1)),
              humidity: Number(liveReading.humidity.toFixed(1)),
            });
          }
          return basePoints;
        }

        // Prevent duplicate timestamp entries
        if (prev[prev.length - 1]?.time === timeStr) {
          return prev;
        }

        const newPoint: HistoryPoint = {
          time: timeStr,
          voltage: Number(liveReading.voltage.toFixed(1)),
          current: Number(liveReading.current.toFixed(1)),
          temperature: Number(liveReading.temperature.toFixed(1)),
          humidity: Number(liveReading.humidity.toFixed(1)),
        };

        const updated = [...prev, newPoint];
        return updated.slice(-25); // Keep rolling 25 recent data points for smooth line graphs
      });
    }
  }, [liveReading.timestamp, liveReading.voltage, liveReading.current, liveReading.temperature, liveReading.humidity]);

  return history;
}
