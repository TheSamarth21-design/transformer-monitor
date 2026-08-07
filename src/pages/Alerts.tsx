import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAlerts } from "@/hooks/useSensorData";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import type { AlertStatus } from "@/lib/types";

export default function Alerts() {
  const alertsData = useAlerts();
  const alerts = Array.isArray(alertsData) ? alertsData : [];
  const updateAlertStatus = (alertsData as any).updateAlertStatus;
  const { t } = useLanguage();

  const [filter, setFilter] = useState<AlertStatus | "all">("all");

  const FILTERS: { key: AlertStatus | "all"; label: string }[] = [
    { key: "all", label: t("alerts.all") },
    { key: "active", label: t("alerts.active") },
    { key: "acknowledged", label: t("alerts.acknowledged") },
    { key: "resolved", label: t("alerts.resolved") },
  ];

  const filtered = useMemo(
    () => (filter === "all" ? alerts : alerts.filter((a) => a.status === filter)),
    [alerts, filter]
  );

  const counts = {
    critical: alerts.filter((a) => a.severity === "critical" && a.status === "active").length,
    warning: alerts.filter((a) => a.severity === "warning" && a.status === "active").length,
    info: alerts.filter((a) => a.severity === "info" && a.status === "active").length,
  };

  const handleStatusChange = async (id: string, newStatus: AlertStatus) => {
    if (updateAlertStatus) {
      await updateAlertStatus(id, newStatus);
    }
  };

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="text-headline-lg text-on-surface">{t("alerts.title")}</h1>

      <div className="flex gap-md text-body-sm">
        <span className="text-error">{counts.critical} {t("alerts.critical")}</span>
        <span className="text-warning">{counts.warning} {t("alerts.warning")}</span>
        <span className="text-on-surface-variant">{counts.info} {t("alerts.info")}</span>
      </div>

      <div className="flex items-center gap-1 rounded border border-outline-variant p-0.5 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-sm h-7 rounded text-body-sm capitalize",
              filter === f.key ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded border border-outline-variant bg-surface-container-lowest overflow-hidden">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-left text-label-sm uppercase text-on-surface-variant border-b border-outline-variant">
              <th className="px-md py-sm font-medium">{t("dashboard.severity")}</th>
              <th className="px-md py-sm font-medium">{t("dashboard.alert")}</th>
              <th className="px-md py-sm font-medium">{t("alerts.description")}</th>
              <th className="px-md py-sm font-medium">{t("dashboard.time")}</th>
              <th className="px-md py-sm font-medium">{t("dashboard.status")}</th>
              <th className="px-md py-sm font-medium text-right">{t("alerts.action")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-outline-variant last:border-0">
                <td className="px-md py-sm">
                  <StatusBadge status={a.severity === "critical" ? "critical" : a.severity === "warning" ? "warning" : "info"} />
                </td>
                <td className="px-md py-sm text-on-surface font-medium">{a.title}</td>
                <td className="px-md py-sm text-on-surface-variant">{a.description}</td>
                <td className="px-md py-sm font-mono text-on-surface-variant">
                  {new Date(a.timestamp).toLocaleString()}
                </td>
                <td className="px-md py-sm text-on-surface-variant capitalize font-medium">
                  {a.status === "active" ? t("alerts.active") : a.status === "acknowledged" ? t("alerts.acknowledged") : t("alerts.resolved")}
                </td>
                <td className="px-md py-sm text-right">
                  {a.status === "active" && (
                    <button
                      onClick={() => handleStatusChange(a.id, "acknowledged")}
                      className="px-2 py-1 text-xs rounded border border-outline-variant hover:bg-surface-container text-on-surface"
                    >
                      {t("alerts.acknowledgeBtn")}
                    </button>
                  )}
                  {a.status === "acknowledged" && (
                    <button
                      onClick={() => handleStatusChange(a.id, "resolved")}
                      className="px-2 py-1 text-xs rounded border border-success text-success hover:bg-success-container/30"
                    >
                      {t("alerts.resolveBtn")}
                    </button>
                  )}
                  {a.status === "resolved" && (
                    <span className="text-xs text-on-surface-variant">{t("alerts.resolved")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
