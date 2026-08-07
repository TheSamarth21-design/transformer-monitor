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
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live-monitoring", label: "Live monitoring", icon: Activity },
  { to: "/relay-control", label: "Relay control", icon: Power },
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/location", label: "Location", icon: MapPin },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-sidebar-width md:flex-col shrink-0 bg-[#191c1d] dark:bg-surface-container-lowest border-r border-outline-variant">
      <div className="flex items-center gap-2 px-md h-14 border-b border-white/10 dark:border-outline-variant">
        <Zap size={18} className="text-primary-container" strokeWidth={2} />
        <span className="text-headline-sm text-white dark:text-on-surface">
          Transformer Monitor
        </span>
      </div>
      <nav className="flex-1 py-sm">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-md h-10 mx-sm rounded text-body-md transition-colors",
                "text-white/70 dark:text-on-surface-variant hover:bg-white/5 dark:hover:bg-surface-container-high",
                isActive &&
                  "bg-primary-container/20 text-white dark:text-on-surface border-l-2 border-primary-container pl-[13px]"
              )
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-md py-md border-t border-white/10 dark:border-outline-variant text-body-sm text-white/50 dark:text-on-surface-variant">
        v0.1.0 &middot; ESP32 node online
      </div>
    </aside>
  );
}
