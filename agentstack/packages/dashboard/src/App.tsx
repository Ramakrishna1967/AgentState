// Copyright 2026 AgentStack Contributors
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
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
          <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-[var(--border-primary)]">
              <h1 className="text-2xl font-bold text-[var(--accent-blue)]">AgentStack</h1>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">Chrome DevTools for AI Agents</p>
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

// Navigation Link Component
const NavLink: React.FC<{ to: string; icon: string; children: React.ReactNode }> = ({ to, icon, children }) => {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{children}</span>
    </Link>
  );
};


// Login page — shown when JWT expires (401 redirect)
const LoginPage: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
    <div className="bg-[var(--bg-secondary)] p-8 rounded-xl border border-[var(--border-primary)] w-full max-w-sm">
      <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">AgentStack</h1>
      <p className="text-[var(--text-secondary)] mb-6 text-sm">Sign in to your account</p>
      <p className="text-[var(--text-tertiary)] text-xs">
        Use the API to register: <code>POST /api/v1/auth/register</code><br />
        Then login: <code>POST /api/v1/auth/login</code>
      </p>
    </div>
  </div>
);

export default App;
