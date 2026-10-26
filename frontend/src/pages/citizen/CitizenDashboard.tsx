import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { api } from "../../api/client";
import { CategoryBadge } from "../../components/common/CategoryBadge";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import { Complaint, ComplaintStatus } from "../../types";

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadComplaints = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getMyComplaints()
      .then((data) => {
        setComplaints(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load complaints");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const totalCount = complaints.length;
  const inProgressCount = complaints.filter((c) =>
    ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "REOPENED"].includes(c.status)
  ).length;
  const resolvedCount = complaints.filter((c) =>
    ["RESOLVED", "CLOSED"].includes(c.status)
  ).length;

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 py-5 sm:py-8 px-3 sm:px-6 lg:px-8 pb-20 lg:pb-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Service Header & Primary Action Banner */}
        <div className="bg-white p-4 sm:p-6 rounded-md border border-slate-200 shadow-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-blue-700 uppercase tracking-wider block">
              Citizen Portal
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Welcome, {user?.full_name || "Citizen"}
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Track the progress of civic issues reported in your neighborhood and review updates from municipal departments.
            </p>
          </div>
          <Link
            to="/report"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 transition shadow-subtle shrink-0 touch-manipulation w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Report a Civic Issue</span>
          </Link>
        </div>

        {/* Compact Status Counts (3-column responsive banner for thumb ergonomics) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-md border border-slate-200 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Total
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 block">
                {error && !loading ? "—" : loading ? "..." : totalCount}
              </span>
            </div>
            <div className="hidden sm:flex w-9 h-9 rounded bg-slate-100 text-slate-700 items-center justify-center border border-slate-200">
              <FileText className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-md border border-slate-200 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Active
              </span>
              <span className="text-xl sm:text-2xl font-bold text-amber-700 mt-0.5 block">
                {error && !loading ? "—" : loading ? "..." : inProgressCount}
              </span>
            </div>
            <div className="hidden sm:flex w-9 h-9 rounded bg-amber-50 text-amber-700 items-center justify-center border border-amber-200">
              <Clock className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-md border border-slate-200 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Resolved
              </span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5 block">
                {error && !loading ? "—" : loading ? "..." : resolvedCount}
              </span>
            </div>
            <div className="hidden sm:flex w-9 h-9 rounded bg-emerald-50 text-emerald-700 items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Error Alert with Retry Action */}
        {error && (
          <div
            role="alert"
            className="p-3.5 sm:p-4 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-red-900">Backend Communication Issue</p>
                <p className="mt-0.5 text-red-700">{error}</p>
              </div>
            </div>
            <button
              onClick={loadComplaints}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-red-800 bg-red-100 hover:bg-red-200 active:bg-red-300 transition shrink-0 touch-manipulation disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-md border border-slate-200 shadow-subtle flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              placeholder="Filter by reference, title, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-md border border-slate-300 text-xs sm:text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white touch-manipulation"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="status-select" className="text-xs font-medium text-slate-600 shrink-0 hidden sm:block">
              Status:
            </label>
            <select
              id="status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-[44px] px-3 py-2 rounded-md border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 w-full sm:w-auto touch-manipulation"
            >
              <option value="ALL">All Statuses ({error && !loading ? "—" : totalCount})</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
            </select>
          </div>
        </div>

        {/* Complaints List Table / Cards */}
        <div className="bg-white rounded-md border border-slate-200 shadow-panel overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading your complaint records...</p>
            </div>
          ) : error ? (
            <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                <AlertCircle className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Unable to Load Complaint Records</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {error}
              </p>
              <button
                onClick={loadComplaints}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 transition touch-manipulation shadow-subtle"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                <FileText className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">No Complaints Found</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {searchQuery || statusFilter !== "ALL"
                  ? "No complaints match your active filter criteria. Try resetting your search or status selection."
                  : "You haven't submitted any complaints yet. Report an issue in your area to get started."}
              </p>
              {!searchQuery && statusFilter === "ALL" && (
                <Link
                  to="/report"
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 transition touch-manipulation shadow-subtle"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Report an Issue</span>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Operational Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Issue Title</th>
                      <th scope="col">Category</th>
                      <th scope="col">Department</th>
                      <th scope="col">Date Submitted</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredComplaints.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                          {c.reference_number}
                        </td>
                        <td className="max-w-xs truncate font-medium text-slate-900">
                          {c.title}
                        </td>
                        <td>
                          <CategoryBadge category={c.category} />
                        </td>
                        <td className="text-xs text-slate-600 whitespace-nowrap">
                          {c.department_name || "Assigned to Review"}
                        </td>
                        <td className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <Link
                            to={`/complaints/${c.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline min-h-[36px] px-2 py-1"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Touch-Friendly Card List View */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredComplaints.map((c) => (
                  <div key={c.id} className="p-4 space-y-2.5 bg-white hover:bg-slate-50/50 transition">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {c.reference_number}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>

                    <h2 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                      {c.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <CategoryBadge category={c.category} />
                      <span>•</span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      {c.department_name && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[140px] text-slate-600 font-medium">
                            {c.department_name}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="pt-2">
                      <Link
                        to={`/complaints/${c.id}`}
                        className="w-full min-h-[44px] py-2 px-3 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-xs font-semibold text-blue-700 flex items-center justify-center gap-1.5 touch-manipulation transition shadow-xs"
                      >
                        <span>Inspect Complaint Details</span>
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
