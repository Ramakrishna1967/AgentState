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
        <div className="p-8 h-full flex flex-col overflow-y-auto space-y-8 font-mono">
            {/* Header */}
            <div className="flex justify-between items-end bg-black p-6 border-[3px] border-[var(--border-primary)] shadow-[var(--shadow-lg)] relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold tracking-widest mb-2 text-[var(--accent-purple)] uppercase">
                        &gt; Analytics
                    </h1>
                    <p className="text-[var(--text-tertiary)] uppercase tracking-widest">
                        Cost_and_Token_Usage_Breakdown
                    </p>
                </div>
                <div className="relative z-10 hidden sm:block">
                    <span className="px-4 py-2 border-2 border-[var(--border-primary)] bg-black text-[var(--accent-purple)] font-bold text-sm shadow-[var(--shadow-sm)] uppercase tracking-widest">
                        INTERVAL: <span className="text-white">1_DAY</span>
                    </span>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
                {/* Cost Over Time */}
                <div className="bg-black p-6 border-2 border-[var(--border-primary)] shadow-[var(--shadow-lg)] relative overflow-hidden hover:border-[var(--accent-blue)] transition-none">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-widest">
                        <span className="text-[var(--accent-blue)] grayscale">💰</span>
                        <span className="text-[var(--text-primary)]">Cost_over_Time_USD</span>
                    </h2>
                    <div className="bg-black border-2 border-[var(--border-primary)] p-4 shadow-[var(--shadow-sm)]">
                        {isLoading ? (
                            <div className="h-64 flex flex-col items-center justify-center">
                                <span className="text-[var(--accent-blue)] animate-pulse uppercase font-bold tracking-widest">&gt; LOADING_COST_DATA...</span>
                            </div>
                        ) : (
                            <div className="h-64">
                                <CostChart data={data?.data || []} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Token Usage Over Time */}
                <div className="bg-black p-6 border-2 border-[var(--border-primary)] shadow-[var(--shadow-lg)] relative overflow-hidden hover:border-[var(--accent-green)] transition-none">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-widest">
                        <span className="text-[var(--accent-green)] grayscale">📈</span>
                        <span className="text-[var(--text-primary)]">Token_Usage_7D</span>
                    </h2>
                    <div className="bg-black border-2 border-[var(--border-primary)] p-4 shadow-[var(--shadow-sm)]">
                        {isLoading ? (
                            <div className="h-64 flex flex-col items-center justify-center">
                                <span className="text-[var(--accent-green)] animate-pulse uppercase font-bold tracking-widest">&gt; LOADING_TOKEN_DATA...</span>
                            </div>
                        ) : (
                            <div className="h-64">
                                <TokenUsageChart data={mockTokenData} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
                <div className="bg-black p-6 border-[3px] border-[var(--border-primary)] flex items-center justify-between hover:border-[var(--accent-blue)] shadow-[var(--shadow-md)] transition-none hover:translate-x-1 hover:-translate-y-1">
                    <div>
                        <h2 className="text-xs font-bold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">[TOTAL_SPEND_7D]</h2>
                        <div className="text-4xl font-extrabold text-[var(--accent-blue)] tracking-tight">
                            ${data?.data?.reduce((acc: number, curr: { total_cost?: number }) => acc + (curr.total_cost || 0), 0).toFixed(2) || "0.00"}
                        </div>
                    </div>
                    <div className="h-16 w-16 bg-black border-[2px] border-[var(--border-primary)] flex items-center justify-center shadow-[var(--shadow-sm)] grayscale">
                        <span className="text-3xl">💵</span>
                    </div>
                </div>

                <div className="bg-black p-6 border-[3px] border-[var(--border-primary)] flex items-center justify-between hover:border-[var(--accent-green)] shadow-[var(--shadow-md)] transition-none hover:translate-x-1 hover:-translate-y-1">
                    <div>
                        <h2 className="text-xs font-bold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">[TOTAL_TOKENS_7D]</h2>
                        <div className="flex items-baseline gap-2">
                            <div className="text-4xl font-extrabold text-[var(--accent-green)] tracking-tight">
                                {(mockTokenData.reduce((acc, curr) => acc + curr.prompt_tokens + curr.completion_tokens, 0) / 1000).toFixed(1)}k
                            </div>
                        </div>
                        <p className="text-xs font-bold text-[var(--text-tertiary)] mt-2 uppercase bg-[var(--bg-tertiary)] inline-block px-2 py-1 border border-[var(--border-primary)]">[COMBINED_IO]</p>
                    </div>
                    <div className="h-16 w-16 bg-black border-[2px] border-[var(--border-primary)] flex items-center justify-center shadow-[var(--shadow-sm)] grayscale">
                        <span className="text-3xl">🔣</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
