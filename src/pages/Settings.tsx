import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import type { Language } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { Cpu, Key, CheckCircle, Save } from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [blynkToken, setBlynkToken] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<{ authToken: string }>("/blynk/config")
      .then((data) => {
        if (data.authToken) setBlynkToken(data.authToken);
      })
      .catch(() => {});
  }, []);

  const handleSaveBlynkToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await apiRequest("/blynk/config", {
        method: "POST",
        body: JSON.stringify({ authToken: blynkToken }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to save Blynk Auth Token: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-lg max-w-xl">
      <h1 className="text-headline-lg text-on-surface">{t("settings.title")}</h1>

      {/* Blynk Cloud IoT Configuration */}
      <section className="rounded-xl border border-primary/40 bg-surface-container-lowest p-md flex flex-col gap-sm shadow-sm">
        <div className="flex items-center gap-2 text-primary font-bold text-label-lg">
          <Cpu size={20} />
          <span>Blynk Cloud Hardware Connection</span>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          Enter your ESP32 Blynk Auth Token to connect physical hardware telemetry and relay interlocks.
        </p>

        <form onSubmit={handleSaveBlynkToken} className="flex flex-col gap-md mt-sm">
          <div>
            <label className="text-body-sm font-medium text-on-surface flex items-center gap-1.5 mb-1">
              <Key size={14} className="text-primary" />
              <span>Blynk Device Auth Token / API Key</span>
            </label>
            <input
              type="text"
              value={blynkToken}
              onChange={(e) => setBlynkToken(e.target.value)}
              placeholder="e.g. uR3iUqcSJMTS7-OEfnsuSDj-5Sqrxl0L..."
              className="w-full h-10 rounded border border-outline-variant bg-surface-container-lowest px-sm font-mono text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-md rounded bg-primary text-on-primary text-body-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <Save size={15} />
              <span>{saving ? "Saving..." : "Save & Connect Blynk"}</span>
            </button>
            {savedSuccess && (
              <span className="text-success text-body-sm font-medium flex items-center gap-1">
                <CheckCircle size={15} /> Saved & Polling Live Hardware!
              </span>
            )}
          </div>
        </form>

        {/* Blynk Metric Mapping Reference */}
        <div className="mt-xs pt-sm border-t border-outline-variant/60">
          <p className="text-xs font-semibold text-on-surface mb-2">
            Active Hardware Sensors & Controls:
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-on-surface-variant">
            <div><span className="text-primary font-bold">•</span> Temperature (°C)</div>
            <div><span className="text-primary font-bold">•</span> Humidity (%)</div>
            <div><span className="text-primary font-bold">•</span> Load Current (1.5A Safety Limit)</div>
            <div><span className="text-primary font-bold">•</span> Voltage (V)</div>
            <div><span className="text-primary font-bold">•</span> Latitude & Longitude</div>
            <div><span className="text-primary font-bold">•</span> Relay Interlock Control</div>
            <div><span className="text-primary font-bold">•</span> Health Status & Alerts</div>
            <div><span className="text-primary font-bold">•</span> Google Maps Navigation</div>
          </div>
        </div>
      </section>

      <section className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="text-label-md uppercase text-on-surface-variant mb-sm">{t("settings.appearance")}</h2>
        <div className="flex gap-sm">
          {(["light", "dark"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTheme(mode)}
              className={cn(
                "flex-1 h-9 rounded border text-body-sm capitalize cursor-pointer",
                theme === mode ? "border-primary text-primary font-medium" : "border-outline-variant text-on-surface"
              )}
            >
              {mode === "light" ? t("settings.light") : t("settings.dark")}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="text-label-md uppercase text-on-surface-variant mb-sm">{t("settings.language")}</h2>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="w-full h-9 rounded border border-outline-variant bg-surface-container-lowest px-sm text-body-md text-on-surface cursor-pointer focus:border-primary focus:outline-none"
        >
          <option value="en">English (English)</option>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="mr">मराठी (Marathi)</option>
        </select>
      </section>

      <section className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="text-label-md uppercase text-on-surface-variant mb-sm">{t("settings.notifications")}</h2>
        <div className="flex flex-col gap-sm text-body-md text-on-surface">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="accent-primary" />
            {t("settings.criticalAlerts")}
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="accent-primary" />
            {t("settings.warningAlerts")}
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-primary" />
            {t("settings.deviceOffline")}
          </label>
        </div>
      </section>
    </div>
  );
}
