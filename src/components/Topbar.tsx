import { useEffect, useRef, useState } from "react";
import { Bell, Moon, Sun, ChevronDown, Globe, ShieldAlert, AlertTriangle, Info, Zap, User, LogOut } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAlerts, useDevice } from "@/hooks/useSensorData";
import { useLanguage } from "@/context/LanguageContext";
import type { Language } from "@/lib/translations";
import { apiRequest } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { playEmergencyAlarmSound, triggerHapticVibration } from "@/lib/notifications";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const device = useDevice();
  const alertsData = useAlerts();
  const alerts = Array.isArray(alertsData) ? alertsData.slice(0, 5) : [];
  const { language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const deviceDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Available transformers list for selector dropdown
  const availableTransformers = [
    { id: "TR-0042", name: "Smart Transformer", location: "Sector 4B, Pimpri-Chinchwad", status: "normal" },
    { id: "TR-0043", name: "Commercial Substation 9", location: "Sector 9, Chinchwad", status: "normal" },
    { id: "TR-0044", name: "Industrial Feeder Grid", location: "Bhosari MIDC Zone", status: "warning" },
  ];

  const [selectedDevice, setSelectedDevice] = useState(availableTransformers[0]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(event.target as Node)) {
        setDeviceDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setNotificationDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    // 1. Unmute presentation alert suppression
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("presentation_mute_alerts");
    }

    // 2. Dispatch client-side Emergency Alert Event immediately for 100% Vercel reliability
    const testAlertEvent = new CustomEvent("trigger_emergency_alert", {
      detail: {
        alertId: `al-${Date.now()}`,
        deviceId: device.id || "TR-0042",
        deviceName: device.name || "Smart Transformer",
        location: device.location || "Sector 4B, Pimpri-Chinchwad",
        lat: device.lat || 18.650029,
        lng: device.lng || 73.745274,
        googleMapUrl: device.googleMapsLink || `https://www.google.com/maps?q=18.650029,73.745274`,
        cause: "Over-current Overload (3.5A > 1.5A safety limit)",
        timestamp: new Date().toISOString(),
        voltage: 231,
        current: 3.5,
        temperature: 64,
        humidity: 48,
        relayState: "tripped",
      },
    });

    window.dispatchEvent(testAlertEvent);
    triggerHapticVibration();
    playEmergencyAlarmSound(10);

    // 3. Try hitting backend endpoint silently if backend is active
    try {
      await apiRequest("/test-emergency-alert", { method: "POST" });
    } catch {
      // Quiet fail on Vercel static hosts
    }
  };

  const selectTransformer = (tr: typeof availableTransformers[0]) => {
    setSelectedDevice(tr);
    setDeviceDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-14 shrink-0 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between px-md relative z-40">
      
      {/* Interactive Transformer Selector Dropdown */}
      <div className="relative" ref={deviceDropdownRef}>
        <button
          onClick={() => {
            setDeviceDropdownOpen(!deviceDropdownOpen);
            setNotificationDropdownOpen(false);
            setUserDropdownOpen(false);
          }}
          className="flex items-center gap-2 rounded-lg border border-outline-variant px-sm h-9 text-body-sm text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <Zap size={15} className="text-primary" />
          <span className="font-mono font-bold text-primary">{selectedDevice.id}</span>
          <span className="text-on-surface font-medium hidden sm:inline">{selectedDevice.name}</span>
          <ChevronDown
            size={14}
            className={`text-on-surface-variant transition-transform duration-200 ${
              deviceDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {deviceDropdownOpen && (
          <div className="absolute top-11 left-0 w-72 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-2 flex flex-col gap-1 z-50 animate-in fade-in duration-150">
            <span className="text-label-sm font-semibold uppercase text-on-surface-variant px-2 py-1">
              Select Active Transformer
            </span>
            {availableTransformers.map((tr) => (
              <button
                key={tr.id}
                onClick={() => selectTransformer(tr)}
                className={`flex flex-col gap-0.5 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                  selectedDevice.id === tr.id
                    ? "bg-primary-container/20 border border-primary/30 text-on-surface"
                    : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">{tr.id}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    tr.status === "warning" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
                  }`}>
                    {tr.status.toUpperCase()}
                  </span>
                </div>
                <span className="text-body-sm font-bold text-on-surface">{tr.name}</span>
                <span className="text-xs text-on-surface-variant">{tr.location}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Test Alert Button */}
        <button
          onClick={handleTestAlert}
          title="Test 2A Overload Emergency Pop-Up Alert"
          className="h-8 px-3 rounded-full bg-error/15 border border-error/30 text-error flex items-center gap-1.5 text-xs font-bold hover:bg-error/25 transition-colors cursor-pointer"
        >
          <ShieldAlert size={14} />
          <span className="hidden sm:inline">Test Emergency Pop-Up</span>
          <span className="sm:hidden">Test</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Interactive Notification Bell Dropdown */}
        <div className="relative" ref={notificationDropdownRef}>
          <button
            onClick={() => {
              setNotificationDropdownOpen(!notificationDropdownOpen);
              setDeviceDropdownOpen(false);
              setUserDropdownOpen(false);
            }}
            aria-label="Notifications"
            className="relative h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
          >
            <Bell size={16} />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error animate-pulse" />
            )}
          </button>

          {notificationDropdownOpen && (
            <div className="absolute top-11 right-0 w-80 sm:w-96 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-3 flex flex-col gap-2 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-primary" />
                  <span className="text-body-sm font-bold text-on-surface">Notifications</span>
                  <span className="bg-error/20 text-error font-mono font-bold text-xs px-2 py-0.5 rounded-full">
                    {alerts.length} New
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNotificationDropdownOpen(false);
                    navigate("/alerts");
                  }}
                  className="text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-xs text-on-surface-variant py-4 text-center">
                    No active notifications
                  </p>
                ) : (
                  alerts.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setNotificationDropdownOpen(false);
                        navigate("/alerts");
                      }}
                      className="p-2 rounded-lg bg-surface-container/30 border border-outline-variant/40 flex items-start gap-2.5 hover:bg-surface-container/60 transition-colors cursor-pointer"
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.severity === "critical" ? (
                          <AlertTriangle size={15} className="text-error" />
                        ) : item.severity === "warning" ? (
                          <AlertTriangle size={15} className="text-warning" />
                        ) : (
                          <Info size={15} className="text-primary" />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-on-surface line-clamp-1">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-on-surface-variant line-clamp-2">
                          {item.description}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/70 font-mono mt-0.5">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Multi-Language Selector Badge */}
        <button
          onClick={() => setLanguage(nextLang[language])}
          title="Switch Language (English / हिंदी / मराठी)"
          className="h-8 min-w-8 px-2 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-md font-bold hover:opacity-80 transition-opacity gap-1 cursor-pointer"
        >
          <Globe size={14} />
          <span>{langLabels[language]}</span>
        </button>

        {/* User Profile & Logout Dropdown */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => {
              setUserDropdownOpen(!userDropdownOpen);
              setDeviceDropdownOpen(false);
              setNotificationDropdownOpen(false);
            }}
            className="h-8 px-2.5 rounded-lg bg-surface-container border border-outline-variant flex items-center gap-2 hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
            </div>
            <span className="text-xs font-bold text-on-surface hidden md:inline">{user?.name || "Engineer"}</span>
            <ChevronDown size={14} className="text-on-surface-variant" />
          </button>

          {userDropdownOpen && (
            <div className="absolute top-11 right-0 w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-3 flex flex-col gap-2 z-50 animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 pb-2 border-b border-outline-variant/60">
                <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "E"}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">{user?.name || "Substation Engineer"}</span>
                  <span className="text-[11px] text-on-surface-variant font-mono">{user?.email || "admin@transformer.com"}</span>
                  <span className="text-[10px] text-primary font-semibold uppercase mt-0.5">{user?.role || "Substation Engineer"}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2 px-3 rounded-lg bg-error/10 hover:bg-error/20 text-error font-bold text-xs flex items-center justify-between transition-colors cursor-pointer mt-1"
              >
                <span>Sign Out Account</span>
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
