import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Plus,
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

  useEffect(() => {
    setLoading(true);
    api
      .getMyComplaints()
      .then(setComplaints)
      .catch((err) => setError(err.message || "Failed to load complaints"))
      .finally(() => setLoading(false));
  }, []);

  const totalCount = complaints.length;
  const inProgressCount = complaints.filter((c) =>
    ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS"].includes(c.status)
  ).length;
  const resolvedCount = complaints.filter((c) =>
    ["RESOLVED", "CLOSED"].includes(c.status)
  ).length;

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reference_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Citizen Portal • {user?.full_name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your registered civic tickets, track field repairs, and submit new reports.
            </p>
          </div>
          <Link
            to="/report"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Report New Issue</span>
          </Link>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Submitted
              </span>
              <span className="text-3xl font-black text-slate-900 mt-1 block">
                {totalCount}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Active / In Progress
              </span>
              <span className="text-3xl font-black text-amber-600 mt-1 block">
                {inProgressCount}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Resolved Issues
              </span>
              <span className="text-3xl font-black text-emerald-600 mt-1 block">
                {resolvedCount}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Complaints List Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by title or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {["ALL", "SUBMITTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    statusFilter === status
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status === "ALL" ? "All Cases" : status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Table / List */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading complaints...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-600">{error}</div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Complaints Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have not registered any civic complaints matching this filter.
              </p>
              <Link
                to="/report"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit a Complaint</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredComplaints.map((c) => (
                <div
                  key={c.id}
                  className="p-4 sm:p-6 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                        {c.reference_number}
                      </span>
                      <StatusBadge status={c.status} />
                      <CategoryBadge category={c.category} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">
                      {c.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Department: {c.department_name || "Review Queue"}</span>
                      <span>•</span>
                      <span>Submitted: {new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Link
                    to={`/complaints/${c.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
                  >
                    <span>View Timeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
