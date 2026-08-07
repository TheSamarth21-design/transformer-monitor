import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { EmergencyAlertModal } from "@/components/EmergencyAlertModal";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PullToRefresh } from "@/components/PullToRefresh";

export function AppLayout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface text-on-surface overflow-hidden">
      <EmergencyAlertModal />

      {/* Responsive Sidebar (Desktop Fixed + Mobile Slide-out Drawer) */}
      <Sidebar isOpen={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 h-full relative">
        <Topbar onOpenMobileDrawer={() => setMobileDrawerOpen(true)} />

        {/* Touch Pull-To-Refresh Mobile Container */}
        <PullToRefresh>
          <main className="p-3 sm:p-lg max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </PullToRefresh>

        {/* Mobile Bottom Touch Navigation Bar */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
