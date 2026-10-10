import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  LogOut,
  Menu,
  ShieldAlert,
  User as UserIcon,
  X,
} from "lucide-react";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { NotificationItem } from "../../types";

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      api
        .getNotifications()
        .then(setNotifications)
        .catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-none">
                CivicPulse
              </span>
              <span className="text-[10px] text-blue-600 font-semibold tracking-wider uppercase block mt-0.5">
                Smart City Management
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location.pathname === "/"
                  ? "text-blue-600 bg-blue-50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Overview
            </Link>
            <Link
              to="/track"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location.pathname === "/track"
                  ? "text-blue-600 bg-blue-50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Track Complaint
            </Link>
            <Link
              to="/report"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location.pathname === "/report"
                  ? "text-blue-600 bg-blue-50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Report an Issue
            </Link>

            {/* Role-specific Links */}
            {isAuthenticated && user?.role === "CITIZEN" && (
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname === "/dashboard"
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Citizen Portal
              </Link>
            )}

            {isAuthenticated && user?.role === "OFFICER" && (
              <Link
                to="/workspace"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname.startsWith("/workspace")
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Department Workspace
              </Link>
            )}

            {isAuthenticated && user?.role === "ADMIN" && (
              <>
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    location.pathname === "/admin"
                      ? "text-blue-600 bg-blue-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Admin Console
                </Link>
                <Link
                  to="/admin/ai-review"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    location.pathname === "/admin/ai-review"
                      ? "text-blue-600 bg-blue-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  AI Review Queue
                </Link>
              </>
            )}
          </nav>

          {/* Upper Right Action Section */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition"
                    title="Notifications"
                    aria-label="View notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Notifications ({unreadCount} unread)
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 text-xs transition ${
                                n.is_read ? "bg-white text-slate-600" : "bg-blue-50/50 text-slate-900 font-medium"
                              }`}
                            >
                              <div className="font-semibold text-slate-800">{n.title}</div>
                              <div className="mt-0.5 text-slate-600 leading-relaxed">{n.message}</div>
                              <div className="mt-1 text-[10px] text-slate-400">
                                {new Date(n.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Pill & Sign Out */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-800 block leading-tight">
                      {user.full_name}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      {user.role} {user.department_name ? `• ${user.department_name}` : ""}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Sign Out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Overview
          </Link>
          <Link
            to="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Track Complaint
          </Link>
          <Link
            to="/report"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Report an Issue
          </Link>

          {isAuthenticated ? (
            <>
              {user?.role === "CITIZEN" && (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  Citizen Portal
                </Link>
              )}
              {user?.role === "OFFICER" && (
                <Link
                  to="/workspace"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  Department Workspace
                </Link>
              )}
              {user?.role === "ADMIN" && (
                <>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Admin Console
                  </Link>
                  <Link
                    to="/admin/ai-review"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
                  >
                    AI Review Queue
                  </Link>
                </>
              )}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{user?.full_name}</div>
                  <div className="text-xs text-slate-500">{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm text-rose-600 bg-rose-50 rounded-lg font-medium"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-medium text-white bg-blue-600 rounded-lg"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
