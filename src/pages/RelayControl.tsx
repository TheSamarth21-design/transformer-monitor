import { Power, Zap, Thermometer, Gauge } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useRelayEvents, useRelayStatus } from "@/hooks/useSensorData";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export default function RelayControl() {
  const relay = useRelayStatus();
  const events = useRelayEvents();
  const { t } = useLanguage();

  const handleTripNow = async () => {
    try {
      await relay.tripRelay("Manual operator trip");
    } catch (err: any) {
      alert("Failed to trip relay: " + err.message);
    }
  };

  const handleResetRelay = async () => {
    try {
      await relay.resetRelay();
    } catch (err: any) {
      alert("Failed to reset relay: " + err.message);
    }
  };

  const handleToggleAutoTrip = async () => {
    try {
      await relay.updateThresholds({ autoTripEnabled: !relay.autoTripEnabled });
    } catch (err: any) {
      alert("Failed to toggle auto trip: " + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="text-headline-lg text-on-surface">{t("relay.title")}</h1>
        <p className="text-body-sm text-on-surface-variant mt-1">
          {t("relay.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="rounded border border-outline-variant bg-surface-container-lowest p-md flex flex-col items-start gap-sm">
          <span className="text-label-md uppercase text-on-surface-variant">{t("relay.status")}</span>
          <div className="flex items-center gap-2">
            <Power size={20} className={relay.state === "closed" ? "text-success" : "text-error"} />
            <span className="text-headline-md text-on-surface capitalize">
              {relay.state === "closed" ? t("dashboard.closed") : t("dashboard.tripped")}
            </span>
          </div>
          <StatusBadge status={relay.state === "closed" ? "normal" : "critical"} />
        </div>

        <div className="rounded border border-outline-variant bg-surface-container-lowest p-md md:col-span-2">
          <span className="text-label-md uppercase text-on-surface-variant">{t("relay.thresholds")}</span>
          <div className="grid grid-cols-3 gap-md mt-sm">
            <div className="flex items-center gap-2">
              <Thermometer size={16} className="text-on-surface-variant" />
              <div>
                <p className="font-mono text-body-md text-on-surface">{relay.thresholds.maxTemperature}°C</p>
                <p className="text-body-sm text-on-surface-variant">{t("relay.maxTemp")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gauge size={16} className="text-on-surface-variant" />
              <div>
                <p className="font-mono text-body-md text-on-surface">{relay.thresholds.maxCurrent}A</p>
                <p className="text-body-sm text-on-surface-variant">{t("relay.maxCurrent")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-on-surface-variant" />
              <div>
                <p className="font-mono text-body-md text-on-surface">{relay.thresholds.maxVoltage}V</p>
                <p className="text-body-sm text-on-surface-variant">{t("relay.maxVoltage")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="text-label-md uppercase text-on-surface-variant mb-sm">{t("relay.manualControls")}</h2>
        <div className="flex flex-wrap items-center gap-sm">
          <button
            onClick={handleTripNow}
            disabled={relay.state === "tripped"}
            className="h-8 px-md rounded border border-error text-error text-body-sm hover:bg-error-container/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("relay.tripNow")}
          </button>
          <button
            onClick={handleResetRelay}
            disabled={relay.state === "closed"}
            className="h-8 px-md rounded border border-outline-variant text-on-surface text-body-sm hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("relay.resetRelay")}
          </button>
          <label className="flex items-center gap-2 ml-auto text-body-sm text-on-surface cursor-pointer">
            {t("relay.autoTripEnabled")}
            <button
              type="button"
              role="switch"
              aria-checked={relay.autoTripEnabled}
              onClick={handleToggleAutoTrip}
              className={cn(
                "h-5 w-9 rounded-full transition-colors relative",
                relay.autoTripEnabled ? "bg-primary" : "bg-outline-variant"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  relay.autoTripEnabled ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="rounded border border-outline-variant bg-surface-container-lowest">
        <div className="px-md h-11 flex items-center border-b border-outline-variant">
          <h2 className="text-label-md text-on-surface">{t("relay.eventLog")}</h2>
        </div>
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-left text-label-sm uppercase text-on-surface-variant border-b border-outline-variant">
              <th className="px-md py-sm font-medium">{t("dashboard.time")}</th>
              <th className="px-md py-sm font-medium">{t("relay.cause")}</th>
              <th className="px-md py-sm font-medium">{t("relay.duration")}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-outline-variant last:border-0">
                <td className="px-md py-sm font-mono text-on-surface-variant">
                  {new Date(e.timestamp).toLocaleString()}
                </td>
                <td className="px-md py-sm text-on-surface">{e.cause}</td>
                <td className="px-md py-sm text-on-surface-variant">{e.durationMinutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
