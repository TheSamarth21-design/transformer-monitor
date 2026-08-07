import { Zap, Thermometer, Gauge, Droplets } from "lucide-react";
import { MetricTile } from "@/components/MetricTile";
import { useDevice, useLiveReading } from "@/hooks/useSensorData";

export default function LiveMonitoring() {
  const reading = useLiveReading();
  const device = useDevice();

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg text-on-surface">Live monitoring</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Streaming from {device.id} over WiFi via ESP32
          </p>
        </div>
        <div className="flex items-center gap-2 text-body-sm text-success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <MetricTile label="Voltage" value={reading.voltage.toFixed(1)} unit="V" icon={Zap} status="normal" />
        <MetricTile label="Current" value={reading.current.toFixed(1)} unit="A" icon={Gauge} status="warning" />
        <MetricTile
          label="Temperature"
          value={reading.temperature.toFixed(1)}
          unit="C"
          icon={Thermometer}
          status={reading.temperature > 60 ? "critical" : "normal"}
        />
        <MetricTile label="Humidity" value={reading.humidity.toFixed(1)} unit="%" icon={Droplets} status="normal" />
      </div>

      <div className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="text-label-md text-on-surface-variant uppercase mb-sm">Device connectivity</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md text-body-sm">
          <div>
            <p className="text-on-surface-variant">Status</p>
            <p className="text-on-surface font-mono mt-1">{device.online ? "Online" : "Offline"}</p>
          </div>
          <div>
            <p className="text-on-surface-variant">Last sync</p>
            <p className="text-on-surface font-mono mt-1">{new Date(reading.timestamp).toLocaleTimeString()}</p>
          </div>
          <div>
            <p className="text-on-surface-variant">Signal</p>
            <p className="text-on-surface font-mono mt-1">-52 dBm</p>
          </div>
          <div>
            <p className="text-on-surface-variant">Protocol</p>
            <p className="text-on-surface font-mono mt-1">WiFi / Blynk</p>
          </div>
        </div>
      </div>
    </div>
  );
}
