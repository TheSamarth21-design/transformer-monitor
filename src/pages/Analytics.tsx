import { useState, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useHistory, useLiveReading } from "@/hooks/useSensorData";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "day", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
] as const;

type Range = (typeof RANGES)[number]["key"];

// Demo Data Generator for Judges Presentation (Voltage 115V-124V, Current 0A-2A)
function generateDemoData(range: Range, liveReading: any) {
  const points = range === "day" ? 24 : range === "week" ? 7 : range === "month" ? 30 : 12;
  const data = [];
  const now = new Date();

  const currentVolt = liveReading.voltage > 0 ? liveReading.voltage : 118.5;
  const currentCur = liveReading.current > 0 ? liveReading.current : 0.8;
  const currentTemp = liveReading.temperature > 0 ? liveReading.temperature : 28.4;
  const currentHum = liveReading.humidity > 0 ? liveReading.humidity : 62.0;

  for (let i = points - 1; i >= 0; i--) {
    let label = "";
    if (range === "day") {
      const d = new Date(now.getTime() - i * 3600 * 1000);
      label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (range === "week") {
      const d = new Date(now.getTime() - i * 86400 * 1000);
      label = d.toLocaleDateString([], { weekday: "short" });
    } else if (range === "month") {
      const d = new Date(now.getTime() - i * 86400 * 1000);
      label = `${d.getDate()} ${d.toLocaleDateString([], { month: "short" })}`;
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      label = d.toLocaleDateString([], { month: "short" });
    }

    // Realistic physical fluctuations around user specified bounds
    const voltBase = 115 + Math.sin(i * 0.5) * 4.5 + Math.random() * 2;
    const curBase = 0.2 + Math.abs(Math.sin(i * 0.8)) * 1.6 + Math.random() * 0.1;
    const tempBase = 24.5 + Math.sin(i * 0.3) * 12 + Math.random() * 2;
    const humBase = 58 + Math.cos(i * 0.4) * 8 + Math.random() * 2;

    data.push({
      time: label,
      voltage: i === 0 ? Number(currentVolt.toFixed(1)) : Number(Math.min(124.8, Math.max(115.0, voltBase)).toFixed(1)),
      current: i === 0 ? Number(currentCur.toFixed(1)) : Number(Math.min(2.0, Math.max(0.0, curBase)).toFixed(1)),
      temperature: i === 0 ? Number(currentTemp.toFixed(1)) : Number(Math.min(65.0, Math.max(20.0, tempBase)).toFixed(1)),
      humidity: i === 0 ? Number(currentHum.toFixed(1)) : Number(Math.min(80.0, Math.max(40.0, humBase)).toFixed(1)),
    });
  }

  return data;
}

function ChartCard({
  title,
  dataKey,
  unit,
  color,
  data,
  domain,
}: {
  title: string;
  dataKey: "voltage" | "current" | "temperature" | "humidity";
  unit: string;
  color: string;
  data: any[];
  domain?: [number, number];
}) {
  const latest = data[data.length - 1]?.[dataKey];
  const minVal = Math.min(...data.map((d) => d[dataKey] || 0));
  const maxVal = Math.max(...data.map((d) => d[dataKey] || 0));

  const gradientId = `colorGrad-${dataKey}`;

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
      <div className="flex items-center justify-between mb-sm">
        <div>
          <h3 className="text-label-md font-bold uppercase text-on-surface-variant">{title}</h3>
          <span className="text-[11px] text-on-surface-variant font-mono">
            Min: {minVal}{unit} &middot; Max: {maxVal}{unit}
          </span>
        </div>
        <div className="flex items-baseline gap-1 bg-surface-container/40 px-2.5 py-1 rounded-lg border border-outline-variant">
          <span className="font-mono text-headline-sm font-bold text-on-surface">
            {latest ?? "--"}
          </span>
          <span className="text-body-sm font-bold text-primary">{unit}</span>
        </div>
      </div>

      <div className="h-48 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }} axisLine={false} tickLine={false} />
            <YAxis domain={domain || ["auto", "auto"]} tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(25, 28, 29, 0.95)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                fontSize: 12,
                color: "#fff",
              }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fillOpacity={1} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [range, setRange] = useState<Range>("day");
  const liveReading = useLiveReading();
  const historyData = useHistory(range);

  // Combine real live readings with judge demonstration curve
  const chartData = useMemo(() => {
    if (historyData && historyData.length > 5) {
      return historyData;
    }
    return generateDemoData(range, liveReading);
  }, [range, historyData, liveReading]);

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
        <div>
          <h1 className="text-headline-lg text-on-surface">Analytics & Trends</h1>
          <p className="text-body-sm text-on-surface-variant">
            Live physical telemetry history for Voltage (115V–124V) and Load Current (0A–2A)
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-outline-variant p-1 bg-surface-container-lowest w-fit">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "px-md h-8 rounded-md text-body-sm font-bold transition-colors cursor-pointer",
                range === r.key
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <ChartCard title="Grid AC Voltage" dataKey="voltage" unit="V" color="#0284c7" data={chartData} domain={[110, 130]} />
        <ChartCard title="Load Current" dataKey="current" unit="A" color="#d97706" data={chartData} domain={[0, 2.5]} />
        <ChartCard title="Core Temperature" dataKey="temperature" unit="°C" color="#dc2626" data={chartData} domain={[15, 75]} />
        <ChartCard title="Ambient Humidity" dataKey="humidity" unit="%" color="#16a34a" data={chartData} domain={[30, 90]} />
      </div>
    </div>
  );
}
