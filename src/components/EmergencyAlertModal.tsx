import { useEffect, useState } from "react";
import { AlertTriangle, MapPin, ExternalLink, ShieldAlert, Power, CheckCircle, X } from "lucide-react";
import { subscribeWebSocket, apiRequest } from "@/lib/api";
import { triggerHapticVibration, playEmergencyAlarmSound, stopEmergencyAlarmSound } from "@/lib/notifications";

export interface EmergencyAlertData {
  alertId?: string;
  deviceId: string;
  deviceName: string;
  location: string;
  lat: number;
  lng: number;
  googleMapUrl?: string;
  cause: string;
  timestamp: string;
  voltage: number;
  current: number;
  temperature: number;
  humidity: number;
  relayState: string;
}

export function EmergencyAlertModal() {
  const [alertData, setAlertData] = useState<EmergencyAlertData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  const dismissCurrentAlert = (key?: string) => {
    stopEmergencyAlarmSound();
    if (key) {
      setDismissedKeys((prev) => new Set(prev).add(key));
    } else if (alertData) {
      const activeKey = alertData.alertId || alertData.timestamp || alertData.cause;
      setDismissedKeys((prev) => new Set(prev).add(activeKey));
    }
    setAlertData(null);
  };

  useEffect(() => {
    const unsubscribe = subscribeWebSocket((event) => {
      if (event.type === "EMERGENCY_POPUP_ALERT" && event.data) {
        const key = event.data.alertId || event.data.timestamp || event.data.cause;
        if (!dismissedKeys.has(key)) {
          setAlertData(event.data);
          triggerHapticVibration();
          playEmergencyAlarmSound(10); // Play 10-second siren
        }
      } else if (event.type === "RELAY_TRIPPED" && event.data) {
        const cause = event.data.reason || "Over-current Overload (Exceeded 1.5A limit)";
        const key = event.data.timestamp || cause;
        if (!dismissedKeys.has(key)) {
          setAlertData({
            deviceId: "TR-0042",
            deviceName: "Distribution Transformer 42",
            location: "Sector 4B, Pimpri-Chinchwad",
            lat: 18.6298,
            lng: 73.8131,
            googleMapUrl: `https://www.google.com/maps?q=18.6298,73.8131`,
            cause,
            timestamp: event.data.timestamp || new Date().toISOString(),
            voltage: 231,
            current: 2.8, // > 1.5A threshold
            temperature: 64,
            humidity: 48,
            relayState: "tripped",
          });
          triggerHapticVibration();
          playEmergencyAlarmSound(10); // Play 10-second siren
        }
      } else if (event.type === "LIVE_READING" && event.data) {
        // Check if load current exceeds 1.5A threshold automatically
        if (event.data.current > 1.5) {
          const key = `current-overload-${event.data.relayState}`;
          if (!dismissedKeys.has(key) && alertData === null) {
            setAlertData({
              deviceId: "TR-0042",
              deviceName: "Distribution Transformer 42",
              location: "Sector 4B, Pimpri-Chinchwad",
              lat: event.data.lat || 18.6298,
              lng: event.data.lng || 73.8131,
              googleMapUrl: (event.data.googleMapUrl && event.data.googleMapUrl.startsWith("http"))
                ? event.data.googleMapUrl
                : `https://www.google.com/maps?q=${event.data.lat || 18.6298},${event.data.lng || 73.8131}`,
              cause: `Over-current Overload (${event.data.current.toFixed(1)}A > 1.5A safety threshold limit)`,
              timestamp: event.data.timestamp || new Date().toISOString(),
              voltage: event.data.voltage,
              current: event.data.current,
              temperature: event.data.temperature,
              humidity: event.data.humidity,
              relayState: "tripped",
            });
            triggerHapticVibration();
            playEmergencyAlarmSound(10); // Play 10-second siren
          }
        }
      } else if (event.type === "RELAY_STATUS_CHANGED" && event.data?.state === "closed") {
        // Reset dismissed keys when relay is reset back to normal
        setDismissedKeys(new Set());
        stopEmergencyAlarmSound();
        setAlertData(null);
      }
    });

    return unsubscribe;
  }, [alertData, dismissedKeys]);

  if (!alertData) return null;

  const handleResetRelay = async () => {
    setLoading(true);
    try {
      await apiRequest("/relay/reset", { method: "POST" });
      dismissCurrentAlert();
    } catch (err: any) {
      alert("Failed to reset relay: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (alertData.alertId) {
      try {
        await apiRequest(`/alerts/${alertData.alertId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "acknowledged" }),
        });
      } catch {
        // Ignore
      }
    }
    dismissCurrentAlert();
  };

  const rawUrl = alertData.googleMapUrl;
  const mapLink = (rawUrl && rawUrl.startsWith("http"))
    ? rawUrl
    : `https://www.google.com/maps?q=${(alertData.lat && alertData.lat !== 0) ? alertData.lat : 18.6298},${(alertData.lng && alertData.lng !== 0) ? alertData.lng : 73.8131}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1e1e24] border-2 border-error/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white">
        
        {/* Animated Emergency Banner */}
        <div className="bg-error/20 border-b border-error/30 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-error opacity-75"></span>
              <ShieldAlert className="h-7 w-7 text-error relative z-10" />
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wider text-error">
                🚨 Emergency Alert
              </h2>
              <p className="text-xs text-white/70">
                Automated Protection Interlock Active
              </p>
            </div>
          </div>
          <button
            onClick={() => dismissCurrentAlert()}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Diagnostic Details */}
        <div className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          
          {/* Damaged Transformer Identity */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Damaged Transformer
              </span>
              <span className="text-xs font-mono bg-error/20 text-error px-2 py-0.5 rounded font-bold">
                TRIPPED
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mt-0.5">
              {alertData.deviceName}
            </h3>
            <p className="text-xs text-white/60 font-mono">
              ID: {alertData.deviceId} &middot; {new Date(alertData.timestamp).toLocaleTimeString()}
            </p>
          </div>

          {/* Root Cause Failure Breakdown */}
          <div className="bg-error/10 border border-error/40 rounded-xl p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-error font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Cause of Damage / Overload</span>
            </div>
            <p className="text-sm font-semibold text-white/90">
              {alertData.cause}
            </p>
          </div>

          {/* Location & GPS Direct Maps Button */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-white/70">
              <MapPin size={15} className="text-error" />
              <span>Substation Location</span>
            </div>
            <p className="text-sm text-white font-medium">
              {alertData.location}
            </p>
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <ExternalLink size={16} />
              <span>OPEN GOOGLE MAPS</span>
            </a>
          </div>

          {/* Telemetry Snapshot Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col">
              <span className="text-xs text-white/60 uppercase">Load Current</span>
              <span className="text-lg font-bold font-mono text-error">
                {alertData.current.toFixed(1)} A
              </span>
              <span className="text-[10px] text-error font-semibold">Exceeds 1.5A Limit</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col">
              <span className="text-xs text-white/60 uppercase">Temperature</span>
              <span className="text-lg font-bold font-mono text-white">
                {alertData.temperature.toFixed(1)} °C
              </span>
              <span className="text-[10px] text-white/50">Limit: 90°C</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col">
              <span className="text-xs text-white/60 uppercase">Voltage</span>
              <span className="text-lg font-bold font-mono text-white">
                {alertData.voltage.toFixed(0)} V
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col">
              <span className="text-xs text-white/60 uppercase">Humidity</span>
              <span className="text-lg font-bold font-mono text-white">
                {alertData.humidity.toFixed(0)} %
              </span>
            </div>
          </div>

        </div>

        {/* Quick Interlock Actions */}
        <div className="bg-white/5 border-t border-white/10 p-4 flex flex-col gap-2">
          <button
            onClick={handleResetRelay}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-success text-on-success font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <Power size={18} />
            <span>{loading ? "Resetting Relay..." : "RESET RELAY NOW"}</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleAcknowledge}
              className="flex-1 py-2.5 rounded-xl border border-white/20 bg-white/5 text-white font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-white/10 cursor-pointer"
            >
              <CheckCircle size={15} />
              <span>Acknowledge</span>
            </button>
            <button
              onClick={() => dismissCurrentAlert()}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 font-medium text-xs hover:text-white hover:bg-white/5 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
