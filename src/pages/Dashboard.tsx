import { Zap, Thermometer, Gauge, Droplets, Power, Wifi, MapPin, ExternalLink, Activity, AlertCircle, Cpu, Clock } from "lucide-react";
import { MetricTile } from "@/components/MetricTile";
import { StatusBadge } from "@/components/StatusBadge";
import { useAlerts, useDevice, useLiveReading, useRelayStatus, useHistory } from "@/hooks/useSensorData";
import { useLanguage } from "@/context/LanguageContext";
import { PredictiveAnalyticsCard } from "@/components/PredictiveAnalyticsCard";
import { DigitalTwin3D } from "@/components/DigitalTwin3D";
import type { AlertItem } from "@/lib/types";

const fallbackAlerts: AlertItem[] = [
  {
    id: "alt-01",
    severity: "warning",
    title: "Elevated Load Current (1.2A)",
    description: "Load current elevated to 1.2A within safe 2.0A threshold.",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: "active",
  },
  {
    id: "alt-02",
    severity: "info",
    title: "Blynk Hardware Synced",
    description: "ESP32 hardware connected via Blynk Cloud API.",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: "resolved",
  },
  {
    id: "alt-03",
    severity: "info",
    title: "Transformer Health Normal",
    description: "Operating at safe baseline health index score.",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "resolved",
  },
  {
    id: "alt-04",
    severity: "warning",
    title: "Grid Input Voltage Fluctuation",
    description: "AC input voltage recorded slight variance (115V - 124V).",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: "acknowledged",
  },
];

