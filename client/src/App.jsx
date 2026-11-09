import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, AdminRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Jobs } from './pages/Jobs';
import { JobDetails } from './pages/JobDetails';
import { Applications } from './pages/Applications';
import { PendingActions } from './pages/PendingActions';
import { ResumeManager } from './pages/ResumeManager';
import { AnswerBank } from './pages/AnswerBank';
import { AgentActivity } from './pages/AgentActivity';
import { Reports } from './pages/Reports';
import { AutomationSettings } from './pages/AutomationSettings';
import { ProfileSettings } from './pages/ProfileSettings';
import { AdminDashboard } from './pages/AdminDashboard';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetails />} />
                <Route path="/applications" element={<Applications />} />
                <Route path="/pending-actions" element={<PendingActions />} />
                <Route path="/resume" element={<ResumeManager />} />
                <Route path="/answer-bank" element={<AnswerBank />} />
                <Route path="/activity" element={<AgentActivity />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings/automation" element={<AutomationSettings />} />
                <Route path="/settings/profile" element={<ProfileSettings />} />

                {/* Admin Only Route */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

