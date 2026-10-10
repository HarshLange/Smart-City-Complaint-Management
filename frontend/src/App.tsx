import React, { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Footer } from "./components/common/Footer";
import { Navbar } from "./components/common/Navbar";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

// Admin Pages
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AIReviewQueuePage } from "./pages/admin/AIReviewQueuePage";

// Citizen Pages
import { CitizenDashboard } from "./pages/citizen/CitizenDashboard";
import { ComplaintDetailPage } from "./pages/citizen/ComplaintDetailPage";
import { NewComplaintPage } from "./pages/citizen/NewComplaintPage";

// Officer Pages
import { DepartmentWorkspace } from "./pages/officer/DepartmentWorkspace";

// Public & Information Pages
import { AccessibilityPage } from "./pages/public/AccessibilityPage";
import { AuthCallbackPage } from "./pages/public/AuthCallbackPage";
import { ContactPage } from "./pages/public/ContactPage";
import { DepartmentDirectoryPage } from "./pages/public/DepartmentDirectoryPage";
import { DisclaimerPage } from "./pages/public/DisclaimerPage";
import { FAQPage } from "./pages/public/FAQPage";
import { HelpCenterPage } from "./pages/public/HelpCenterPage";
import { LandingPage } from "./pages/public/LandingPage";
import { LoginPage } from "./pages/public/LoginPage";
import { RegisterPage } from "./pages/public/RegisterPage";
import { ReportingGuidelinesPage } from "./pages/public/ReportingGuidelinesPage";
import { StatusDefinitionsPage } from "./pages/public/StatusDefinitionsPage";
import { TermsPage } from "./pages/public/TermsPage";
import { TrackComplaintPage } from "./pages/public/TrackComplaintPage";
import { PrivacyPolicyPage } from "./pages/public/PrivacyPolicyPage";

import { useAuthStore } from "./store/authStore";

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen bg-slate-50">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

export function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    // Avoid preemptive token check race condition when landing on the OAuth callback route
    if (window.location.pathname.startsWith("/auth/callback")) {
      return;
    }
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public & Informational Routes (Navbar + Content + Public Footer) */}
        <Route
          path="/"
          element={
            <PublicLayout>
              <LandingPage />
            </PublicLayout>
          }
        />
        <Route
          path="/track"
          element={
            <PublicLayout>
              <TrackComplaintPage />
            </PublicLayout>
          }
        />
        <Route
          path="/report"
          element={
            <PublicLayout>
              <NewComplaintPage />
            </PublicLayout>
          }
        />
        <Route
          path="/login"
          element={
            <PublicLayout>
              <LoginPage />
            </PublicLayout>
          }
        />
        <Route
          path="/register"
          element={
            <PublicLayout>
              <RegisterPage />
            </PublicLayout>
          }
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Public Informational & Legal Pages */}
        <Route
          path="/privacy"
          element={
            <PublicLayout>
              <PrivacyPolicyPage />
            </PublicLayout>
          }
        />
        <Route
          path="/terms"
          element={
            <PublicLayout>
              <TermsPage />
            </PublicLayout>
          }
        />
        <Route
          path="/disclaimer"
          element={
            <PublicLayout>
              <DisclaimerPage />
            </PublicLayout>
          }
        />
        <Route
          path="/help"
          element={
            <PublicLayout>
              <HelpCenterPage />
            </PublicLayout>
          }
        />
        <Route
          path="/faq"
          element={
            <PublicLayout>
              <FAQPage />
            </PublicLayout>
          }
        />
        <Route
          path="/guidelines"
          element={
            <PublicLayout>
              <ReportingGuidelinesPage />
            </PublicLayout>
          }
        />
        <Route
          path="/status-definitions"
          element={
            <PublicLayout>
              <StatusDefinitionsPage />
            </PublicLayout>
          }
        />
        <Route
          path="/departments"
          element={
            <PublicLayout>
              <DepartmentDirectoryPage />
            </PublicLayout>
          }
        />
        <Route
          path="/accessibility"
          element={
            <PublicLayout>
              <AccessibilityPage />
            </PublicLayout>
          }
        />
        <Route
          path="/contact"
          element={
            <PublicLayout>
              <ContactPage />
            </PublicLayout>
          }
        />

        {/* Citizen Authenticated Workspace (Role-based AppShell) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["CITIZEN"]}>
              <AppShell>
                <CitizenDashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/complaints/:id"
          element={
            <ProtectedRoute>
              <AppShell>
                <ComplaintDetailPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* Department Officer Authenticated Workspace (Role-based AppShell) */}
        <Route
          path="/workspace"
          element={
            <ProtectedRoute allowedRoles={["OFFICER"]}>
              <AppShell>
                <DepartmentWorkspace />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* Administrator Authenticated Workspace (Role-based AppShell) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AppShell>
                <AdminDashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ai-review"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AppShell>
                <AIReviewQueuePage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* Fallback Catch-All */}
        <Route
          path="*"
          element={
            <PublicLayout>
              <LandingPage />
            </PublicLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