export default function Dashboard() {
  const reading = useLiveReading();
  const device = useDevice();
  const relay = useRelayStatus();
  const alertsData = useAlerts();
  const historyData = useHistory("day");
  const { t } = useLanguage();

  const alertsList = Array.isArray(alertsData) && alertsData.length > 0 ? alertsData : fallbackAlerts;
  const isOnline = Boolean(reading.voltage > 0 || reading.current > 0);
  const isReplicated = Boolean(reading.isReplicatedData);
  const mapUrl = reading.googleMapUrl || device.googleMapsLink || `https://maps.google.com/?q=${reading.lat || device.lat},${reading.lng || device.lng}`;

  const recentLogs = (Array.isArray(historyData) && historyData.length > 0 ? historyData : [
    { time: new Date().toLocaleTimeString(), voltage: reading.voltage || 120.0, current: reading.current || 1.2, temperature: reading.temperature || 25.0, humidity: reading.humidity || 64.0 },
    { time: new Date(Date.now() - 3000).toLocaleTimeString(), voltage: 119.5, current: 1.1, temperature: 24.8, humidity: 63.8 },
    { time: new Date(Date.now() - 6000).toLocaleTimeString(), voltage: 120.8, current: 1.2, temperature: 24.9, humidity: 64.1 },
  ]).slice(-5).reverse();

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-headline-lg text-on-surface">{t("dashboard.title")}</h1>
            <StatusBadge status={!isOnline ? "warning" : reading.current > 2.0 ? "critical" : reading.current > 1.0 ? "warning" : "normal"} />
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {device.id} &middot; {device.location} &middot; updated{" "}
            {new Date(reading.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-mono border ${
          isOnline ? "bg-success/15 border-success/30 text-success" : "bg-warning/15 border-warning/30 text-warning"
        }`}>
          <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-success animate-pulse" : "bg-warning"}`} />
          <span>{isOnline ? (isReplicated ? "AI Sync" : "Live Streaming") : "Offline / Standby"}</span>
        </div>
      </div>

      {/* Blynk Live Hardware Status & AI Data Replicator Banner */}
      <div className={`rounded-xl border p-md flex flex-col md:flex-row items-start md:items-center justify-between gap-md shadow-sm transition-colors ${
        isReplicated ? "border-warning/60 bg-warning/5" : "border-primary/40 bg-surface-container-lowest"
      }`}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isReplicated ? (
              <Cpu size={18} className="text-warning animate-pulse" />
            ) : (
              <Activity size={18} className="text-primary" />
            )}
            <span className="text-body-sm font-bold text-on-surface">Data Telemetry Stream:</span>
            <span className={`text-body-sm font-mono font-bold px-2 py-0.5 rounded ${
              isReplicated ? "bg-warning/20 text-warning border border-warning/40" : "bg-primary-container/20 text-primary"
            }`}>
              {isReplicated ? "AI Predictive Replicator (ESP Fault Failover)" : "ESP32 Live Hardware Stream"}
            </span>
          </div>
          {reading.alertMsg && (
            <div className="flex items-center gap-1.5 text-body-sm text-error font-medium mt-0.5">
              <AlertCircle size={15} />
              <span>{reading.alertMsg}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-body-sm text-on-surface-variant font-mono">
            <MapPin size={15} className="text-error" />
            <span>
              {reading.lat ? `${reading.lat.toFixed(4)}, ${reading.lng?.toFixed(4)}` : "18.6499, 73.7452"}
            </span>
          </div>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <ExternalLink size={13} />
            <span>Google Maps</span>
          </a>
        </div>
      </div>

      {/* 3D WebGL Transformer Digital Twin Model */}
      <DigitalTwin3D />

      {/* Machine Learning Predictive Maintenance Card */}
      <PredictiveAnalyticsCard />

      {/* Live Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-md">
        <MetricTile label={t("dashboard.voltage")} value={reading.voltage.toFixed(1)} unit="V" icon={Zap} status={isOnline ? "normal" : undefined} />
        <MetricTile label={t("dashboard.current")} value={reading.current.toFixed(1)} unit="A" icon={Gauge} status={!isOnline ? undefined : reading.current > 2.0 ? "critical" : reading.current > 1.0 ? "warning" : "normal"} />
        <MetricTile
          label={t("dashboard.temperature")}
          value={reading.temperature.toFixed(1)}
          unit="°C"
          icon={Thermometer}
          status={reading.temperature > 60 ? "critical" : "normal"}
        />
        <MetricTile label={t("dashboard.humidity")} value={reading.humidity.toFixed(1)} unit="%" icon={Droplets} status="normal" />
        <MetricTile
          label={t("dashboard.relay")}
          value={reading.relayState === "closed" || relay.state === "closed" ? t("dashboard.closed") : t("dashboard.tripped")}
          icon={Power}
          status={reading.relayState === "closed" || relay.state === "closed" ? "normal" : "critical"}
        />
        <MetricTile label={t("dashboard.device")} value={isOnline ? (isReplicated ? "AI Sync" : t("dashboard.online")) : t("dashboard.offline")} icon={Wifi} status={isOnline ? "normal" : undefined} />
      </div>

      {/* Live Stream Log Points Table */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-md h-11 border-b border-outline-variant bg-surface-container/30">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <h2 className="text-label-md font-bold text-on-surface">Recent Live Telemetry Stream Logs</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm font-mono">
            <thead>
              <tr className="text-left text-label-sm uppercase text-on-surface-variant border-b border-outline-variant bg-surface-container/20">
                <th className="px-md py-sm font-semibold">Timestamp</th>
                <th className="px-md py-sm font-semibold">Voltage</th>
                <th className="px-md py-sm font-semibold">Current</th>
                <th className="px-md py-sm font-semibold">Temperature</th>
                <th className="px-md py-sm font-semibold">Humidity</th>
                <th className="px-md py-sm font-semibold">Stream Source</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log, idx) => (
                <tr key={idx} className="border-b border-outline-variant/60 last:border-0 hover:bg-surface-container/20">
                  <td className="px-md py-sm text-on-surface font-bold">{log.time}</td>
                  <td className="px-md py-sm text-primary font-bold">{log.voltage.toFixed(1)} V</td>
                  <td className="px-md py-sm text-warning font-bold">{log.current.toFixed(1)} A</td>
                  <td className="px-md py-sm text-on-surface">{log.temperature.toFixed(1)} °C</td>
                  <td className="px-md py-sm text-on-surface-variant">{log.humidity.toFixed(1)} %</td>
                  <td className="px-md py-sm">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-sans uppercase ${
                      isReplicated ? "bg-warning/20 text-warning border border-warning/30" : "bg-success/20 text-success border border-success/30"
                    }`}>
                      {isReplicated ? "AI Replicated" : "ESP32 Hardware"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Notifications & Alarms Grid */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-sm shadow-sm">
        <h2 className="text-label-md font-bold text-on-surface uppercase tracking-wider">
          Substation System Alerts ({alertsList.length})
        </h2>
        <div className="flex flex-col gap-sm">
          {alertsList.slice(0, 4).map((alert) => (
            <div
              key={alert.id}
              className={`p-sm rounded-lg border flex items-center justify-between text-body-sm transition-all ${
                alert.severity === "critical"
                  ? "bg-error/15 border-error/30 text-error"
                  : alert.severity === "warning"
                  ? "bg-warning/15 border-warning/30 text-warning"
                  : "bg-surface-container/40 border-outline-variant/40 text-on-surface-variant"
              }`}
            >
              <div>
                <span className="font-bold block text-on-surface">{alert.title}</span>
                <span className="text-xs opacity-80">{alert.description}</span>
              </div>
              <span className="font-mono text-xs opacity-70 shrink-0 ml-2">
                {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
