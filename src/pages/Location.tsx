import { MapPin, ExternalLink, Navigation, Compass } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useDevice, useLiveReading } from "@/hooks/useSensorData";
import { openGoogleMapsNavigation } from "@/lib/googleMaps";

export default function Location() {
  const device = useDevice();
  const reading = useLiveReading();

  const DEFAULT_LAT = 18.649916;
  const DEFAULT_LNG = 73.745276;

  // Use real live sensor GPS if available, otherwise fall back to 18.649916, 73.745276
  const isLiveGpsFix = Boolean(reading.lat && reading.lat !== 0 && reading.lat !== DEFAULT_LAT);
  const lat = reading.lat && reading.lat !== 0 ? reading.lat : device.lat || DEFAULT_LAT;
  const lng = reading.lng && reading.lng !== 0 ? reading.lng : device.lng || DEFAULT_LNG;

  const embedUrl = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  const directMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg text-on-surface">Substation Location</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {isLiveGpsFix
              ? "Live Hardware GPS Telemetry Stream (Blynk V4 & V5)"
              : "Default Substation Coordinates (18.649916, 73.745276)"}
          </p>
        </div>
        <button
          onClick={() => openGoogleMapsNavigation(lat, lng)}
          className="h-10 px-md rounded-lg bg-primary text-on-primary font-bold text-body-sm flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
        >
          <Navigation size={16} />
          <span>Open Google Maps App</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        
        {/* Interactive Embedded Google Maps Frame */}
        <div className="md:col-span-2 rounded-xl border border-outline-variant bg-surface-container-lowest h-[450px] overflow-hidden relative shadow-sm flex items-center justify-center">
          <iframe
            title="Google Maps Substation Location"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={embedUrl}
          />
        </div>

        {/* Device Location Card */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-md shadow-sm">
          <div className="flex items-center justify-between pb-sm border-b border-outline-variant/60">
            <span className="text-label-md uppercase text-on-surface-variant font-semibold">Substation Device</span>
            <StatusBadge status={device.status} />
          </div>

          <div>
            <p className="text-headline-sm font-bold text-on-surface">{device.name}</p>
            <p className="text-body-sm text-on-surface-variant font-mono mt-0.5">{device.id}</p>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-label-sm uppercase text-on-surface-variant font-semibold flex items-center gap-1.5">
              <MapPin size={15} className={isLiveGpsFix ? "text-success" : "text-primary"} />
              <span>GPS Telemetry Source</span>
            </p>
            <p className="text-body-md font-bold text-on-surface">
              {isLiveGpsFix ? "Live ESP32 GPS Sensor Stream (V4/V5)" : "Default Grid Base Location"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-sm bg-surface-container/30 p-sm rounded-lg border border-outline-variant/40">
            <div>
              <p className="text-label-sm uppercase text-on-surface-variant flex items-center gap-1">
                <Compass size={12} />
                <span>Latitude</span>
              </p>
              <p className="font-mono font-bold text-body-md text-on-surface mt-0.5">
                {lat.toFixed(6)}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase text-on-surface-variant flex items-center gap-1">
                <Compass size={12} />
                <span>Longitude</span>
              </p>
              <p className="font-mono font-bold text-body-md text-on-surface mt-0.5">
                {lng.toFixed(6)}
              </p>
            </div>
          </div>

          <a
            href={directMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto h-11 w-full rounded-xl bg-primary text-on-primary font-bold text-body-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <ExternalLink size={16} />
            <span>Open Direct Navigation Link</span>
          </a>
        </div>

      </div>
    </div>
  );
}
