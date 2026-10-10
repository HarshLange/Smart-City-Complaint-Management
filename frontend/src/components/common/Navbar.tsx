import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  LogOut,
  Menu,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { NotificationItem } from "../../types";
import { OfficialBanner } from "./OfficialBanner";

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

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

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
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <OfficialBanner />
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand / Logo */}
            <Link
              to="/"
              className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded p-1"
              aria-label="CivicPulse - Home"
            >
              <div className="w-9 h-9 rounded bg-gov-navy text-white flex items-center justify-center shrink-0 border border-slate-700">
                <Building2 className="w-5 h-5 text-blue-200" aria-hidden="true" />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight">
                  CivicPulse
                </span>
                <span className="text-[11px] text-slate-600 block leading-none font-medium">
                  Municipal Issue Resolution
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              <Link
                to="/"
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  location.pathname === "/"
                    ? "text-blue-700 bg-blue-50/80 font-semibold border-b-2 border-blue-700"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Overview
              </Link>
              <Link
                to="/report"
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  location.pathname === "/report"
                    ? "text-blue-700 bg-blue-50/80 font-semibold border-b-2 border-blue-700"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Report an Issue
              </Link>
              <Link
                to="/track"
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  location.pathname === "/track"
                    ? "text-blue-700 bg-blue-50/80 font-semibold border-b-2 border-blue-700"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Track a Complaint
              </Link>

              {/* Authenticated Workspace Links */}
              {isAuthenticated && user?.role === "CITIZEN" && (
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded text-sm font-medium transition ${
                    location.pathname === "/dashboard"
                      ? "text-blue-700 bg-blue-50/80 font-semibold border-b-2 border-blue-700"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  My Complaints
                </Link>
              )}

              {isAuthenticated && user?.role === "OFFICER" && (
                <Link
                  to="/workspace"
                  className={`px-3 py-2 rounded text-sm font-medium transition ${
                    location.pathname.startsWith("/workspace")
                      ? "text-blue-700 bg-blue-50/80 font-semibold border-b-2 border-blue-700"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Department Queue
                </Link>
              )}

              {isAuthenticated && user?.role === "ADMIN" && (
                <>
                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded text-sm font-medium transition ${
                      location.pathname === "/admin"
                        ? "text-blue-700 bg-blue-50/80 font-semibold border-b-2 border-blue-700"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    Admin Console
                  </Link>
                  <Link
                    to="/admin/ai-review"
                    className={`px-3 py-2 rounded text-sm font-medium transition ${
                      location.pathname === "/admin/ai-review"
                        ? "text-blue-700 bg-blue-50/80 font-semibold border-b-2 border-blue-700"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    AI Review Queue
                  </Link>
                </>
              )}
            </nav>

            {/* Desktop Action Area */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated && user ? (
                <>
                  {/* Notifications Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNotifOpen(!notifOpen)}
                      className="p-2 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition"
                      aria-label={`Notifications, ${unreadCount} unread`}
                      aria-expanded={notifOpen}
                    >
                      <Bell className="w-5 h-5" aria-hidden="true" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-700 rounded-full ring-2 ring-white" />
                      )}
                    </button>

                    {notifOpen && (
                      <div
                        className="absolute right-0 mt-2 w-80 bg-white rounded border border-slate-200 shadow-modal py-2 z-50 animate-in fade-in duration-100"
                        role="dialog"
                        aria-label="Notification center"
                      >
                        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Notifications ({unreadCount} unread)
                          </span>
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={markAllRead}
                              className="text-xs text-blue-700 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Check className="w-3 h-3" /> Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">
                              No recent notifications
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                className={`p-3 text-xs transition ${
                                  n.is_read ? "bg-white text-slate-600" : "bg-blue-50/60 text-slate-900 font-medium"
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

                  {/* Authenticated User Identity */}
                  <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-900 block leading-tight">
                        {user.full_name}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        {user.role} {user.department_name ? `• ${user.department_name}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                      title="Sign Out"
                      aria-label="Sign out of account"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3 py-1.5 rounded text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3.5 py-1.5 rounded text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition shadow-subtle"
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded text-slate-700 hover:bg-slate-100 border border-slate-200"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1 shadow-panel">
            <Link
              to="/"
              className="block px-3 py-2 rounded text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Overview
            </Link>
            <Link
              to="/report"
              className="block px-3 py-2 rounded text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Report an Issue
            </Link>
            <Link
              to="/track"
              className="block px-3 py-2 rounded text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Track a Complaint
            </Link>

            {isAuthenticated ? (
              <>
                {user?.role === "CITIZEN" && (
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 rounded text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    My Complaints
                  </Link>
                )}
                {user?.role === "OFFICER" && (
                  <Link
                    to="/workspace"
                    className="block px-3 py-2 rounded text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Department Queue
                  </Link>
                )}
                {user?.role === "ADMIN" && (
                  <>
                    <Link
                      to="/admin"
                      className="block px-3 py-2 rounded text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Admin Console
                    </Link>
                    <Link
                      to="/admin/ai-review"
                      className="block px-3 py-2 rounded text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      AI Review Queue
                    </Link>
                  </>
                )}
                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 text-xs">{user?.full_name}</div>
                    <div className="text-[11px] text-slate-500">{user?.role}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-3 mt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  className="text-center py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-center py-2 text-xs font-semibold text-white bg-blue-700 rounded hover:bg-blue-800"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
};
