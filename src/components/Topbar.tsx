import { Bell, Moon, Sun, ChevronDown } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useDevice } from "@/hooks/useSensorData";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const device = useDevice();

  return (
    <header className="h-14 shrink-0 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between px-md">
      <button className="flex items-center gap-2 rounded border border-outline-variant px-sm h-8 text-body-sm text-on-surface hover:bg-surface-container">
        <span className="font-mono">{device.id}</span>
        <span className="text-on-surface-variant">{device.name}</span>
        <ChevronDown size={14} className="text-on-surface-variant" />
      </button>

      <div className="flex items-center gap-2">
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
        <div className="h-8 w-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-md">
          EN
        </div>
      </div>
    </header>
  );
}
