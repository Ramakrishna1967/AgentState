// Copyright 2026 AgentStack Contributors
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useState, useContext } from "react";

interface Project {
    id: string;
    name: string;
}

interface ProjectContextType {
    currentProject: Project | null;
    setCurrentProject: (project: Project) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error("useProject must be used within ProjectProvider");
    }
    return context;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentProject, setCurrentProject] = useState<Project | null>(null);

    return (
        <ProjectContext.Provider value={{ currentProject, setCurrentProject }}>
            {children}
        </ProjectContext.Provider>
    );
};

/**
 * Project Switcher Component
 * Dropdown to switch between projects
 */
export const ProjectSwitcher: React.FC = () => {
    const { currentProject, setCurrentProject } = useProject();
    const [projects] = useState<Project[]>([
        { id: "1", name: "Production" },
        { id: "2", name: "Staging" },
        { id: "3", name: "Development" },
    ]);

    return (
        <div className="project-switcher">
            <select
                value={currentProject?.id || ""}
                onChange={(e) => {
                    const project = projects.find((p) => p.id === e.target.value);
                    if (project) setCurrentProject(project);
                }}
                className="w-full px-3 py-2 bg-black border-2 border-[var(--border-primary)] rounded-none text-[var(--text-primary)] font-mono uppercase tracking-widest cursor-pointer hover:border-[var(--accent-green)] hover:text-[var(--accent-green)] transition-none outline-none appearance-none"
            >
                <option value="" className="bg-black text-[var(--text-primary)]">SELECT_PROJECT</option>
                {projects.map((project) => (
                    <option key={project.id} value={project.id} className="bg-black text-[var(--text-primary)]">
                        {project.name}
                    </option>
                ))}
            </select>
        </div>
    );
};
