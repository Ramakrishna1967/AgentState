// Copyright 2026 AgentStack Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * Dashboard page with metrics overview
 */

import React from "react";
import { useDashboardMetrics } from "../hooks/useTraces";
import { useProject } from "../components/ProjectSwitcher";
import { TraceLatencyChart } from "../components/TraceLatencyChart";

const Dashboard: React.FC = () => {
    const { currentProject } = useProject();
    const { data: metrics, isLoading, error } = useDashboardMetrics(currentProject?.id);

    if (isLoading) {
        return (
            <div className="p-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-[var(--bg-secondary)] rounded w-48 mb-8"></div>
                    <div className="grid grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-32 bg-[var(--bg-secondary)] rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-500">Failed to load metrics</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 font-mono">
            {/* Header */}
            <div className="flex justify-between items-end bg-black p-6 border-[3px] border-[var(--border-primary)] shadow-[var(--shadow-lg)] relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-[var(--accent-green)] uppercase">
                        &gt; Dashboard
                    </h1>
                    <p className="text-[var(--text-tertiary)] text-lg uppercase tracking-widest">
                        {currentProject ? (
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-[var(--accent-green)] animate-[pulse_1s_infinite]"></span>
                                STATUS: <span className="text-white font-medium">{currentProject.name}</span>_ONLINE
                            </span>
                        ) : "ERROR: NO_PROJECT_SELECTED"}
                    </p>
                </div>
                <div className="relative z-10">
                    <button className="btn-primary flex items-center gap-2">
                        <span>[LIVE_STREAM]</span>
                    </button>
                </div>
            </div>

            {/* Metrics Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Traces"
                    value={metrics?.totalTraces.toLocaleString() || "0"}
                    icon="📊"
                    trend="+12%"
                />
                <MetricCard
                    title="Error Rate"
                    value={`${metrics?.errorRate || "0"}%`}
                    icon="⚠️"
                    trend="-2.4%"
                />
                <MetricCard
                    title="Avg Latency"
                    value={`${metrics?.avgLatency || "0"}ms`}
                    icon="⚡"
                    trend="-15ms"
                />
                <MetricCard
                    title="Total Cost"
                    value={`$${metrics?.totalCost || "0.00"}`}
                    icon="💰"
                    trend="+$1.40"
                />
            </div>

            {/* Activity Section */}
            <div className="grid grid-cols-1 gap-6">
                <div className="card border-2 border-[var(--border-primary)] shadow-[var(--shadow-lg)] relative overflow-hidden group">
                    <div className="relative z-10 flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] uppercase tracking-widest">&gt; Trace_Latency_Overview</h2>
                            <p className="text-[var(--text-tertiary)] mt-1 uppercase text-sm">
                                [SYSMSG] Performance scatter mapping initialized.
                            </p>
                        </div>
                        <span className="px-3 py-1 text-xs font-bold bg-[var(--accent-green)] text-black border border-[var(--accent-green)] uppercase tracking-widest">
                            Real-time
                        </span>
                    </div>

                    <div className="h-96 w-full relative z-10 bg-[var(--bg-primary)]/50 rounded-xl p-4 border border-[var(--border-primary)] shadow-inner">
                        <TraceLatencyChart data={[
                            { name: "VectorDB Query", latency: 500, category: "tool" },
                            { name: "Web Search", latency: 1200, category: "tool" },
                            { name: "GPT-4 (Summarize)", latency: 2500, category: "llm" },
                            { name: "Claude 3 (Email)", latency: 3100, category: "llm" },
                            { name: "Format Output", latency: 50, category: "internal" },
                            { name: "DB Lookup", latency: 250, category: "tool" },
                            { name: "GPT-4 (Refine)", latency: 1800, category: "llm" },
                            { name: "State Save", latency: 10, category: "internal" },
                        ]} />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface MetricCardProps {
    title: string;
    value: string;
    icon: string;
    trend?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend }) => {
    const isPositiveTrend = trend?.startsWith('+');

    return (
        <div className="card group cursor-pointer relative overflow-hidden border-[3px] border-[var(--border-primary)] hover:border-[var(--accent-green)] shadow-[var(--shadow-md)] bg-black transition-none hover:translate-x-1 hover:-translate-y-1">
            <div className="relative z-10 flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-xs font-bold tracking-widest text-[var(--text-tertiary)] uppercase mb-2 group-hover:text-white transition-colors">[{title}]</h3>
                    <div className="flex items-baseline gap-3">
                        <p className="text-3xl font-extrabold tracking-tight text-[var(--accent-green)]">{value}</p>
                        {trend && (
                            <span className={`text-xs font-bold px-2 py-1 bg-transparent border-b-2 ${isPositiveTrend ? 'text-[var(--accent-green)] border-[var(--accent-green)]' : 'text-[var(--accent-red)] border-[var(--accent-red)]'}`}>
                                {trend}
                            </span>
                        )}
                    </div>
                </div>
                <div className="p-3 bg-transparent border-[2px] border-[var(--border-primary)] shadow-[var(--shadow-sm)] group-hover:border-[var(--accent-green)] transition-none">
                    <span className="text-2xl block grayscale">{icon}</span>
                </div>
            </div>

            {/* Interactive Bottom Bar */}
            <div className="absolute bottom-0 left-0 h-2 w-full bg-[var(--border-primary)] overflow-hidden">
                <div className="h-full w-0 group-hover:w-full bg-[var(--accent-green)] transition-all duration-300 ease-linear"></div>
            </div>
        </div>
    );
};

export default Dashboard;
