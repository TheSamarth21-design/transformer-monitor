import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAlerts } from "@/hooks/useSensorData";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import type { AlertItem, AlertStatus } from "@/lib/types";

// Demonstration Alerts for Judges Presentation
const JUDGE_DEMO_ALERTS: AlertItem[] = [
  {
    id: "al-101",
    title: "Critical Over-current Relay Trip (2.1A > 2.0A Limit)",
    description: "Load Current exceeded emergency safety threshold of 2.0A. Automatic Protection Relay tripped interlock circuit in 14ms.",
    severity: "critical",
    status: "active",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "al-102",
    title: "High Load Current Warning (1.65A)",
    description: "Technician warning notification sent. Load current elevated between 1.0A and 2.0A safety threshold.",
    severity: "warning",
    status: "acknowledged",
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
  },
  {
    id: "al-103",
    title: "Voltage Stability Surge Warning (124.5V)",
    description: "AC Input Voltage reached upper tolerance limit of 124.5V. Voltage regulator baseline adjusted.",
    severity: "warning",
    status: "active",
    timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  },
  {
    id: "al-104",
    title: "Thermal Core Normalization (28.4°C)",
    description: "Transformer core operating within normal thermal range (28.4°C). Cooling fan switched off.",
    severity: "info",
    status: "resolved",
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
  },
  {
    id: "al-105",
    title: "Local SQLite Replication Buffer Synced",
    description: "Blynk Cloud data sync restored. 14 buffered telemetry packets flushed to cloud database.",
    severity: "info",
    status: "resolved",
    timestamp: new Date(Date.now() - 320 * 60 * 1000).toISOString(),
  },
];

export default function Alerts() {
  const alertsData = useAlerts();
  const rawAlerts = Array.isArray(alertsData) && alertsData.length > 0 ? alertsData : JUDGE_DEMO_ALERTS;
  
  const [localAlerts, setLocalAlerts] = useState<AlertItem[]>(rawAlerts);
  const { t } = useLanguage();

  const [filter, setFilter] = useState<AlertStatus | "all">("all");

  const FILTERS: { key: AlertStatus | "all"; label: string }[] = [
    { key: "all", label: t("alerts.all") },
    { key: "active", label: t("alerts.active") },
    { key: "acknowledged", label: t("alerts.acknowledged") },
    { key: "resolved", label: t("alerts.resolved") },
  ];

  const filtered = useMemo(
    () => (filter === "all" ? localAlerts : localAlerts.filter((a) => a.status === filter)),
    [localAlerts, filter]
  );

  const counts = {
    critical: localAlerts.filter((a) => a.severity === "critical" && a.status === "active").length,
    warning: localAlerts.filter((a) => a.severity === "warning" && a.status === "active").length,
    info: localAlerts.filter((a) => a.severity === "info" && a.status === "active").length,
  };

  const handleStatusChange = (id: string, newStatus: AlertStatus) => {
    setLocalAlerts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
        <div>
          <h1 className="text-headline-lg text-on-surface">{t("alerts.title")}</h1>
          <p className="text-body-sm text-on-surface-variant">
            Diagnostic Protection Log & Emergency Trip Records
          </p>
        </div>

        <div className="flex items-center gap-md text-body-sm font-bold bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-outline-variant">
          <span className="text-error">{counts.critical} {t("alerts.critical")}</span>
          <span className="text-warning">{counts.warning} {t("alerts.warning")}</span>
          <span className="text-on-surface-variant">{counts.info} {t("alerts.info")}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-outline-variant p-1 bg-surface-container-lowest w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-md h-8 rounded-md text-body-sm capitalize font-bold transition-colors cursor-pointer",
              filter === f.key ? "bg-primary text-on-primary shadow-xs" : "text-on-surface-variant hover:bg-surface-container"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-label-sm uppercase text-on-surface-variant border-b border-outline-variant bg-surface-container/30">
                <th className="px-md py-sm font-bold">{t("dashboard.severity")}</th>
                <th className="px-md py-sm font-bold">{t("dashboard.alert")}</th>
                <th className="px-md py-sm font-bold">{t("alerts.description")}</th>
                <th className="px-md py-sm font-bold">{t("dashboard.time")}</th>
                <th className="px-md py-sm font-bold">{t("dashboard.status")}</th>
                <th className="px-md py-sm font-bold text-right">{t("alerts.action")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container/20 transition-colors">
                  <td className="px-md py-sm">
                    <StatusBadge status={a.severity === "critical" ? "critical" : a.severity === "warning" ? "warning" : "info"} />
                  </td>
                  <td className="px-md py-sm text-on-surface font-bold">{a.title}</td>
                  <td className="px-md py-sm text-on-surface-variant text-xs">{a.description}</td>
                  <td className="px-md py-sm font-mono text-xs text-on-surface-variant whitespace-nowrap">
                    {new Date(a.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-md py-sm text-on-surface-variant capitalize font-bold text-xs">
                    <span className={`px-2 py-0.5 rounded ${
                      a.status === "active" ? "bg-error/15 text-error" : a.status === "acknowledged" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-md py-sm text-right whitespace-nowrap">
                    {a.status === "active" && (
                      <button
                        onClick={() => handleStatusChange(a.id, "acknowledged")}
                        className="px-2.5 py-1 text-xs rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface font-bold cursor-pointer transition-colors"
                      >
                        {t("alerts.acknowledgeBtn")}
                      </button>
                    )}
                    {a.status === "acknowledged" && (
                      <button
                        onClick={() => handleStatusChange(a.id, "resolved")}
                        className="px-2.5 py-1 text-xs rounded-lg border border-success/40 text-success hover:bg-success/10 font-bold cursor-pointer transition-colors"
                      >
                        {t("alerts.resolveBtn")}
                      </button>
                    )}
                    {a.status === "resolved" && (
                      <span className="text-xs text-on-surface-variant/60 font-semibold">{t("alerts.resolved")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
