import React from "react";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface TraceLatencyChartProps {
    data: any[]; // [ { name: "LLM Call", latency: 1200, category: "llm" }, ... ]
}

export const TraceLatencyChart: React.FC<TraceLatencyChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                No trace latency data available for this period.
            </div>
        );
    }

    // Split data by categories assuming we receive simple span-like objects
    const llmData = data.filter((d) => d.category === "llm");
    const toolData = data.filter((d) => d.category === "tool");
    const internalData = data.filter((d) => d.category === "internal");

    return (
        <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis
                    type="category"
                    dataKey="name"
                    name="Operation"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 12 }}
                />
                <YAxis
                    type="number"
                    dataKey="latency"
                    name="Latency"
                    unit="ms"
                    stroke="var(--text-secondary)"
                />
                <ZAxis
                    type="number"
                    range={[60, 400]}
                />
                <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)" }}
                />
                <Legend />
                <Scatter name="LLM Generations" data={llmData} fill="#8884d8" />
                <Scatter name="External Tools" data={toolData} fill="#82ca9d" />
                <Scatter name="Internal Nodes" data={internalData} fill="#ffc658" />
            </ScatterChart>
        </ResponsiveContainer>
    );
};
