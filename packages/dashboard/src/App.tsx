// Copyright 2026 AgentStack Contributors
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectProvider } from "./components/ProjectSwitcher";
import { ProjectSwitcher } from "./components/ProjectSwitcher";
import Security from "./pages/Security";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import TraceView from "./pages/TraceView";
import Settings from "./pages/Settings";
import "./styles/globals.css";

/**
 * Root App component with routing and layout
 */
const App: React.FC = () => {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <div className="app-container flex h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-black border-r-4 border-[var(--border-primary)] flex flex-col font-mono z-50">
            {/* Logo */}
            <div className="p-6 border-b-4 border-[var(--border-primary)] bg-black">
              <h1 className="text-3xl font-black tracking-tighter text-[var(--accent-green)] uppercase">AgentStack</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-2 uppercase tracking-widest overflow-hidden text-ellipsis whitespace-nowrap">Chrome_DevTools_for_AI</p>
            </div>

            {/* Project Switcher */}
            <div className="px-4 py-4">
              <ProjectSwitcher />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2">
              <NavLink to="/dashboard" icon="📊">Dashboard</NavLink>
              <NavLink to="/traces" icon="🔍">Traces</NavLink>
              <NavLink to="/security" icon="🛡️">Security</NavLink>
              <NavLink to="/analytics" icon="📈">Analytics</NavLink>
              <NavLink to="/settings" icon="⚙️">Settings</NavLink>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-primary)] text-xs text-[var(--text-tertiary)]">
              v0.1.0-alpha
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/traces" element={<TraceView />} />
              <Route path="/security" element={<Security />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ProjectProvider>
  );
};

import { NavLink as RouterNavLink } from "react-router-dom";

// Navigation Link Component
const NavLink: React.FC<{ to: string; icon: string; children: React.ReactNode }> = ({ to, icon, children }) => {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) => `group flex items-center gap-3 px-4 py-3 border-x-4 transition-all duration-100 relative overflow-hidden ${isActive
        ? "bg-[var(--bg-tertiary)] text-[var(--accent-green)] border-l-[var(--accent-green)] border-r-transparent"
        : "text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] border-transparent"
        }`}
    >
      {({ isActive }) => (
        <>
          <div className={`flex items-center justify-center w-8 h-8 rounded-none transition-transform duration-100 ${isActive ? 'bg-black border border-[var(--accent-green)]' : 'border border-transparent group-hover:border-[var(--text-tertiary)]'}`}>
            <span className="text-lg grayscale group-hover:grayscale-0">{icon}</span>
          </div>
          <span className={`font-mono uppercase tracking-widest text-sm ${isActive ? "font-bold" : "font-medium"}`}>{children}</span>
        </>
      )}
    </RouterNavLink>
  );
};


// Login page — shown when JWT expires (401 redirect)
const LoginPage: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)] font-mono">
    <div className="bg-[var(--bg-secondary)] p-8 border-2 border-[var(--border-primary)] shadow-[var(--shadow-lg)] w-full max-w-sm rounded-none">
      <h1 className="text-2xl font-bold mb-2 text-[var(--text-secondary)] uppercase tracking-widest"><span className="animate-pulse">_</span>AgentStack</h1>
      <p className="text-[var(--text-tertiary)] mb-6 text-sm uppercase">Auth_Required</p>
      <div className="text-[var(--text-primary)] text-xs border border-[var(--border-primary)] p-4 bg-black">
        <span className="text-[var(--accent-green)]">❯</span> Use API to register:<br />
        <code className="block mt-1 mb-3 text-[var(--text-tertiary)]">POST /api/v1/auth/register</code>
        <span className="text-[var(--accent-green)]">❯</span> Then login:<br />
        <code className="block mt-1 text-[var(--text-tertiary)]">POST /api/v1/auth/login</code>
      </div>
    </div>
  </div>
);

export default App;
