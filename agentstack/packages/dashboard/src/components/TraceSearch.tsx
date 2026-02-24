// Copyright 2026 AgentStack Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * Trace search and filter component
 */

import React, { useState } from "react";

interface TraceSearchProps {
    onFilter: (filters: {
        status?: string;
        startDate?: number;
        endDate?: number;
        searchQuery?: string;
    }) => void;
}

const TraceSearch: React.FC<TraceSearchProps> = ({ onFilter }) => {
    const [status, setStatus] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const handleApplyFilters = () => {
        onFilter({
            status: status || undefined,
            searchQuery: searchQuery || undefined,
        });
    };

    return (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4">
                {/* Search Input */}
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search traces..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-blue)]"
                    />
                </div>

                {/* Status Filter */}
                <div className="min-w-[150px]">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[var(--accent-blue)]"
                    >
                        <option value="">All Status</option>
                        <option value="OK">OK</option>
                        <option value="ERROR">ERROR</option>
                    </select>
                </div>

                {/* Apply Button */}
                <button
                    onClick={handleApplyFilters}
                    className="btn-primary px-6 py-2"
                >
                    Apply Filters
                </button>
            </div>
        </div>
    );
};

export default TraceSearch;
