import { useEffect, useState } from "react";
import { Database, RefreshCw, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/api";

export function FailoverBadge() {
  const [metrics, setMetrics] = useState<{ isCloudOnline: boolean; pendingCount: number } | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      apiRequest<{ isCloudOnline: boolean; pendingCount: number }>("/replication/status")
        .then((data) => setMetrics(data))
        .catch(() => setMetrics(null));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant text-[11px] font-mono font-medium">
      <Database size={13} className={metrics.pendingCount > 0 ? "text-warning animate-pulse" : "text-success"} />
      {metrics.pendingCount > 0 ? (
        <span className="text-warning font-bold flex items-center gap-1">
          <RefreshCw size={11} className="animate-spin" />
          WAL Sync Queue: {metrics.pendingCount}
        </span>
      ) : (
        <span className="text-on-surface-variant flex items-center gap-1">
          <CheckCircle2 size={11} className="text-success" />
          WAL Sync Active
        </span>
      )}
    </div>
  );
}
