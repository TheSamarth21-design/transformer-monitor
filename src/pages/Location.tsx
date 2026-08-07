import { MapPin } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useDevice } from "@/hooks/useSensorData";

export default function Location() {
  const device = useDevice();

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="text-headline-lg text-on-surface">Location</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="md:col-span-2 rounded border border-outline-variant bg-surface-container-lowest h-96 flex items-center justify-center relative overflow-hidden">
          {/*
            Swap this placeholder for a real Google Maps embed:
            <iframe src={`https://www.google.com/maps/embed/v1/place?key=YOUR_KEY&q=${device.lat},${device.lng}`} />
          */}
          <div className="absolute inset-0 bg-surface-container [background-image:linear-gradient(var(--outline-variant)_1px,transparent_1px),linear-gradient(90deg,var(--outline-variant)_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
          <div className="relative flex flex-col items-center gap-2">
            <MapPin size={28} className="text-error" fill="currentColor" />
            <p className="text-body-sm text-on-surface-variant">
              Map preview &mdash; connect Google Maps API key
            </p>
          </div>
        </div>

        <div className="rounded border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <span className="text-label-md uppercase text-on-surface-variant">Device</span>
            <StatusBadge status={device.status} />
          </div>
          <div>
            <p className="text-headline-sm text-on-surface">{device.name}</p>
            <p className="text-body-sm text-on-surface-variant font-mono mt-1">{device.id}</p>
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant">Address</p>
            <p className="text-body-md text-on-surface">{device.location}</p>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div>
              <p className="text-body-sm text-on-surface-variant">Latitude</p>
              <p className="font-mono text-body-md text-on-surface">{device.lat}</p>
            </div>
            <div>
              <p className="text-body-sm text-on-surface-variant">Longitude</p>
              <p className="font-mono text-body-md text-on-surface">{device.lng}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
