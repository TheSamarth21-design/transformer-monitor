import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export function AppLayout() {
  return (
    <div className="flex h-screen bg-surface text-on-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-lg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
