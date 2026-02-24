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
        <div className="p-8">
            {/* Header */}
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Traces</h1>
                    <p className="text-[var(--text-secondary)]">
                        {currentProject ? `Project: ${currentProject.name}` : "Select a project to view traces"}
                    </p>
                </div>
            </div>

            {/* Search Filters */}
            <TraceSearch onFilter={handleFilterChange} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trace List (Left Column) */}
                <div className="lg:col-span-1">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden flex flex-col h-[700px]">
                        <div className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] px-4 py-3 shrink-0">
                            <h3 className="font-semibold">Recent Traces</h3>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {tracesLoading ? (
                                <div className="p-8 text-center">
                                    <div className="animate-pulse-glow">Loading traces...</div>
                                </div>
                            ) : tracesData?.items.length === 0 ? (
                                <div className="p-8 text-center text-[var(--text-secondary)]">
                                    No traces found
                                </div>
                            ) : (
                                tracesData?.items.map((trace: Trace) => (
                                    <div
                                        key={trace.trace_id}
                                        onClick={() => handleTraceClick(trace.trace_id)}
                                        className={`px-4 py-3 border-b border-[var(--border-primary)] cursor-pointer transition-colors ${selectedTraceId === trace.trace_id
                                            ? "bg-[var(--bg-hover)] border-l-4 border-l-[var(--accent-blue)]"
                                            : "hover:bg-[var(--bg-hover)]"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-mono text-[var(--text-primary)]">
                                                {trace.trace_id.slice(0, 12)}...
                                            </span>
                                            <span className={`text-xs ${getStatusColor(trace.status)}`}>
                                                {trace.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                                            <span>{trace.span_count} spans</span>
                                            <span>
                                                {trace.duration_ms ? formatDuration(trace.duration_ms) : "N/A"}
                                            </span>
                                        </div>
                                        <div className="text-xs text-[var(--text-tertiary)] mt-1">
                                            {formatRelativeTime(trace.start_time)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Timeline + Detail OR Replay (Right Columns) */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedTraceId && (
                        <>
                            {/* View Mode Toggle Tabs */}
                            <div className="flex gap-2 mb-4 border-b border-[var(--border-primary)]">
                                <button
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === "timeline" ? "border-[var(--accent-blue)] text-[var(--accent-blue)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        }`}
                                    onClick={() => setViewMode("timeline")}
                                >
                                    Waterfall Timeline
                                </button>
                                <button
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === "replay" ? "border-[var(--accent-blue)] text-[var(--accent-blue)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        }`}
                                    onClick={() => setViewMode("replay")}
                                >
                                    ⏪ Time Machine
                                </button>
                            </div>

                            {viewMode === "timeline" ? (
                                <>
                                    {detailLoading ? (
                                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-8 text-center h-[600px] flex items-center justify-center">
                                            <div className="animate-pulse-glow">Loading trace details...</div>
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
                                    ) : null}
                                </>
                            ) : (
                                <ReplayViewer traceId={selectedTraceId} />
                            )}
                        </>
                    )}

                    {!selectedTraceId && (
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-8 text-center h-[700px] flex items-center justify-center flex-col">
                            <span className="text-4xl mb-4 text-[var(--text-tertiary)]">🔍</span>
                            <p className="text-[var(--text-secondary)]">
                                Select a trace from the list to view its timeline or Time Machine replay.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TraceView;
