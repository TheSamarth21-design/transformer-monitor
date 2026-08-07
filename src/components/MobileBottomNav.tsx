import { NavLink } from "react-router-dom";
import { LayoutDashboard, Activity, Power, BarChart3, MapPin, Bell } from "lucide-react";

export function MobileBottomNav() {
  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Home" },
    { to: "/live-monitoring", icon: Activity, label: "Live" },
    { to: "/relay-control", icon: Power, label: "Relay" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/location", icon: MapPin, label: "Location" },
    { to: "/alerts", icon: Bell, label: "Alerts" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-around z-40 px-1 backdrop-blur-lg bg-opacity-95">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full gap-1 text-[11px] font-bold transition-all ${
              isActive
                ? "text-primary scale-105"
                : "text-on-surface-variant hover:text-on-surface"
            }`
          }
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
