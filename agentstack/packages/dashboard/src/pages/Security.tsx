import React from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useProject } from "../components/ProjectSwitcher";
import { SecurityPanel } from "../components/SecurityPanel";
import { SecurityMetricsChart } from "../components/SecurityMetricsChart";

export const Security: React.FC = () => {
    const { currentProject } = useProject();
    const { liveAlerts, isConnected } = useWebSocket(currentProject?.id);

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                        Security Center
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Real-time threat detection and vulnerability scanning
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span className="text-sm text-[var(--text-tertiary)]">
                        {isConnected ? "Live Monitoring" : "Disconnected"}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Stats / Overview */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-primary)]">
                        <h3 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
                            Threat Level
                        </h3>
                        <div className="text-4xl font-bold text-green-500">LOW</div>
                        <p className="text-sm text-[var(--text-secondary)] mt-2">
                            No critical threats detected in last 24h
                        </p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-primary)]">
                        <h3 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
                            Security Trends (Last 7 Days)
                        </h3>
                        <div className="h-48">
                            <SecurityMetricsChart data={[
                                { timestamp: "2026-10-01", anomalies: 2, prompt_injections: 0 },
                                { timestamp: "2026-10-02", anomalies: 5, prompt_injections: 1 },
                                { timestamp: "2026-10-03", anomalies: 1, prompt_injections: 0 },
                                { timestamp: "2026-10-04", anomalies: 4, prompt_injections: 3 },
                                { timestamp: "2026-10-05", anomalies: 2, prompt_injections: 0 },
                                { timestamp: "2026-10-06", anomalies: 0, prompt_injections: 0 },
                                { timestamp: "2026-10-07", anomalies: 7, prompt_injections: 2 },
                            ]} />
                        </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-primary)]">
                        <h3 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
                            Active Rules
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Prompt Injection</span>
                                <span className="text-green-500">Active</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>PII Detection</span>
                                <span className="text-green-500">Active</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Anomalies</span>
                                <span className="text-green-500">Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Feed */}
                <div className="lg:col-span-2 flex flex-col min-h-0">
                    <div className="bg-[var(--bg-secondary)] rounded-t-xl border border-[var(--border-primary)] p-4 border-b-0">
                        <h2 className="font-semibold text-[var(--text-primary)]">Live Alerts</h2>
                    </div>
                    <div className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-b-xl p-4 overflow-y-auto">
                        <SecurityPanel alerts={liveAlerts} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Security;
