import React from "react";
import type { SecurityAlert } from "../hooks/useWebSocket";

interface SecurityPanelProps {
    alerts: SecurityAlert[];
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({ alerts }) => {
    return (
        <div className="space-y-4">
            {alerts.length === 0 ? (
                <div className="text-[var(--text-tertiary)] text-center py-8 bg-[var(--bg-secondary)] rounded-lg">
                    No active security alerts
                </div>
            ) : (
                alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`p-4 rounded-lg border flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300
                            ${alert.severity === "CRITICAL"
                                ? "bg-red-500/10 border-red-500/50"
                                : alert.severity === "HIGH"
                                    ? "bg-orange-500/10 border-orange-500/50"
                                    : "bg-[var(--bg-secondary)] border-[var(--border-primary)]"
                            }
                        `}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded
                                        ${alert.severity === "CRITICAL"
                                            ? "bg-red-500 text-white"
                                            : alert.severity === "HIGH"
                                                ? "bg-orange-500 text-white"
                                                : "bg-blue-500 text-white"
                                        }
                                    `}
                                >
                                    {alert.severity}
                                </span>
                                <h3 className="font-medium text-[var(--text-primary)]">
                                    {alert.rule}
                                </h3>
                                <span className="text-xs text-[var(--text-tertiary)] ml-auto">
                                    {new Date(
                                        alert.created_at * 1000
                                    ).toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {alert.description}
                            </p>
                            {alert.trace_id && (
                                <div className="mt-2 text-xs text-[var(--text-tertiary)] font-mono bg-black/20 p-1 rounded inline-block">
                                    Trace: {alert.trace_id.slice(0, 8)}
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
