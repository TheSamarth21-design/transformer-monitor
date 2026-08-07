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

const MOCK_DEVICE: TransformerDevice = {
  id: "TR-0042",
  name: "Distribution Transformer 42",
  location: "Sector 4B, Pimpri-Chinchwad",
  lat: 18.6298,
  lng: 73.8131,
  status: "warning",
  online: true,
  lastUpdated: new Date().toISOString(),
};

export function useLiveReading(): LiveReading {
  const [reading, setReading] = useState<LiveReading>({
    voltage: 230,
    current: 1.2,
    temperature: 48,
    humidity: 46,
    lat: 18.6298,
    lng: 73.8131,
    health: "normal",
    alertMsg: "System nominal",
    googleMapUrl: "https://maps.google.com/?q=18.6298,73.8131",
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    // Initial fetch
    apiRequest<LiveReading>("/telemetry/live")
      .then((data) => setReading(data))
      .catch(() => {});

    // WebSocket subscription for live stream
    const unsubscribe = subscribeWebSocket((event) => {
      if (event.type === "LIVE_READING" && event.data) {
        setReading(event.data);
      }
    });

    return unsubscribe;
  }, []);

  return reading;
}

export function useDevice(): TransformerDevice {
  const [device, setDevice] = useState<TransformerDevice>(MOCK_DEVICE);

  useEffect(() => {
    apiRequest<TransformerDevice>("/device")
      .then((data) => setDevice(data))
      .catch(() => {});

    const unsubscribe = subscribeWebSocket((event) => {
      if (event.type === "DEVICE_UPDATED" && event.data) {
        setDevice(event.data);
      }
    });

    return unsubscribe;
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
    autoTripEnabled: true,
    lastTripReason: "Over-temperature (92C)",
    lastTripAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    thresholds: {
      maxTemperature: 90,
      maxCurrent: 100,
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
    await apiRequest("/relay/trip", {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    fetchRelay();
  };

  const resetRelay = async () => {
    await apiRequest("/relay/reset", { method: "POST" });
    fetchRelay();
  };

  const updateThresholds = async (
    updates: Partial<RelayStatus["thresholds"]> & { autoTripEnabled?: boolean }
  ) => {
    await apiRequest("/relay/thresholds", {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
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
    });
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
