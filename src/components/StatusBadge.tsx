import { cn } from "@/lib/utils";

type Status = "normal" | "warning" | "critical" | "info" | "offline";

const STYLES: Record<Status, string> = {
  normal: "bg-success-container text-on-success-container",
  warning: "bg-warning-container text-on-warning-container",
  critical: "bg-error-container text-on-error-container",
  info: "bg-secondary-container text-on-secondary-container",
  offline: "bg-surface-container-high text-on-surface-variant",
};

const LABELS: Record<Status, string> = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
  info: "Info",
  offline: "Offline",
};

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-label-md",
        STYLES[status]
      )}
    >
      {label ?? LABELS[status]}
    </span>
  );
}
