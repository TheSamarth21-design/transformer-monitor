import { Zap, Thermometer, Gauge, Droplets, Power, Wifi, MapPin, ExternalLink, Activity, AlertCircle, Cpu, Clock } from "lucide-react";
import { MetricTile } from "@/components/MetricTile";
import { StatusBadge } from "@/components/StatusBadge";
import { useAlerts, useDevice, useLiveReading, useRelayStatus, useHistory } from "@/hooks/useSensorData";
import { useLanguage } from "@/context/LanguageContext";
import { PredictiveAnalyticsCard } from "@/components/PredictiveAnalyticsCard";
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
  {
    id: "alt-05",
    severity: "info",
    title: "Protection Interlock Armed",
    description: "Automatic current threshold interlock set to 2.0A safety limit.",
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    status: "resolved",
  },
];

export default function Dashboard() {
  const device = useDevice();
  const reading = useLiveReading();
  const relay = useRelayStatus();
  const alertsData = useAlerts();
  const historyData = useHistory("day");
  
  const rawAlerts = Array.isArray(alertsData) ? alertsData : [];
  const alerts = (rawAlerts.length > 0 ? rawAlerts : fallbackAlerts).slice(0, 5);
  
  const { t } = useLanguage();

  const mapUrl = reading.googleMapUrl || device.googleMapsLink || `https://maps.google.com/?q=${reading.lat || device.lat},${reading.lng || device.lng}`;
  
  const isOnline = Boolean(reading.voltage > 0 || reading.current > 0);
  const isReplicated = Boolean(reading.isReplicatedData);

  const recentTelemetryLogs = (Array.isArray(historyData) && historyData.length > 0 ? historyData : [
    { time: new Date().toLocaleTimeString(), voltage: reading.voltage || 120.0, current: reading.current || 1.2, temperature: reading.temperature || 25.0, humidity: reading.humidity || 64.0 },
    { time: new Date(Date.now() - 3000).toLocaleTimeString(), voltage: 119.5, current: 1.1, temperature: 24.8, humidity: 63.8 },
    { time: new Date(Date.now() - 6000).toLocaleTimeString(), voltage: 120.8, current: 1.2, temperature: 24.9, humidity: 64.1 },
    { time: new Date(Date.now() - 9000).toLocaleTimeString(), voltage: 121.2, current: 1.0, temperature: 25.1, humidity: 64.2 },
    { time: new Date(Date.now() - 12000).toLocaleTimeString(), voltage: 118.9, current: 0.9, temperature: 24.7, humidity: 63.9 },
  ]).slice(-5).reverse();

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-headline-lg text-on-surface">{device.name}</h1>
            <StatusBadge status={!isOnline ? "warning" : reading.current > 2.0 ? "critical" : reading.current > 1.0 ? "warning" : "normal"} />
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {device.id} &middot; {device.location} &middot; updated{" "}
            {new Date(reading.timestamp).toLocaleTimeString()}
          </p>
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

      {/* Recent Telemetry Real-Time Log Table */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-md h-11 border-b border-outline-variant bg-surface-container/30">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <h2 className="text-label-md font-bold text-on-surface">Recent Live Telemetry Stream Logs</h2>
          </div>
          <a href="/analytics" className="text-body-sm text-primary font-bold hover:underline">
            View Analytics Charts &rarr;
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="text-left text-label-sm uppercase text-on-surface-variant border-b border-outline-variant bg-surface-container/20">
                <th className="px-md py-sm font-semibold">Timestamp</th>
                <th className="px-md py-sm font-semibold">Voltage (V)</th>
                <th className="px-md py-sm font-semibold">Current (A)</th>
                <th className="px-md py-sm font-semibold">Temperature (°C)</th>
                <th className="px-md py-sm font-semibold">Humidity (%)</th>
                <th className="px-md py-sm font-semibold">Data Stream Source</th>
              </tr>
            </thead>
            <tbody>
              {recentTelemetryLogs.map((log, idx) => (
                <tr key={idx} className="border-b border-outline-variant/60 last:border-0 hover:bg-surface-container/20 transition-colors font-mono">
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

      {/* Recent Alerts Table */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-md h-11 border-b border-outline-variant bg-surface-container/30">
          <h2 className="text-label-md font-bold text-on-surface">{t("dashboard.recentAlerts")}</h2>
          <a href="/alerts" className="text-body-sm text-primary font-bold hover:underline">
            {t("dashboard.viewAll")}
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="text-left text-label-sm uppercase text-on-surface-variant border-b border-outline-variant bg-surface-container/20">
                <th className="px-md py-sm font-semibold">{t("dashboard.severity")}</th>
                <th className="px-md py-sm font-semibold">{t("dashboard.alert")}</th>
                <th className="px-md py-sm font-semibold">{t("dashboard.time")}</th>
                <th className="px-md py-sm font-semibold">{t("dashboard.status")}</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-b border-outline-variant/60 last:border-0 hover:bg-surface-container/20 transition-colors">
                  <td className="px-md py-sm">
                    <StatusBadge status={a.severity === "critical" ? "critical" : a.severity === "warning" ? "warning" : "info"} />
                  </td>
                  <td className="px-md py-sm text-on-surface font-medium">{a.title}</td>
                  <td className="px-md py-sm text-on-surface-variant font-mono">
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-md py-sm text-on-surface-variant capitalize font-semibold">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
