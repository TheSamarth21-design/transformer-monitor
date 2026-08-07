import { useState, useRef, ReactNode } from "react";
import { RefreshCw } from "lucide-react";

export function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh?: () => Promise<void> | void }) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      setPullDistance(Math.min(distance * 0.5, PULL_THRESHOLD + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          window.location.reload();
        }
      } catch {
        // Ignore
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setStartY(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
      setStartY(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex-1 overflow-y-auto relative pb-20 md:pb-6"
    >
      {/* Pull Indicator Banner */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center gap-2 text-xs font-bold text-primary bg-primary/10 border-b border-primary/20 py-2 transition-all overflow-hidden"
          style={{ height: `${pullDistance}px` }}
        >
          <RefreshCw
            size={16}
            className={`${isRefreshing ? "animate-spin" : ""} ${
              pullDistance >= PULL_THRESHOLD ? "rotate-180" : ""
            } transition-transform`}
          />
          <span>
            {isRefreshing
              ? "Refreshing Live Hardware Data..."
              : pullDistance >= PULL_THRESHOLD
              ? "Release to Refresh Blynk Cloud"
              : "Pull down to refresh"}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
