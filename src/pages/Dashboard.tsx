import { Zap, Thermometer, Gauge, Droplets, Power, Wifi, MapPin, ExternalLink, Activity, AlertCircle, Cpu } from "lucide-react";
import { MetricTile } from "@/components/MetricTile";
import { StatusBadge } from "@/components/StatusBadge";
import { useAlerts, useDevice, useLiveReading, useRelayStatus } from "@/hooks/useSensorData";
import { useLanguage } from "@/context/LanguageContext";
import { PredictiveAnalyticsCard } from "@/components/PredictiveAnalyticsCard";

export default function Dashboard() {
  const device = useDevice();
  const reading = useLiveReading();
  const relay = useRelayStatus();
  const alertsData = useAlerts();
  const alerts = (Array.isArray(alertsData) ? alertsData : []).slice(0, 5);
  const { t } = useLanguage();

  const mapUrl = reading.googleMapUrl || device.googleMapsLink || `https://maps.google.com/?q=${reading.lat || device.lat},${reading.lng || device.lng}`;
  
  const isOnline = Boolean(reading.voltage > 0 || reading.current > 0);
  const isReplicated = Boolean(reading.isReplicatedData);

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

      {/* Recent Alerts Table */}
      <div className="rounded border border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center justify-between px-md h-11 border-b border-outline-variant">
          <h2 className="text-label-md text-on-surface">{t("dashboard.recentAlerts")}</h2>
          <a href="/alerts" className="text-body-sm text-primary hover:underline">
            {t("dashboard.viewAll")}
          </a>
        </div>
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-left text-label-sm uppercase text-on-surface-variant border-b border-outline-variant">
              <th className="px-md py-sm font-medium">{t("dashboard.severity")}</th>
              <th className="px-md py-sm font-medium">{t("dashboard.alert")}</th>
              <th className="px-md py-sm font-medium">{t("dashboard.time")}</th>
              <th className="px-md py-sm font-medium">{t("dashboard.status")}</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-b border-outline-variant last:border-0">
                <td className="px-md py-sm">
                  <StatusBadge status={a.severity === "critical" ? "critical" : a.severity === "warning" ? "warning" : "info"} />
                </td>
                <td className="px-md py-sm text-on-surface">{a.title}</td>
                <td className="px-md py-sm text-on-surface-variant font-mono">
                  {new Date(a.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-md py-sm text-on-surface-variant capitalize">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
