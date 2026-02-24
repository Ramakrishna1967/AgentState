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
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
                <p className="text-[var(--text-secondary)]">
                    {currentProject ? `Project: ${currentProject.name}` : "Select a project to view metrics"}
                </p>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    title="Total Traces"
                    value={metrics?.totalTraces.toLocaleString() || "0"}
                    color="blue"
                    icon="📊"
                />
                <MetricCard
                    title="Error Rate"
                    value={`${metrics?.errorRate || "0"}%`}
                    color="red"
                    icon="⚠️"
                />
                <MetricCard
                    title="Avg Latency"
                    value={`${metrics?.avgLatency || "0"}ms`}
                    color="green"
                    icon="⚡"
                />
                <MetricCard
                    title="Total Cost"
                    value={`$${metrics?.totalCost || "0.00"}`}
                    color="purple"
                    icon="💰"
                />
            </div>

            {/* Activity Section */}
            <div className="grid grid-cols-1 gap-6">
                <div className="card">
                    <h2 className="text-xl font-semibold mb-4">Trace Latency Overview</h2>
                    <p className="text-[var(--text-secondary)] mb-6">
                        Performance latency scatter mapping across Agent components.
                    </p>
                    <div className="h-96 w-full">
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
    color: "blue" | "red" | "green" | "purple";
    icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, color, icon }) => {
    const colorClasses = {
        blue: "text-[var(--accent-blue)]",
        red: "text-[var(--accent-red)]",
        green: "text-[var(--accent-green)]",
        purple: "text-[var(--accent-purple)]",
    };

    return (
        <div className="card hover:scale-105 transition-transform cursor-pointer">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm text-[var(--text-secondary)] mb-1">{title}</p>
                    <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
                </div>
                <span className="text-4xl">{icon}</span>
            </div>
        </div>
    );
};

export default Dashboard;
