import { useState } from "react";
import { FileDown, FileSpreadsheet, Printer } from "lucide-react";
import { useHistory, useRelayEvents } from "@/hooks/useSensorData";
import { cn } from "@/lib/utils";

const REPORT_TYPES = ["Daily", "Weekly", "Monthly"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

function average(nums: number[]) {
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("Daily");
  const range = reportType === "Daily" ? "day" : reportType === "Weekly" ? "week" : "month";
  const data = useHistory(range);
  const trips = useRelayEvents();

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="text-headline-lg text-on-surface">Reports</h1>

      <div className="flex gap-sm">
        {REPORT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={cn(
              "flex-1 rounded border p-md text-left",
              reportType === type
                ? "border-primary bg-primary-container/10"
                : "border-outline-variant hover:bg-surface-container"
            )}
          >
            <p className="text-headline-sm text-on-surface">{type}</p>
            <p className="text-body-sm text-on-surface-variant mt-1">
              {type === "Daily" ? "Last 24 hours" : type === "Weekly" ? "Last 7 days" : "Last 30 days"}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-label-md uppercase text-on-surface-variant">{reportType} summary</h2>
          <div className="flex gap-2">
            <button className="h-8 px-sm rounded border border-outline-variant text-body-sm text-on-surface flex items-center gap-1 hover:bg-surface-container">
              <FileDown size={14} /> PDF
            </button>
            <button className="h-8 px-sm rounded border border-outline-variant text-body-sm text-on-surface flex items-center gap-1 hover:bg-surface-container">
              <FileSpreadsheet size={14} /> CSV
            </button>
            <button className="h-8 px-sm rounded border border-outline-variant text-body-sm text-on-surface flex items-center gap-1 hover:bg-surface-container">
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        <table className="w-full text-body-sm">
          <tbody>
            <tr className="border-b border-outline-variant">
              <td className="px-md py-sm text-on-surface-variant">Average voltage</td>
              <td className="px-md py-sm font-mono text-on-surface text-right">
                {average(data.map((d) => d.voltage))} V
              </td>
            </tr>
            <tr className="border-b border-outline-variant">
              <td className="px-md py-sm text-on-surface-variant">Average current</td>
              <td className="px-md py-sm font-mono text-on-surface text-right">
                {average(data.map((d) => d.current))} A
              </td>
            </tr>
            <tr className="border-b border-outline-variant">
              <td className="px-md py-sm text-on-surface-variant">Average temperature</td>
              <td className="px-md py-sm font-mono text-on-surface text-right">
                {average(data.map((d) => d.temperature))} C
              </td>
            </tr>
            <tr className="border-b border-outline-variant">
              <td className="px-md py-sm text-on-surface-variant">Average humidity</td>
              <td className="px-md py-sm font-mono text-on-surface text-right">
                {average(data.map((d) => d.humidity))} %
              </td>
            </tr>
            <tr>
              <td className="px-md py-sm text-on-surface-variant">Relay trips in period</td>
              <td className="px-md py-sm font-mono text-on-surface text-right">{trips.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
