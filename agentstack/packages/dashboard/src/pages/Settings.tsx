// Copyright 2026 AgentStack Contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * Settings page — API key and project management
 */

import React, { useState } from "react";
import { useProjects, useCreateProject, useDeleteProject } from "../hooks/useProject";

const Settings: React.FC = () => {
    const { data: projects, isLoading } = useProjects();
    const createProject = useCreateProject();
    const deleteProject = useDeleteProject();
    const [newProjectName, setNewProjectName] = useState("");
    const [newApiKey, setNewApiKey] = useState<string | null>(null);

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            const result = await createProject.mutateAsync(newProjectName.trim());
            setNewApiKey(result.api_key);
            setNewProjectName("");
        } catch (err) {
            console.error("Failed to create project:", err);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm("Delete this project and all its data?")) return;
        try {
            await deleteProject.mutateAsync(projectId);
        } catch (err) {
            console.error("Failed to delete project:", err);
        }
    };

    const handleCopyKey = () => {
        if (newApiKey) {
            navigator.clipboard.writeText(newApiKey);
        }
    };

    return (
        <div className="p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-[var(--text-secondary)] mb-8">Manage projects and API keys</p>

            {/* Create Project */}
            <div className="card mb-8">
                <h2 className="text-xl font-semibold mb-4">Create Project</h2>
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="Project name..."
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                        className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-blue)]"
                    />
                    <button
                        onClick={handleCreateProject}
                        disabled={createProject.isPending || !newProjectName.trim()}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {createProject.isPending ? "Creating..." : "Create"}
                    </button>
                </div>

                {/* Show API Key (once) */}
                {newApiKey && (
                    <div className="mt-4 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 rounded-lg p-4 animate-slide-in">
                        <p className="text-sm font-semibold text-[var(--accent-green)] mb-2">
                            ⚠️ Save this API key — it won't be shown again!
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm font-mono bg-[var(--bg-primary)] px-3 py-2 rounded border border-[var(--border-primary)]">
                                {newApiKey}
                            </code>
                            <button onClick={handleCopyKey} className="btn-secondary text-sm px-3 py-2">
                                Copy
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Project List */}
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">Projects</h2>
                {isLoading ? (
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-[var(--bg-tertiary)] rounded"></div>
                        ))}
                    </div>
                ) : projects?.length === 0 ? (
                    <p className="text-[var(--text-secondary)] text-center py-8">
                        No projects yet. Create one above.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {projects?.map((project: any) => (
                            <div
                                key={project.id}
                                className="flex items-center justify-between bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors"
                            >
                                <div>
                                    <p className="font-medium">{project.name}</p>
                                    <p className="text-xs text-[var(--text-tertiary)] font-mono">
                                        {project.id}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-[var(--text-secondary)]">
                                        Created: {new Date(project.created_at).toLocaleDateString()}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteProject(project.id)}
                                        className="text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 px-3 py-1 rounded text-sm transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
