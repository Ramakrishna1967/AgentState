import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "../components/ProjectSwitcher";
import { CostChart } from "../components/CostChart";
import { TokenUsageChart } from "../components/TokenUsageChart";
import { apiClient } from "../lib/api";

export const Analytics: React.FC = () => {
    const { currentProject } = useProject();

    const { data, isLoading } = useQuery({
        queryKey: ["analytics", "cost", currentProject?.id],
        queryFn: async () => {
            if (!currentProject?.id) return { data: [] };
            const res = await apiClient.get("/analytics/cost", {
                params: {
                    project_id: currentProject.id,
                    interval: "day",
                },
            });
            return res.data;
        },
        enabled: !!currentProject?.id,
    });

    // Mock token data for demonstration since cost API returns USD.
    // In production, this would come from an explicit /analytics/tokens endpoint.
    const mockTokenData = [
        { timestamp: "2026-10-01", prompt_tokens: 4000, completion_tokens: 1200 },
        { timestamp: "2026-10-02", prompt_tokens: 6500, completion_tokens: 3000 },
        { timestamp: "2026-10-03", prompt_tokens: 3200, completion_tokens: 800 },
        { timestamp: "2026-10-04", prompt_tokens: 8900, completion_tokens: 4100 },
        { timestamp: "2026-10-05", prompt_tokens: 12500, completion_tokens: 5600 },
        { timestamp: "2026-10-06", prompt_tokens: 11200, completion_tokens: 4900 },
        { timestamp: "2026-10-07", prompt_tokens: 15400, completion_tokens: 7200 },
    ];

    return (
        <div className="p-8 h-full flex flex-col overflow-y-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                    Analytics
                </h1>
                <p className="text-[var(--text-secondary)] mt-1">
                    Cost and usage breakdown
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Cost Over Time */}
                <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-primary)]">
                    <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                        Cost over Time (USD)
                    </h2>
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">Loading...</div>
                    ) : (
                        <CostChart data={data?.data || []} />
                    )}
                </div>

                {/* Token Usage Over Time */}
                <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-primary)]">
                    <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                        Token Usage (Last 7 Days)
                    </h2>
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">Loading...</div>
                    ) : (
                        <TokenUsageChart data={mockTokenData} />
                    )}
                </div>
            </div>

            {/* Usage Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-primary)]">
                    <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                        Total Spend (Last 7 Days)
                    </h2>
                    <div className="text-5xl font-bold text-[var(--text-primary)]">
                        ${data?.data?.reduce((acc: number, curr: any) => acc + (curr.total_cost || 0), 0).toFixed(2) || "0.00"}
                    </div>
                </div>

                <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-primary)]">
                    <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                        Total Tokens (Last 7 Days)
                    </h2>
                    <div className="text-5xl font-bold text-[var(--text-primary)]">
                        {(mockTokenData.reduce((acc, curr) => acc + curr.prompt_tokens + curr.completion_tokens, 0) / 1000).toFixed(1)}k
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">Combined Output & Protocol Tokens</p>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
