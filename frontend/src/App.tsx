import React, { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Footer } from "./components/common/Footer";
import { Navbar } from "./components/common/Navbar";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AIReviewQueuePage } from "./pages/admin/AIReviewQueuePage";
import { CitizenDashboard } from "./pages/citizen/CitizenDashboard";
import { ComplaintDetailPage } from "./pages/citizen/ComplaintDetailPage";
import { NewComplaintPage } from "./pages/citizen/NewComplaintPage";
import { DepartmentWorkspace } from "./pages/officer/DepartmentWorkspace";
import { LandingPage } from "./pages/public/LandingPage";
import { LoginPage } from "./pages/public/LoginPage";
import { RegisterPage } from "./pages/public/RegisterPage";
import { TrackComplaintPage } from "./pages/public/TrackComplaintPage";
import { useAuthStore } from "./store/authStore";

export function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/track" element={<TrackComplaintPage />} />
            <Route path="/report" element={<NewComplaintPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Citizen Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["CITIZEN"]}>
                  <CitizenDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/complaints/:id"
              element={
                <ProtectedRoute>
                  <ComplaintDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Department Officer Routes */}
            <Route
              path="/workspace"
              element={
                <ProtectedRoute allowedRoles={["OFFICER"]}>
                  <DepartmentWorkspace />
                </ProtectedRoute>
              }
            />

            {/* Administrator Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai-review"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AIReviewQueuePage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
