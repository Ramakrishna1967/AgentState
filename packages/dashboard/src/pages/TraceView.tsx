// Copyright 2026 AgentStack Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * Trace View page — Timeline + Detail panel
 */

import React, { useState } from "react";
import { useTraces, useTraceDetail } from "../hooks/useTraces";
import type { TraceFilters } from "../hooks/useTraces";
import { useProject } from "../components/ProjectSwitcher";
import TraceSearch from "../components/TraceSearch";
import TraceTimeline from "../components/TraceTimeline";
import SpanDetail from "../components/SpanDetail";
import ReplayViewer from "../components/ReplayViewer";
import type { Span, Trace } from "../lib/types";
import { formatDuration, formatRelativeTime, getStatusColor } from "../lib/utils";

const TraceView: React.FC = () => {
    const { currentProject } = useProject();
    const [filters, setFilters] = useState<TraceFilters>({
        project_id: currentProject?.id,
        page: 1,
        page_size: 20,
    });
    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
    const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
    const [viewMode, setViewMode] = useState<"timeline" | "replay">("timeline");

    const { data: tracesData, isLoading: tracesLoading } = useTraces(filters);
    const { data: traceDetail, isLoading: detailLoading } = useTraceDetail(selectedTraceId);

    const handleFilterChange = (newFilters: Partial<TraceFilters>) => {
        setFilters({ ...filters, ...newFilters, page: 1 });
    };

    const handleTraceClick = (traceId: string) => {
        if (selectedTraceId !== traceId) {
            setSelectedTraceId(traceId);
            setSelectedSpan(null);
            setViewMode("timeline"); // reset to timeline on new trace
        }
    };

    const handleSpanClick = (span: Span) => {
        setSelectedSpan(span);
    };

    return (
        <div className="p-8 space-y-6 font-mono">
            {/* Header */}
            <div className="flex justify-between items-end bg-black p-6 border-[3px] border-[var(--border-primary)] shadow-[var(--shadow-lg)] relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold tracking-widest mb-2 text-[var(--accent-green)] uppercase">
                        &gt; Traces
                    </h1>
                    <p className="text-[var(--text-tertiary)] uppercase tracking-widest">
                        {currentProject ? (
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-[var(--accent-green)] animate-[pulse_1s_infinite]"></span>
                                STATUS: <span className="text-white font-bold">{currentProject.name}</span>_ONLINE
                            </span>
                        ) : "ERROR: NO_PROJECT_SELECTED"}
                    </p>
                </div>
            </div>

            {/* Search Filters */}
            <TraceSearch onFilter={handleFilterChange} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-mono">
                {/* Trace List (Left Column) */}
                <div className="lg:col-span-1">
                    <div className="bg-black border-2 border-[var(--border-primary)] shadow-[var(--shadow-lg)] flex flex-col h-[700px]">
                        <div className="bg-[var(--bg-tertiary)] border-b-2 border-[var(--border-primary)] px-5 py-4 shrink-0 flex justify-between items-center text-xs uppercase tracking-widest font-bold">
                            <h3 className="text-[var(--text-primary)]">RECENT_TRACES</h3>
                            <button onClick={() => setFilters({ ...filters })} className="text-[var(--text-secondary)] hover:text-white transition-none" title="Refresh">
                                [O]
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            {tracesLoading ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                                    <div className="text-[var(--accent-green)] animate-pulse uppercase tracking-widest font-bold">&gt; LOADING...</div>
                                </div>
                            ) : tracesData?.items.length === 0 ? (
                                <div className="p-8 text-center text-[var(--text-tertiary)] flex flex-col items-center justify-center h-full uppercase tracking-widest font-bold">
                                    <span className="text-4xl mb-4 opacity-50 block">📭</span>
                                    ERR_NO_TRACES
                                </div>
                            ) : (
                                tracesData?.items.map((trace: Trace) => (
                                    <div
                                        key={trace.trace_id}
                                        onClick={() => handleTraceClick(trace.trace_id)}
                                        className={`px-5 py-4 border-b border-[var(--border-primary)] cursor-pointer transition-none relative group overflow-hidden ${selectedTraceId === trace.trace_id
                                            ? "bg-[var(--bg-tertiary)] border-l-4 border-l-[var(--accent-green)]"
                                            : "hover:bg-[var(--bg-hover)] border-l-4 border-l-transparent"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2 relative z-10">
                                            <span className={`text-sm font-bold tracking-wider ${selectedTraceId === trace.trace_id ? 'text-[var(--accent-green)]' : 'text-[var(--text-primary)]'}`}>
                                                {trace.trace_id.slice(0, 12)}...
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(trace.status).replace('text-', 'bg-').replace(']', ']/20 text-')}`}>
                                                {trace.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1 relative z-10">
                                            <span className="flex items-center gap-1">⚡ {trace.span_count} spans</span>
                                            <span className="font-mono bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-secondary)]">
                                                {trace.duration_ms ? formatDuration(trace.duration_ms) : "N/A"}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-[var(--text-tertiary)] mt-2 flex items-center gap-1 relative z-10">
                                            🕒 {formatRelativeTime(trace.start_time)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Timeline + Detail OR Replay (Right Columns) */}
                <div className="lg:col-span-3 space-y-6 flex flex-col font-mono">
                    {selectedTraceId ? (
                        <div className="bg-black border-2 border-[var(--border-primary)] flex-1 flex flex-col shadow-[var(--shadow-lg)] relative">
                            {/* View Mode Toggle Tabs */}
                            <div className="flex gap-4 p-4 border-b-2 border-[var(--border-primary)] bg-[var(--bg-tertiary)] relative z-10">
                                <button
                                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-none flex items-center gap-2 border-2 ${viewMode === "timeline"
                                        ? "bg-[var(--accent-green)] text-black border-[var(--accent-green)]"
                                        : "bg-transparent text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] border-transparent"
                                        }`}
                                    onClick={() => setViewMode("timeline")}
                                >
                                    <span>[WATERFALL]</span>
                                </button>
                                <button
                                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-none flex items-center gap-2 border-2 ${viewMode === "replay"
                                        ? "bg-[var(--accent-purple)] text-white border-[var(--accent-purple)]"
                                        : "bg-transparent text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-white border-transparent"
                                        }`}
                                    onClick={() => setViewMode("replay")}
                                >
                                    <span>[TIME_MACHINE]</span>
                                </button>

                                <div className="ml-auto flex items-center px-4">
                                    <span className="text-xs font-bold text-[var(--text-tertiary)] tracking-widest uppercase">ID: {selectedTraceId}</span>
                                </div>
                            </div>

                            <div className="flex-1 relative z-10 flex flex-col p-4 overflow-hidden">
                                {viewMode === "timeline" ? (
                                    <>
                                        {detailLoading ? (
                                            <div className="flex-1 flex flex-col items-center justify-center">
                                                <div className="w-12 h-12 rounded-full border-4 border-[var(--accent-blue)] border-t-transparent animate-spin mb-4"></div>
                                                <div className="animate-pulse-glow text-lg font-medium">Loading execution timeline...</div>
                                            </div>
                                        ) : traceDetail ? (
                                            <>
                                                <TraceTimeline
                                                    spans={traceDetail.spans}
                                                    onSpanClick={handleSpanClick}
                                                    selectedSpanId={selectedSpan?.span_id}
                                                />
                                                <SpanDetail span={selectedSpan} onClose={() => setSelectedSpan(null)} />
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                                                <span className="text-4xl mb-4">⚠️</span>
                                                <p>Failed to load trace details.</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <ReplayViewer traceId={selectedTraceId} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-black border-2 border-[var(--border-primary)] border-dashed flex-1 flex flex-col items-center justify-center min-h-[600px]">
                            <h2 className="text-2xl font-bold mb-2 text-[var(--text-tertiary)] uppercase tracking-widest">NO_TRACE_SELECTED</h2>
                            <p className="text-[var(--text-secondary)] text-center max-w-sm uppercase font-bold text-xs">
                                ❯ Select a trace from the sidebar to initialize visualization.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TraceView;
