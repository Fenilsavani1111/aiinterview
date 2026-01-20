import { Activity, CheckCircle, XCircle, AlertTriangle, Info, Bell } from "lucide-react";
import { useEffect, useRef } from "react";

const MatricsView = ({ metrics, alerts }: { metrics: Record<string, unknown>, alerts: Array<{ message?: string; type?: string;[k: string]: unknown }> }) => {
    const alertsContainerRef = useRef<HTMLDivElement | null>(null);

    const formatMetricKey = (k: string) =>
        k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    useEffect(() => {
        if (alertsContainerRef.current) {
            alertsContainerRef.current.scrollTop =
                alertsContainerRef.current.scrollHeight;
        }
    }, [alerts]);

    return (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Live Metrics */}
            <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-indigo-50/30 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200/60 bg-white/60">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700">Live Metrics</span>
                </div>
                <div className="p-3 min-h-[52px]">
                    {Object.keys(metrics).length === 0 ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Waiting for data…
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(metrics).map(([k, v]) => (
                                <div
                                    key={k}
                                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/70 border border-slate-100 shadow-sm"
                                >
                                    <span className="text-xs text-slate-500 truncate">{formatMetricKey(k)}</span>
                                    {typeof v === "boolean" ? (
                                        v ? (
                                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                        )
                                    ) : (
                                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[80px]">
                                            {typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Alerts */}
            <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-amber-50/40 to-rose-50/20 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-200/50 bg-white/60">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-slate-700">Recent Alerts</span>
                </div>
                <div className="max-h-28 overflow-y-auto p-2" ref={alertsContainerRef}>
                    {alerts.length === 0 ? (
                        <p className="text-slate-400 text-sm py-2 px-1">No alerts</p>
                    ) : (
                        <ul className="space-y-1.5">
                            {[...alerts].reverse().slice(0, 8).map((a, i) => {
                                const obj = typeof a === "object" && a && !Array.isArray(a) ? a : { message: String(a) };
                                const t = (obj.type || obj.severity || "info") as string;
                                const isWarn = /warn|attention/i.test(t);
                                const isErr = /error|critical|fail/i.test(t);
                                const Icon = isErr ? XCircle : isWarn ? AlertTriangle : Info;
                                const border = isErr ? "border-l-rose-400" : isWarn ? "border-l-amber-400" : "border-l-indigo-400";
                                const bg = isErr ? "bg-rose-50/60" : isWarn ? "bg-amber-50/60" : "bg-indigo-50/40";
                                const msg = (obj as { message?: string }).message ?? (typeof a === "string" ? a : JSON.stringify(a));
                                return (
                                    <li
                                        key={i}
                                        className={`flex items-start gap-2 px-2.5 py-1.5 rounded-r-lg border-l-2 ${border} ${bg}`}
                                    >
                                        <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />
                                        <span className="text-xs text-slate-700">{msg}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}

export default MatricsView
