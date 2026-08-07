import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricTileProps {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  status?: "normal" | "warning" | "critical";
  hint?: string;
}

const STATUS_BORDER: Record<string, string> = {
  normal: "border-l-success",
  warning: "border-l-warning",
  critical: "border-l-error",
};

export function MetricTile({ label, value, unit, icon: Icon, status, hint }: MetricTileProps) {
  return (
    <div
      className={cn(
        "rounded border border-outline-variant bg-surface-container-lowest p-md",
        status && `border-l-4 ${STATUS_BORDER[status]}`
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-label-md uppercase tracking-wide text-on-surface-variant">
          {label}
        </span>
        <Icon size={16} className="text-on-surface-variant" strokeWidth={1.5} />
      </div>
      <div className="mt-xs flex items-baseline gap-1">
        <span className="font-mono text-headline-lg text-on-surface">{value}</span>
        {unit && <span className="text-body-sm text-on-surface-variant">{unit}</span>}
      </div>
      {hint && <p className="mt-xs text-body-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}
