import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useHistory } from "@/hooks/useSensorData";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "day", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
] as const;

type Range = (typeof RANGES)[number]["key"];

function ChartCard({
  title,
  dataKey,
  unit,
  color,
  data,
}: {
  title: string;
  dataKey: "voltage" | "current" | "temperature" | "humidity";
  unit: string;
  color: string;
  data: ReturnType<typeof useHistory>;
}) {
  const latest = data[data.length - 1]?.[dataKey];
  return (
    <div className="rounded border border-outline-variant bg-surface-container-lowest p-md">
      <div className="flex items-center justify-between mb-sm">
        <h3 className="text-label-md uppercase text-on-surface-variant">{title}</h3>
        <span className="font-mono text-body-sm text-on-surface">
          {latest}
          {unit}
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--outline-variant)" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--surface-container-lowest)",
                border: "1px solid var(--outline-variant)",
                borderRadius: 4,
                fontSize: 12,
              }}
            />
            <Line type="linear" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [range, setRange] = useState<Range>("day");
  const data = useHistory(range);

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg text-on-surface">Analytics</h1>
        <div className="flex items-center gap-1 rounded border border-outline-variant p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "px-sm h-7 rounded text-body-sm",
                range === r.key
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <ChartCard title="Voltage" dataKey="voltage" unit="V" color="#00478d" data={data} />
        <ChartCard title="Current" dataKey="current" unit="A" color="#7a4100" data={data} />
        <ChartCard title="Temperature" dataKey="temperature" unit="C" color="#ba1a1a" data={data} />
        <ChartCard title="Humidity" dataKey="humidity" unit="%" color="#146c2e" data={data} />
      </div>
    </div>
  );
}
