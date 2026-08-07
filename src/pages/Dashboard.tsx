import { Zap, Thermometer, Gauge, Droplets, Power, Wifi } from "lucide-react";
import { MetricTile } from "@/components/MetricTile";
import { StatusBadge } from "@/components/StatusBadge";
import { useAlerts, useDevice, useLiveReading, useRelayStatus } from "@/hooks/useSensorData";
import { useLanguage } from "@/context/LanguageContext";

export default function Dashboard() {
  const device = useDevice();
  const reading = useLiveReading();
  const relay = useRelayStatus();
  const alertsData = useAlerts();
  const alerts = (Array.isArray(alertsData) ? alertsData : []).slice(0, 5);
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-headline-lg text-on-surface">{device.name}</h1>
            <StatusBadge status={device.status} />
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {device.id} &middot; {device.location} &middot; updated{" "}
            {new Date(reading.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-md">
        <MetricTile label={t("dashboard.voltage")} value={reading.voltage.toFixed(0)} unit="V" icon={Zap} status="normal" />
        <MetricTile label={t("dashboard.current")} value={reading.current.toFixed(0)} unit="A" icon={Gauge} status="warning" />
        <MetricTile
          label={t("dashboard.temperature")}
          value={reading.temperature.toFixed(0)}
          unit="°C"
          icon={Thermometer}
          status={reading.temperature > 60 ? "critical" : "normal"}
        />
        <MetricTile label={t("dashboard.humidity")} value={reading.humidity.toFixed(0)} unit="%" icon={Droplets} status="normal" />
        <MetricTile
          label={t("dashboard.relay")}
          value={relay.state === "closed" ? t("dashboard.closed") : t("dashboard.tripped")}
          icon={Power}
          status={relay.state === "closed" ? "normal" : "critical"}
        />
        <MetricTile label={t("dashboard.device")} value={device.online ? t("dashboard.online") : t("dashboard.offline")} icon={Wifi} status="normal" />
      </div>

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
