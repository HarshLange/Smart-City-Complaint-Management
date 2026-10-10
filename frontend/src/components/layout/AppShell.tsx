import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  Building2,
  Check,
  ChevronDown,
  Cpu,
  FileCheck2,
  FilePlus,
  FileSearch,
  FileText,
  HelpCircle,
  Home,
  LayoutDashboard,
  Layers,
  Lock,
  LogOut,
  Menu,
  PhoneCall,
  Search,
  Shield,
  ShieldAlert,
  Sliders,
  User,
  UserCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { NotificationItem } from "../../types";
import { OfficialBanner } from "../common/OfficialBanner";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      api
        .getNotifications()
        .then(setNotifications)
        .catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

  // Close drawers and dropdowns on route changes
  useEffect(() => {
    setSidebarOpen(false);
    setNotifOpen(false);
    setProfileDropdownOpen(false);
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

  // Define navigation links based on user role
  const getNavItems = () => {
    if (!user) return [];

    if (user.role === "ADMIN") {
      return [
        {
          label: "Operations Overview",
          path: "/admin",
          icon: LayoutDashboard,
          badge: null,
        },
        {
          label: "AI Review Queue",
          path: "/admin/ai-review",
          icon: Cpu,
          badge: "AI Guard",
        },
        {
          label: "Department Directory",
          path: "/departments",
          icon: Building2,
          badge: null,
        },
        {
          label: "Track Any Ticket",
          path: "/track",
          icon: FileSearch,
          badge: null,
        },
        {
          label: "Reporting Guidelines",
          path: "/guidelines",
          icon: FileText,
          badge: null,
        },
        {
          label: "Help Center",
          path: "/help",
          icon: HelpCircle,
          badge: null,
        },
      ];
    }

    if (user.role === "OFFICER") {
      return [
        {
          label: "Department Queue",
          path: "/workspace",
          icon: LayoutDashboard,
          badge: user.department_name || "Assigned",
        },
        {
          label: "Track a Ticket",
          path: "/track",
          icon: FileSearch,
          badge: null,
        },
        {
          label: "Department Directory",
          path: "/departments",
          icon: Building2,
          badge: null,
        },
        {
          label: "Status Definitions",
          path: "/status-definitions",
          icon: FileCheck2,
          badge: null,
        },
        {
          label: "Field Guidelines",
          path: "/guidelines",
          icon: FileText,
          badge: null,
        },
        {
          label: "Officer Help Center",
          path: "/help",
          icon: HelpCircle,
          badge: null,
        },
      ];
    }

    // Default: CITIZEN
    return [
      {
        label: "My Complaints",
        path: "/dashboard",
        icon: LayoutDashboard,
        badge: null,
      },
      {
        label: "Report Civic Issue",
        path: "/report",
        icon: FilePlus,
        badge: "New",
      },
      {
        label: "Track by PIN",
        path: "/track",
        icon: FileSearch,
        badge: null,
      },
      {
        label: "Department Directory",
        path: "/departments",
        icon: Building2,
        badge: null,
      },
      {
        label: "Reporting Guidelines",
        path: "/guidelines",
        icon: FileText,
        badge: null,
      },
      {
        label: "Help & FAQs",
        path: "/faq",
        icon: HelpCircle,
        badge: null,
      },
      {
        label: "Contact Authorities",
        path: "/contact",
        icon: PhoneCall,
        badge: null,
      },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <OfficialBanner />

      {/* Sticky Government Shell Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-subtle">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile Toggle & Brand */}
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded text-slate-700 hover:bg-slate-100 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={sidebarOpen}
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}

              <Link
                to="/"
                className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded p-1"
                aria-label="CivicPulse - Home"
              >
                <div className="w-9 h-9 rounded bg-gov-navy text-white flex items-center justify-center shrink-0 border border-slate-700">
                  <Building2 className="w-5 h-5 text-blue-200" aria-hidden="true" />
                </div>
                <div>
                  <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight">
                    CivicPulse
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-none font-medium uppercase tracking-wider">
                    Smart City Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Right: Actions, Notifications, Profile */}
            <div className="flex items-center gap-3">
              {isAuthenticated && user ? (
                <>
                  {/* Notification Center Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNotifOpen(!notifOpen)}
                      className="p-2 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition focus:outline-none focus:ring-2 focus:ring-blue-700"
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
                              <Check className="w-3 h-3" /> Mark read
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

                  {/* Profile Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center gap-2 pl-2 pr-1 py-1 rounded text-left hover:bg-slate-50 transition border border-transparent hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700"
                      aria-expanded={profileDropdownOpen}
                      aria-haspopup="true"
                    >
                      <div className="w-7 h-7 rounded-full bg-gov-navy text-white flex items-center justify-center font-bold text-xs uppercase">
                        {user.full_name?.charAt(0) || "U"}
                      </div>
                      <div className="hidden sm:block text-left">
                        <span className="text-xs font-semibold text-slate-900 block leading-tight truncate max-w-[120px]">
                          {user.full_name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block leading-none">
                          {user.role}
                        </span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {profileDropdownOpen && (
                      <div
                        className="absolute right-0 mt-2 w-56 bg-white rounded border border-slate-200 shadow-modal py-1.5 z-50 text-xs"
                        role="menu"
                      >
                        <div className="px-4 py-2 border-b border-slate-100">
                          <p className="font-semibold text-slate-800 truncate">{user.full_name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                            {user.role} {user.department_name ? `• ${user.department_name}` : ""}
                          </span>
                        </div>

                        <div className="py-1">
                          {user.role === "CITIZEN" && (
                            <Link
                              to="/dashboard"
                              className="block px-4 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              role="menuitem"
                            >
                              My Complaints Dashboard
                            </Link>
                          )}
                          {user.role === "OFFICER" && (
                            <Link
                              to="/workspace"
                              className="block px-4 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              role="menuitem"
                            >
                              Officer Operations Queue
                            </Link>
                          )}
                          {user.role === "ADMIN" && (
                            <Link
                              to="/admin"
                              className="block px-4 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              role="menuitem"
                            >
                              Administration Console
                            </Link>
                          )}
                          <Link
                            to="/help"
                            className="block px-4 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            role="menuitem"
                          >
                            Municipal Help Center
                          </Link>
                        </div>

                        <div className="pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-1.5 text-red-700 hover:bg-red-50 flex items-center gap-1.5 font-semibold"
                            role="menuitem"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3 py-1.5 rounded text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 transition shadow-subtle"
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Area: Role Sidebar + Workspace Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Role-Aware Sidebar for Authenticated Users */}
        {isAuthenticated && user && (
          <>
            {/* Desktop Persistent Sidebar */}
            <aside
              className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0"
              aria-label="Workspace Navigation"
            >
              {/* Role Scope Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Active Workspace
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-sm font-bold text-slate-900">
                    {user.role === "ADMIN" && "Administrator"}
                    {user.role === "OFFICER" && (user.department_name || "Department Officer")}
                    {user.role === "CITIZEN" && "Citizen Portal"}
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Role sidebar navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== "/" && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200"
                          : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? "text-blue-700" : "text-slate-500"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Sidebar Footer Support Ribbon */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Shield className="w-3.5 h-3.5 text-blue-700" />
                  <span>Verified Identity Guard</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Cryptographically verified session via Supabase Auth & PostgreSQL.
                </p>
              </div>
            </aside>

            {/* Mobile Slide-over Drawer */}
            {sidebarOpen && (
              <div
                className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex"
                role="dialog"
                aria-modal="true"
                aria-label="Mobile workspace menu"
              >
                <div className="w-72 bg-white h-full flex flex-col shadow-modal">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">CivicPulse Workspace</span>
                      <span className="text-[10px] text-slate-500">{user.role} • {user.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600"
                      aria-label="Close menu"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium ${
                            isActive
                              ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="p-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
