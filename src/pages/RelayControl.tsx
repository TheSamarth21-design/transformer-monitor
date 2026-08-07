import { Power, Zap, Thermometer, Gauge } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useRelayEvents, useRelayStatus } from "@/hooks/useSensorData";
import { cn } from "@/lib/utils";

export default function RelayControl() {
  const relay = useRelayStatus();
  const events = useRelayEvents();

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
        <h1 className="text-headline-lg text-on-surface">Relay control</h1>
        <p className="text-body-sm text-on-surface-variant mt-1">
          Automatic tripping protection for over-temperature, over-current, and over-voltage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="rounded border border-outline-variant bg-surface-container-lowest p-md flex flex-col items-start gap-sm">
          <span className="text-label-md uppercase text-on-surface-variant">Relay status</span>
          <div className="flex items-center gap-2">
            <Power size={20} className={relay.state === "closed" ? "text-success" : "text-error"} />
            <span className="text-headline-md text-on-surface capitalize">{relay.state}</span>
          </div>
          <StatusBadge status={relay.state === "closed" ? "normal" : "critical"} />
        </div>

        <div className="rounded border border-outline-variant bg-surface-container-lowest p-md md:col-span-2">
          <span className="text-label-md uppercase text-on-surface-variant">Trip thresholds</span>
          <div className="grid grid-cols-3 gap-md mt-sm">
            <div className="flex items-center gap-2">
              <Thermometer size={16} className="text-on-surface-variant" />
              <div>
                <p className="font-mono text-body-md text-on-surface">{relay.thresholds.maxTemperature}°C</p>
                <p className="text-body-sm text-on-surface-variant">Max temp</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gauge size={16} className="text-on-surface-variant" />
              <div>
                <p className="font-mono text-body-md text-on-surface">{relay.thresholds.maxCurrent}A</p>
                <p className="text-body-sm text-on-surface-variant">Max current</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-on-surface-variant" />
              <div>
                <p className="font-mono text-body-md text-on-surface">{relay.thresholds.maxVoltage}V</p>
                <p className="text-body-sm text-on-surface-variant">Max voltage</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="text-label-md uppercase text-on-surface-variant mb-sm">Manual controls</h2>
        <div className="flex flex-wrap items-center gap-sm">
          <button
            onClick={handleTripNow}
            disabled={relay.state === "tripped"}
            className="h-8 px-md rounded border border-error text-error text-body-sm hover:bg-error-container/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trip now
          </button>
          <button
            onClick={handleResetRelay}
            disabled={relay.state === "closed"}
            className="h-8 px-md rounded border border-outline-variant text-on-surface text-body-sm hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset relay
          </button>
          <label className="flex items-center gap-2 ml-auto text-body-sm text-on-surface cursor-pointer">
            Auto-trip enabled
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
          <h2 className="text-label-md text-on-surface">Trip event log</h2>
        </div>
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-left text-label-sm uppercase text-on-surface-variant border-b border-outline-variant">
              <th className="px-md py-sm font-medium">Timestamp</th>
              <th className="px-md py-sm font-medium">Cause</th>
              <th className="px-md py-sm font-medium">Duration</th>
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
