import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Power,
  LineChart,
  MapPin,
  Bell,
  FileText,
  Settings,
  Zap,
  X,
  Sun,
  Moon,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import type { Language } from "@/lib/translations";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const NAV_ITEMS = [
    { to: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/live-monitoring", label: t("nav.liveMonitoring"), icon: Activity },
    { to: "/relay-control", label: t("nav.relayControl"), icon: Power },
    { to: "/analytics", label: t("nav.analytics"), icon: LineChart },
    { to: "/location", label: t("nav.location"), icon: MapPin },
    { to: "/alerts", label: t("nav.alerts"), icon: Bell },
    { to: "/reports", label: t("nav.reports"), icon: FileText },
    { to: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  const languages: { code: Language; label: string }[] = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिंदी" },
    { code: "mr", label: "मराठी" },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in"
        />
      )}

      <aside
        className={cn(
          "w-sidebar-width flex flex-col shrink-0 bg-[#191c1d] dark:bg-surface-container-lowest border-r border-outline-variant transition-transform duration-200 z-50",
          "hidden md:flex", // Desktop default
          isOpen && "fixed inset-y-0 left-0 flex shadow-2xl animate-in slide-in-from-left" // Mobile open drawer
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-md h-14 border-b border-white/10 dark:border-outline-variant">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-primary-container" strokeWidth={2} />
            <span className="text-headline-sm text-white dark:text-on-surface">
              Transformer Monitor
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-sm overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-md h-11 mx-sm rounded text-body-md transition-colors",
                  "text-white/70 dark:text-on-surface-variant hover:bg-white/5 dark:hover:bg-surface-container-high",
                  isActive &&
                    "bg-primary-container/20 text-white dark:text-on-surface border-l-2 border-primary-container pl-[13px]"
                )
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile Settings Section: Dark/Light Mode & Language Selection */}
        <div className="p-md border-t border-white/10 dark:border-outline-variant flex flex-col gap-3">
          
          {/* Theme Switcher Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70 dark:text-on-surface-variant font-medium flex items-center gap-2">
              {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
              <span>App Theme</span>
            </span>
            <button
              onClick={toggleTheme}
              className="h-8 px-3 rounded-lg bg-white/10 dark:bg-surface-container border border-white/10 dark:border-outline-variant text-xs text-white dark:text-on-surface font-bold flex items-center gap-1.5 hover:bg-white/20 transition-colors cursor-pointer"
            >
              {theme === "dark" ? <Sun size={14} className="text-warning" /> : <Moon size={14} className="text-primary" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </div>

          {/* Language Switcher Pills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-white/70 dark:text-on-surface-variant font-medium flex items-center gap-2">
              <Globe size={15} />
              <span>Select Language</span>
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-white/5 dark:bg-surface-container border border-white/10 dark:border-outline-variant">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    language === l.code
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-white/60 dark:text-on-surface-variant hover:text-white"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 dark:border-outline-variant/40 text-[11px] text-white/40 dark:text-on-surface-variant/60">
            v0.1.0 &middot; ESP32 Hardware Node Online
          </div>
        </div>

      </aside>
    </>
  );
}
