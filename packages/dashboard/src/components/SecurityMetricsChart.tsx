import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface SecurityMetricsChartProps {
    data: any[]; // { timestamp: string, anomalies: number, prompt_injections: number }
}

export const SecurityMetricsChart: React.FC<SecurityMetricsChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                No security metrics data available for this period.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis
                    dataKey="timestamp"
                    stroke="var(--text-secondary)"
                    tickFormatter={(val: any) => {
                        const date = new Date(val);
                        // If it's a date string, handle formatting. If it's a categorical 'day', just return.
                        return isNaN(date.getTime()) ? val : date.toLocaleDateString();
                    }}
                />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                    contentStyle={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    itemStyle={{ color: "var(--text-primary)" }}
                />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="anomalies"
                    stroke="#ffc658"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                    name="Detected Anomalies"
                />
                <Line
                    type="monotone"
                    dataKey="prompt_injections"
                    stroke="#ff4d4f"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                    name="Prompt Injections"
                />
            </LineChart>
        </ResponsiveContainer>
    );
};
