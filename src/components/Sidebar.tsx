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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useLanguage();

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
              className="md:hidden p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X size={20} />
            </button>
          )}
        </div>
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
        <div className="px-md py-md border-t border-white/10 dark:border-outline-variant text-body-sm text-white/50 dark:text-on-surface-variant">
          v0.1.0 &middot; ESP32 node online
        </div>
      </aside>
    </>
  );
}
