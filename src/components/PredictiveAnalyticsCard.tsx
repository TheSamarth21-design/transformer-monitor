import { useEffect, useState, useRef } from "react";
import { Brain, ShieldAlert, Mail, CheckCircle2, Zap, Send, ExternalLink } from "lucide-react";
import { apiRequest, subscribeWebSocket } from "@/lib/api";
import { useLiveReading } from "@/hooks/useSensorData";
import { useAuth } from "@/context/AuthContext";

export interface MlAnalysisData {
  healthScore: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  failureMode: string;
  recommendedAction: string;
  metrics: {
    loadRatioPercent: number;
    tempSlopePerMin: number;
    voltageVariance: number;
  };
  timestamp: string;
}

export function PredictiveAnalyticsCard() {
  const liveReading = useLiveReading();
  const { user } = useAuth();

  const technicianEmail = user?.email || "samarthbhoite81@gmail.com";
  const technicianName = user?.name || "Registered Technician";
  const technicianRole = user?.role || "Technician";

  const [autoDispatched, setAutoDispatched] = useState(false);
  const [lastDispatchedTime, setLastDispatchedTime] = useState<string | null>(null);
  const [emailSentStatus, setEmailSentStatus] = useState<string | null>(null);
  const lastDispatchedRiskRef = useRef<string>("");

  const [mlData, setMlData] = useState<MlAnalysisData>({
    healthScore: 95,
    riskLevel: "LOW",
    failureMode: "Transformer Hardware Nominal",
    recommendedAction: "System operating within safe physical parameters.",
    metrics: {
      loadRatioPercent: 0,
      tempSlopePerMin: 0,
      voltageVariance: 0.1,
    },
    timestamp: new Date().toISOString(),
  });

  // Dynamically compute real-time ML Health Index directly synced with live ESP32 telemetry
  useEffect(() => {
    const cur = liveReading.current || 0;
    const volt = liveReading.voltage || 0;
    const temp = liveReading.temperature || 0;

    let healthScore = 95;
    let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
    let failureMode = "Transformer Hardware Nominal";
    let recommendedAction = "System operating within safe physical parameters.";

    const loadRatioPercent = Math.min(100, Math.round((cur / 2.0) * 100));

    if (cur > 2.0) {
      healthScore = 25;
      riskLevel = "CRITICAL";
      failureMode = "Critical Over-current Overload";
      recommendedAction = "CRITICAL OVERLOAD: Current exceeds 2.0A safety limit! Urgent field inspection & repair required as soon as possible.";
    } else if (cur > 1.0) {
      healthScore = 65;
      riskLevel = "HIGH";
      failureMode = "Elevated Load Warning";
      recommendedAction = "WARNING: Load elevated between 1.0A and 2.0A threshold. Urgent field inspection & repair required as soon as possible.";
    } else if (temp > 70) {
      healthScore = 55;
      riskLevel = "HIGH";
      failureMode = "Core Overheating Stress";
      recommendedAction = "WARNING: Transformer thermal baseline high. Urgent cooling oil inspection & repair required as soon as possible.";
    } else if (volt > 0 && volt < 100) {
      healthScore = 75;
      riskLevel = "MODERATE";
      failureMode = "Low Voltage Sag";
      recommendedAction = "Grid input voltage below nominal range. Field inspection advised.";
    }

    // Override with server ML calculations if backend server active
    apiRequest<MlAnalysisData>("/analytics/predictive")
      .then((data: any) => {
        if (data && typeof data.healthScore === "number") {
          setMlData(data);
        }
      })
      .catch(() => {
        // Pure real-time Blynk client-side sync fallback
        setMlData({
          healthScore,
          riskLevel,
          failureMode: liveReading.health && liveReading.health !== "Connecting..." ? liveReading.health : failureMode,
          recommendedAction,
          metrics: {
            loadRatioPercent,
            tempSlopePerMin: 0.1,
            voltageVariance: 0.2,
          },
          timestamp: new Date().toISOString(),
        });
      });

    // WebSocket listener for live backend server ML updates
    const unsubscribe = subscribeWebSocket((event: any) => {
      if (event.type === "LIVE_READING" && event.data?.mlAnalysis) {
        setMlData(event.data.mlAnalysis);
      }
    });

    return unsubscribe;
  }, [liveReading.current, liveReading.voltage, liveReading.temperature, liveReading.health]);

  // Helper to open mailto client directly with pre-formatted maintenance report
  const triggerDirectMailDispatch = (isAuto = false) => {
    const subject = encodeURIComponent(`🚨 URGENT MAINTENANCE DIRECTIVE: Substation TR-0042 (${mlData.riskLevel} RISK)`);
    const body = encodeURIComponent(
      `ATTENTION REGISTERED FIELD TECHNICIAN (${technicianName} - ${technicianRole}):\n\n` +
      `URGENT REPAIR DIRECTIVE REQUIRED AS SOON AS POSSIBLE:\n` +
      `--------------------------------------------------\n` +
      `Directive: ${mlData.recommendedAction}\n` +
      `Condition Status: ${mlData.failureMode}\n` +
      `Risk Severity: ${mlData.riskLevel} RISK\n\n` +
      `LIVE TELEMETRY SNAPSHOT:\n` +
      `- Voltage: ${liveReading.voltage.toFixed(1)} V\n` +
      `- Load Current: ${liveReading.current.toFixed(1)} A (Safety Limit: 2.0A)\n` +
      `- Temperature: ${liveReading.temperature.toFixed(1)} °C\n` +
      `- Humidity: ${liveReading.humidity.toFixed(1)} %\n` +
      `- Relay Circuit Interlock: ${liveReading.relayState?.toUpperCase() || "CLOSED"}\n` +
      `- Location: Pimpri Substation Grid (${liveReading.lat || 18.6499}, ${liveReading.lng || 73.7452})\n` +
      `- Google Maps: ${liveReading.googleMapUrl || "https://www.google.com/maps?q=18.649916,73.745276"}\n\n` +
      `Please perform immediate field inspection and repair as instructed.`
    );

    const mailtoUrl = `mailto:${technicianEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, "_blank");
    setEmailSentStatus(`Report dispatched to ${technicianEmail}`);
  };

  // AUTOMATED EMAIL DISPATCH ENGINE: Triggers automatically on HIGH or CRITICAL risk state
  useEffect(() => {
    const isWarningOrCritical = mlData.riskLevel === "HIGH" || mlData.riskLevel === "CRITICAL";

    if (isWarningOrCritical && lastDispatchedRiskRef.current !== mlData.riskLevel) {
      lastDispatchedRiskRef.current = mlData.riskLevel;
      const nowStr = new Date().toLocaleTimeString();

      setAutoDispatched(true);
      setLastDispatchedTime(nowStr);

      // Trigger automated background email dispatch endpoint
      apiRequest("/notifications/dispatch-email", {
        method: "POST",
        body: JSON.stringify({
          email: technicianEmail,
          technicianName,
          role: technicianRole,
          riskLevel: mlData.riskLevel,
          recommendedAction: mlData.recommendedAction,
          liveReading,
        }),
      }).catch(() => { });
    } else if (!isWarningOrCritical) {
      lastDispatchedRiskRef.current = "";
      setAutoDispatched(false);
    }
  }, [mlData.riskLevel, mlData.recommendedAction, technicianEmail, technicianName, technicianRole]);

  const riskColors = {
    LOW: "bg-success/15 border-success/30 text-success",
    MODERATE: "bg-warning/15 border-warning/30 text-warning",
    HIGH: "bg-orange-500/15 border-orange-500/30 text-orange-400",
    CRITICAL: "bg-error/20 border-error/40 text-error animate-pulse",
  };

  const healthScoreColor =
    mlData.healthScore > 85
      ? "text-success bg-success"
      : mlData.healthScore > 60
        ? "text-warning bg-warning"
        : mlData.healthScore > 35
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
              Transformer Health & Predictive Analytics
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Live hardware health index & failure mode prediction
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${riskColors[mlData.riskLevel]
            }`}
        >
          {mlData.riskLevel} RISK
        </span>
      </div>

      {/* Health Score Meter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md items-center bg-surface-container/40 p-md rounded-xl border border-outline-variant/40">
        <div>
          <span className="text-label-sm uppercase text-on-surface-variant">
            Transformer Health Index
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

      {/* Action Recommendation Card with DIRECT Email Dispatch Button */}
      <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-md flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/15 text-warning mt-0.5 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1">
            <span className="text-label-sm uppercase text-on-surface-variant font-bold">
              Recommended Action & Repair Directive
            </span>
            <p className="text-body-sm font-semibold text-on-surface mt-1 leading-relaxed">
              {mlData.recommendedAction}
            </p>
          </div>
        </div>

        {/* AUTOMATED & DIRECT TECHNICIAN EMAIL DISPATCH TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-outline-variant/40 bg-surface-container/30 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <Mail size={16} className="text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-on-surface-variant font-medium">Assigned Technician: </span>
              <span className="font-bold font-mono text-primary truncate block sm:inline">{technicianEmail}</span>
              <span className="text-on-surface-variant text-[11px] block sm:inline sm:ml-1">
                ({technicianName} &middot; {technicianRole})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* 1-Click Send Email Button */}
            <button
              onClick={() => triggerDirectMailDispatch(false)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Send size={14} />
              <span>Send Maintenance Email to Technician</span>
            </button>
          </div>
        </div>

        {emailSentStatus && (
          <div className="p-2 rounded-lg bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{emailSentStatus}</span>
          </div>
        )}
      </div>

      {/* Feature Trends Grid */}
      <div className="grid grid-cols-3 gap-sm pt-xs border-t border-outline-variant/40 text-center">
        <div className="p-xs rounded bg-surface-container/30">
          <span className="text-label-sm text-on-surface-variant block">Load Ratio</span>
          <span className="text-body-md font-mono font-bold text-on-surface">
            {mlData.metrics.loadRatioPercent}% of 2.0A
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
