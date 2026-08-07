import { useState } from "react";
import { FileDown, FileSpreadsheet, Printer } from "lucide-react";
import { useHistory, useRelayEvents } from "@/hooks/useSensorData";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { PredictiveAnalyticsCard } from "@/components/PredictiveAnalyticsCard";

const REPORT_TYPES = ["Daily", "Weekly", "Monthly"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

function average(nums: number[]) {
  if (!nums.length) return "0.0";
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("Daily");
  const range = reportType === "Daily" ? "day" : reportType === "Weekly" ? "week" : "month";
  const data = useHistory(range);
  const trips = useRelayEvents();
  const { t } = useLanguage();

  const typeLabels: Record<ReportType, string> = {
    Daily: t("reports.daily"),
    Weekly: t("reports.weekly"),
    Monthly: t("reports.monthly"),
  };

  const subLabels: Record<ReportType, string> = {
    Daily: t("reports.last24h"),
    Weekly: t("reports.last7d"),
    Monthly: t("reports.last30d"),
  };

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="text-headline-lg text-on-surface">{t("reports.title")}</h1>

      {/* Predictive Maintenance Analytics */}
      <PredictiveAnalyticsCard />

      <div className="flex gap-sm">
        {REPORT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={cn(
              "flex-1 rounded border p-md text-left cursor-pointer",
              reportType === type
                ? "border-primary bg-primary-container/10"
                : "border-outline-variant hover:bg-surface-container"
            )}
          >
            <p className="text-headline-sm text-on-surface">{typeLabels[type]}</p>
            <p className="text-body-sm text-on-surface-variant mt-1">
              {subLabels[type]}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-label-md uppercase text-on-surface-variant">
            {typeLabels[reportType]} {t("reports.summary")}
          </h2>
          <div className="flex gap-2">
            <button className="h-8 px-sm rounded border border-outline-variant text-body-sm text-on-surface flex items-center gap-1 hover:bg-surface-container cursor-pointer">
              <FileDown size={14} /> {t("reports.pdf")}
            </button>
            <button className="h-8 px-sm rounded border border-outline-variant text-body-sm text-on-surface flex items-center gap-1 hover:bg-surface-container cursor-pointer">
              <FileSpreadsheet size={14} /> {t("reports.csv")}
            </button>
            <button className="h-8 px-sm rounded border border-outline-variant text-body-sm text-on-surface flex items-center gap-1 hover:bg-surface-container cursor-pointer">
              <Printer size={14} /> {t("reports.print")}
            </button>
          </div>
        </div>

        <table className="w-full text-body-sm">
          <tbody>
            <tr className="border-b border-outline-variant">
              <td className="px-md py-sm text-on-surface-variant">{t("reports.avgVoltage")}</td>
              <td className="px-md py-sm font-mono text-on-surface text-right">
                {average(data.map((d) => d.voltage))} V
              </td>
            </tr>
            <tr className="border-b border-outline-variant">
              <td className="px-md py-sm text-on-surface-variant">{t("reports.avgCurrent")}</td>
              <td className="px-md py-sm font-mono text-on-surface text-right">
                {average(data.map((d) => d.current))} A
              </td>
            </tr>
            <tr className="border-b border-outline-variant">
              <td className="px-md py-sm text-on-surface-variant">{t("reports.avgTemperature")}</td>
              <td className="px-md py-sm font-mono text-on-surface text-right">
                {average(data.map((d) => d.temperature))} °C
              </td>
            </tr>
            <tr className="border-b border-outline-variant">
              <td className="px-md py-sm text-on-surface-variant">{t("reports.avgHumidity")}</td>
              <td className="px-md py-sm font-mono text-on-surface text-right">
                {average(data.map((d) => d.humidity))} %
              </td>
            </tr>
            <tr>
              <td className="px-md py-sm text-on-surface-variant">{t("reports.relayTrips")}</td>
              <td className="px-md py-sm font-mono text-on-surface text-right">{trips.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
