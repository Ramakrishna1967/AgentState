import React from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useProject } from "../components/ProjectSwitcher";
import { SecurityPanel } from "../components/SecurityPanel";
import { SecurityMetricsChart } from "../components/SecurityMetricsChart";

export const Security: React.FC = () => {
    const { currentProject } = useProject();
    const { liveAlerts, isConnected } = useWebSocket(currentProject?.id);

    return (
        <div className="p-8 h-full flex flex-col overflow-y-auto space-y-8 font-mono">
            {/* Header */}
            <div className="flex justify-between items-end bg-black p-6 border-[3px] border-[var(--border-primary)] shadow-[var(--shadow-lg)] relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold tracking-widest mb-2 text-red-500 uppercase flex items-center gap-3">
                        &gt; SECURITY_CENTER
                    </h1>
                    <p className="text-[var(--text-tertiary)] uppercase tracking-widest text-sm">
                        REAL-TIME_THREAT_DETECTION_AND_VULNERABILITY_SCANNING
                    </p>
                </div>
                <div className="relative z-10 flex items-center gap-3 bg-black px-4 py-2 border-2 border-[var(--border-primary)] shadow-[var(--shadow-sm)]">
                    <div className="relative flex h-3 w-3">
                        {isConnected && <span className="animate-[ping_1s_infinite] absolute inline-flex h-full w-full bg-[#00ff41] opacity-75"></span>}
                        <span className={`relative inline-flex h-3 w-3 ${isConnected ? "bg-[#00ff41]" : "bg-red-500"}`}></span>
                    </div>
                    <span className="text-xs font-bold tracking-widest uppercase text-[var(--text-secondary)]">
                        {isConnected ? "[SOCKET_ACTIVE]" : "[DISCONNECTED]"}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 font-mono">
                {/* Stats / Overview */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-black p-6 border-2 border-[var(--border-primary)] relative overflow-hidden group hover:border-[#00ff41] transition-none shadow-[var(--shadow-md)]">
                        <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 font-mono">
                            [CURRENT_THREAT_LEVEL]
                        </h3>
                        <div className="flex items-baseline gap-3 mb-2">
                            <div className="text-5xl font-extrabold text-[#00ff41] tracking-tight">LOW</div>
                            <span className="text-2xl grayscale">✅</span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] uppercase font-bold">
                            NO_CRITICAL_THREATS_DETECTED_24H
                        </p>
                    </div>

                    <div className="bg-black p-6 border-2 border-[var(--border-primary)] relative overflow-hidden group hover:border-[var(--accent-purple)] transition-none shadow-[var(--shadow-md)]">
                        <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-4 flex items-center justify-between">
                            <span>[SECURITY_TRENDS]</span>
                            <span className="text-[10px] bg-black px-2 py-1 border border-[var(--border-secondary)]">7_DAYS</span>
                        </h3>
                        <div className="h-48 bg-black p-2 border-2 border-[var(--border-primary)] relative z-10 shadow-[var(--shadow-sm)]">
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

                    <div className="bg-black p-6 border-2 border-[var(--border-primary)] relative overflow-hidden shadow-[var(--shadow-md)] text-xs uppercase font-bold tracking-widest">
                        <h3 className="text-[var(--text-tertiary)] mb-4">
                            [ACTIVE_FIREWALL_RULES]
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-black border border-[var(--border-primary)]">
                                <span className="text-[var(--text-primary)]">Prompt_Injection_Block</span>
                                <span className="text-black bg-[#00ff41] px-2 py-1 border border-[#00ff41]">ACTIVE</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-black border border-[var(--border-primary)]">
                                <span className="text-[var(--text-primary)]">PII_Data_Scrubbing</span>
                                <span className="text-black bg-[#00ff41] px-2 py-1 border border-[#00ff41]">ACTIVE</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-black border border-[var(--border-primary)]">
                                <span className="text-[var(--text-primary)]">Anomaly_Heuristics</span>
                                <span className="text-black bg-[#00ff41] px-2 py-1 border border-[#00ff41]">ACTIVE</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Feed */}
                <div className="lg:col-span-2 flex flex-col min-h-0 bg-black border-[3px] border-[var(--border-primary)] shadow-[var(--shadow-lg)] uppercase font-mono tracking-widest text-xs font-bold overflow-hidden">
                    <div className="bg-[var(--bg-tertiary)] border-b-2 border-[var(--border-primary)] px-6 py-4 flex justify-between items-center">
                        <h2 className="text-[var(--text-primary)] flex items-center gap-2">
                            <span className="text-red-500 animate-[pulse_1s_infinite] text-lg">●</span> LIVE_ALERT_FEED
                        </h2>
                        <span className="px-3 py-1 bg-black text-red-500 border border-red-500">
                            {liveAlerts.length}_ALERTS
                        </span>
                    </div>
                    <div className="flex-1 bg-black p-4 overflow-y-auto custom-scrollbar">
                        {liveAlerts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] opacity-50">
                                <span className="text-6xl mb-4 grayscale">🛡️</span>
                                <p className="text-sm">SYSTEM_IS_SECURE._NO_RECENT_ALERTS.</p>
                            </div>
                        ) : (
                            <SecurityPanel alerts={liveAlerts} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Security;
