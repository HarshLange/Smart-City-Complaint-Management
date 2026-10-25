import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { UserRole } from "../../types";

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<Props> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    // Admin always has access to all portals
    if (user.role !== "ADMIN" && !allowedRoles.includes(user.role)) {
      const getAppropriateWorkspaceUrl = () => {
        if (user.role === "OFFICER") return "/workspace";
        if (user.role === "ADMIN") return "/admin";
        return "/dashboard";
      };

      const getAppropriateWorkspaceLabel = () => {
        if (user.role === "OFFICER") return "Go to Officer Workspace";
        if (user.role === "ADMIN") return "Go to Admin Console";
        return "Go to Citizen Dashboard";
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full bg-white p-6 rounded-md border border-slate-200 shadow-modal text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Your account role (<strong className="text-slate-800">{user.role}</strong>) does not have permission to access this specific portal section.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <Link
                to={getAppropriateWorkspaceUrl()}
                className="w-full sm:w-auto px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-subtle transition"
              >
                {getAppropriateWorkspaceLabel()}
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-200 transition"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
