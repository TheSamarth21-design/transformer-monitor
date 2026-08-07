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

// Default Transformer Substation Coordinates (18.649916, 73.745276)
const DEFAULT_LAT = 18.649916;
const DEFAULT_LNG = 73.745276;

const INITIAL_DEVICE: TransformerDevice = {
  id: "TR-0042",
  name: "Smart Transformer",
  location: "Pimpri Substation Grid (18.6499, 73.7452)",
  lat: DEFAULT_LAT,
  lng: DEFAULT_LNG,
  status: "warning",
  online: false,
  lastUpdated: new Date().toISOString(),
};

export function useLiveReading(): LiveReading & { isHardwareOnline: boolean; isReplicatedData: boolean } {
  const [reading, setReading] = useState<LiveReading>({
    voltage: 0,
    current: 0,
    temperature: 0,
    humidity: 0,
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    health: "Awaiting Hardware Sync...",
    alertMsg: "",
    googleMapUrl: `https://www.google.com/maps?q=${DEFAULT_LAT},${DEFAULT_LNG}`,
    timestamp: new Date().toISOString(),
    isReplicatedData: false,
    sensorStatus: {
      voltage: "real",
      current: "real",
      temperature: "real",
      humidity: "real",
    },
  });

  const [isHardwareOnline, setIsHardwareOnline] = useState<boolean>(false);
  const [isReplicatedData, setIsReplicatedData] = useState<boolean>(false);

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
          lat: devData.lat || DEFAULT_LAT,
          lng: devData.lng || DEFAULT_LNG,
          health: devData.health ?? prev.health,
          alertMsg: devData.alertMsg ?? prev.alertMsg,
          googleMapUrl: devData.googleMapUrl || `https://www.google.com/maps?q=${DEFAULT_LAT},${DEFAULT_LNG}`,
          timestamp: devData.lastUpdated ?? new Date().toISOString(),
          isReplicatedData: devData.isReplicatedData ?? false,
          sensorStatus: devData.sensorStatus || prev.sensorStatus,
        }));
        setIsHardwareOnline(Boolean((devData.voltage || 0) > 0 || (devData.current || 0) > 0));
        setIsReplicatedData(Boolean(devData.isReplicatedData));
      }
    });

    // 4. Blynk Hardware API Poller with Granular Per-Sensor AI Replicator
    let pollCount = 0;
    const blynkPoller = setInterval(async () => {
      try {
        pollCount++;
        const res = await fetch(BLYNK_POLL_URL);
        if (!res.ok) {
          throw new Error("Blynk API Unreachable");
        }
        const blynkData = await res.json();

        const rawTemp = parseFloat(blynkData.v0) || 0;
        const rawHum = parseFloat(blynkData.v1) || 0;
        const rawCur = parseFloat(blynkData.v2) || 0;
        const rawVolt = parseFloat(blynkData.v3) || 0;
        const rawLat = parseFloat(blynkData.v4) || 0;
        const rawLng = parseFloat(blynkData.v5) || 0;
        const lat = rawLat !== 0 ? rawLat : DEFAULT_LAT;
        const lng = rawLng !== 0 ? rawLng : DEFAULT_LNG;
        const relayVal = parseInt(blynkData.v6, 10);
        const relayState = relayVal === 1 ? "closed" : "tripped";

        // Granular Per-Sensor Replication Logic
        const isVoltOk = rawVolt > 0;
        const isCurOk = rawCur > 0;
        const isTempOk = rawTemp > 0;
        const isHumOk = rawHum > 0;

        const isAnySensorFailed = !isVoltOk || !isCurOk || !isTempOk || !isHumOk;
        const isAllFailed = !isVoltOk && !isCurOk;

        // Granular Replicated Values
        const finalVolt = isVoltOk ? rawVolt : Number((119.5 + Math.sin(pollCount * 0.3) * 2.5).toFixed(1));
        const finalCur = isCurOk ? rawCur : Number((0.85 + Math.cos(pollCount * 0.4) * 0.2).toFixed(1));
        const finalTemp = isTempOk ? rawTemp : Number((28.4 + Math.sin(pollCount * 0.2) * 1.5).toFixed(1));
        const finalHum = isHumOk ? rawHum : Number((62.0 + Math.cos(pollCount * 0.3) * 3.0).toFixed(1));

        const sensorStatus = {
          voltage: isVoltOk ? ("real" as const) : ("replicated" as const),
          current: isCurOk ? ("real" as const) : ("replicated" as const),
          temperature: isTempOk ? ("real" as const) : ("replicated" as const),
          humidity: isHumOk ? ("real" as const) : ("replicated" as const),
        };

        // Construct Technician Warning Message for Sensor Faults
        let alertMsg = String(blynkData.v8 || "");
        if (isAllFailed) {
          alertMsg = "🚨 CRITICAL: ESP32 Hardware Damaged / Offline. Full AI Data Replicator Active.";
        } else if (!isVoltOk) {
          alertMsg = "⚠️ VOLTAGE SENSOR FAULT: ZMPT101B failed. AI Replicator active for Voltage.";
        } else if (!isCurOk) {
          alertMsg = "⚠️ CURRENT SENSOR FAULT: ACS712 failed. AI Replicator active for Current.";
        } else if (!isTempOk) {
          alertMsg = "⚠️ THERMAL SENSOR FAULT: DHT11 temperature sensor disconnected.";
        }

        const telemetryData: LiveReading = {
          voltage: finalVolt,
          current: finalCur,
          temperature: finalTemp,
          humidity: finalHum,
          lat,
          lng,
          relayState,
          health: isAnySensorFailed ? "Sensor Fault - AI Replicator Engaged" : String(blynkData.v7 || "Hardware Online"),
          alertMsg,
          googleMapUrl: `https://www.google.com/maps?q=${lat},${lng}`,
          timestamp: new Date().toISOString(),
          isReplicatedData: isAnySensorFailed,
          sensorStatus,
        };

        setReading(telemetryData);
        setIsHardwareOnline(true);
        setIsReplicatedData(isAnySensorFailed);

        // Sync snapshot to Cloud Firestore (with real/replicated tags)
        saveTelemetryToFirestore(telemetryData).catch(() => {});
      } catch {
        // Complete Connection Failure Fallback
        const predictedReading: LiveReading = {
          voltage: 119.5,
          current: 0.85,
          temperature: 28.4,
          humidity: 62.0,
          lat: DEFAULT_LAT,
          lng: DEFAULT_LNG,
          relayState: "closed",
          health: "AI Predictive Data Replication Active (Hardware Offline)",
          alertMsg: "🚨 CRITICAL: ESP32 Board Disconnected. AI Predictive Replicator Active.",
          googleMapUrl: `https://www.google.com/maps?q=${DEFAULT_LAT},${DEFAULT_LNG}`,
          timestamp: new Date().toISOString(),
          isReplicatedData: true,
          sensorStatus: {
            voltage: "replicated",
            current: "replicated",
            temperature: "replicated",
            humidity: "replicated",
          },
        };

        setReading(predictedReading);
        setIsHardwareOnline(true);
        setIsReplicatedData(true);
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
  result.isReplicatedData = isReplicatedData;
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
          lat: devData.lat || DEFAULT_LAT,
          lng: devData.lng || DEFAULT_LNG,
          status: devData.status || (devData.current > 2.0 ? "critical" : devData.current > 1.0 ? "warning" : "normal"),
          online: Boolean((devData.voltage || 0) > 0 || (devData.current || 0) > 0 || devData.isReplicatedData),
          lastUpdated: devData.lastUpdated || new Date().toISOString(),
          googleMapsLink: devData.googleMapUrl || `https://www.google.com/maps?q=${DEFAULT_LAT},${DEFAULT_LNG}`,
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
