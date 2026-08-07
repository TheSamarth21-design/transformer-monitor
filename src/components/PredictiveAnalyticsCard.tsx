import { useEffect, useState } from "react";
import { Brain, Activity, Clock, ShieldAlert, CheckCircle, AlertTriangle, ArrowUpRight } from "lucide-react";
import { apiRequest, subscribeWebSocket } from "@/lib/api";

export interface MlAnalysisData {
  healthScore: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  failureMode: string;
  recommendedAction: string;
  estimatedRul: string;
  metrics: {
    loadRatioPercent: number;
    tempSlopePerMin: number;
    voltageVariance: number;
  };
  timestamp: string;
}

export function PredictiveAnalyticsCard() {
  const [mlData, setMlData] = useState<MlAnalysisData>({
    healthScore: 94,
    riskLevel: "LOW",
    failureMode: "Normal Operation",
    recommendedAction: "Optimal operational parameters. Routine monitoring.",
    estimatedRul: "> 10,000 Hours",
    metrics: {
      loadRatioPercent: 42,
      tempSlopePerMin: 0.1,
      voltageVariance: 0.4,
    },
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    // Initial fetch
    apiRequest<MlAnalysisData>("/analytics/predictive")
      .then((data) => setMlData(data))
      .catch(() => {});

    // Live WebSocket listener
    const unsubscribe = subscribeWebSocket((event) => {
      if (event.type === "LIVE_READING" && event.data?.mlAnalysis) {
        setMlData(event.data.mlAnalysis);
      }
    });

    return unsubscribe;
  }, []);

  const riskColors = {
    LOW: "bg-success/15 border-success/30 text-success",
    MODERATE: "bg-warning/15 border-warning/30 text-warning",
    HIGH: "bg-orange-500/15 border-orange-500/30 text-orange-400",
    CRITICAL: "bg-error/20 border-error/40 text-error animate-pulse",
  };

  const healthScoreColor =
    mlData.healthScore > 85
      ? "text-success bg-success"
      : mlData.healthScore > 65
      ? "text-warning bg-warning"
      : mlData.healthScore > 40
      ? "text-orange-400 bg-orange-500"
      : "text-error bg-error";

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-md shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-sm border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary-container/20 text-primary">
            <Brain size={20} />
          </div>
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">
              ML Predictive Fault Analysis
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Failure mode prediction & health forecasting
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
            riskColors[mlData.riskLevel]
          }`}
        >
          {mlData.riskLevel} RISK
        </span>
      </div>

      {/* Health Score Meter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md items-center bg-surface-container/40 p-md rounded-xl border border-outline-variant/40">
        <div>
          <span className="text-label-sm uppercase text-on-surface-variant">
            Health Index Score
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-display-sm font-bold font-mono ${healthScoreColor.split(" ")[0]}`}>
              {mlData.healthScore}%
            </span>
            <span className="text-body-sm text-on-surface-variant">/ 100%</span>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col gap-1.5">
          <div className="flex justify-between text-body-sm">
            <span className="text-on-surface-variant font-medium">Condition Status</span>
            <span className="font-bold text-on-surface">{mlData.failureMode}</span>
          </div>
          <div className="h-3 w-full bg-outline-variant/40 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${healthScoreColor.split(" ")[1]}`}
              style={{ width: `${mlData.healthScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* RUL & Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        
        {/* Remaining Useful Life */}
        <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary-container/20 text-primary mt-0.5">
            <Clock size={18} />
          </div>
          <div>
            <span className="text-label-sm uppercase text-on-surface-variant">
              Estimated Time Before Fault (RUL)
            </span>
            <p className="text-body-md font-bold font-mono text-on-surface mt-0.5">
              {mlData.estimatedRul}
            </p>
          </div>
        </div>

        {/* Action Recommendation */}
        <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/15 text-warning mt-0.5">
            <ShieldAlert size={18} />
          </div>
          <div>
            <span className="text-label-sm uppercase text-on-surface-variant">
              Recommended Action
            </span>
            <p className="text-body-sm font-medium text-on-surface mt-0.5">
              {mlData.recommendedAction}
            </p>
          </div>
        </div>

      </div>

      {/* Feature Trends Grid */}
      <div className="grid grid-cols-3 gap-sm pt-xs border-t border-outline-variant/40 text-center">
        <div className="p-xs rounded bg-surface-container/30">
          <span className="text-label-sm text-on-surface-variant block">Load Ratio</span>
          <span className="text-body-md font-mono font-bold text-on-surface">
            {mlData.metrics.loadRatioPercent}% of 2A
          </span>
        </div>
        <div className="p-xs rounded bg-surface-container/30">
          <span className="text-label-sm text-on-surface-variant block">Temp Rise Slope</span>
          <span className="text-body-md font-mono font-bold text-on-surface">
            +{mlData.metrics.tempSlopePerMin} °C/min
          </span>
        </div>
        <div className="p-xs rounded bg-surface-container/30">
          <span className="text-label-sm text-on-surface-variant block">Voltage Stability</span>
          <span className="text-body-md font-mono font-bold text-on-surface">
            {mlData.metrics.voltageVariance < 1.0 ? "Stable" : "Unstable"}
          </span>
        </div>
      </div>

    </div>
  );
}
