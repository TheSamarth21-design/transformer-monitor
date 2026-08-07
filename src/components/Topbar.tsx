import { Bell, Moon, Sun, ChevronDown, Globe, ShieldAlert } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useDevice } from "@/hooks/useSensorData";
import { useLanguage } from "@/context/LanguageContext";
import type { Language } from "@/lib/translations";
import { apiRequest } from "@/lib/api";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const device = useDevice();
  const { language, setLanguage } = useLanguage();

  const langLabels: Record<Language, string> = {
    en: "EN",
    hi: "हि",
    mr: "म",
  };

  const nextLang: Record<Language, Language> = {
    en: "hi",
    hi: "mr",
    mr: "en",
  };

  const handleTestAlert = async () => {
    try {
      await apiRequest("/test-emergency-alert", { method: "POST" });
    } catch (err: any) {
      alert("Failed to trigger test alert: " + err.message);
    }
  };

  return (
    <header className="h-14 shrink-0 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between px-md">
      <button className="flex items-center gap-2 rounded border border-outline-variant px-sm h-8 text-body-sm text-on-surface hover:bg-surface-container">
        <span className="font-mono">{device.id}</span>
        <span className="text-on-surface-variant">{device.name}</span>
        <ChevronDown size={14} className="text-on-surface-variant" />
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={handleTestAlert}
          title="Test 2A Overload Emergency Pop-Up Alert"
          className="h-8 px-3 rounded-full bg-error/15 border border-error/30 text-error flex items-center gap-1.5 text-xs font-bold hover:bg-error/25 transition-colors cursor-pointer"
        >
          <ShieldAlert size={14} />
          <span className="hidden sm:inline">Test 2A Overload Pop-Up</span>
          <span className="sm:hidden">Test Pop-Up</span>
        </button>

        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="h-8 w-8 flex items-center justify-center rounded hover:bg-surface-container text-on-surface-variant"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          aria-label="Notifications"
          className="relative h-8 w-8 flex items-center justify-center rounded hover:bg-surface-container text-on-surface-variant"
        >
          <Bell size={16} />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-error" />
        </button>

        <button
          onClick={() => setLanguage(nextLang[language])}
          title="Switch Language (English / हिंदी / मराठी)"
          className="h-8 min-w-8 px-2 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-md font-bold hover:opacity-80 transition-opacity gap-1 cursor-pointer"
        >
          <Globe size={14} />
          <span>{langLabels[language]}</span>
        </button>
      </div>
    </header>
  );
}
