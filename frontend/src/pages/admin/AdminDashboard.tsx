import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Sliders,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api } from "../../api/client";
import { CategoryBadge } from "../../components/common/CategoryBadge";
import { StatusBadge } from "../../components/common/StatusBadge";
import {
  AdminAnalytics,
  CivicCategory,
  Complaint,
  ComplaintStatus,
  Department,
  User,
} from "../../types";

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"COMPLAINTS" | "PROVISION" | "AUDIT">("COMPLAINTS");

  // Filtering
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Override Modal State
  const [overrideComplaint, setOverrideComplaint] = useState<Complaint | null>(null);
  const [overrideCat, setOverrideCat] = useState<CivicCategory>("pothole");
  const [overrideDept, setOverrideDept] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Officer Provision Form State
  const [provEmail, setProvEmail] = useState("");
  const [provPassword, setProvPassword] = useState("");
  const [provName, setProvName] = useState("");
  const [provDeptId, setProvDeptId] = useState("");
  const [provLoading, setProvLoading] = useState(false);
  const [provSuccess, setProvSuccess] = useState<string | null>(null);
  const [provError, setProvError] = useState<string | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsData, deptsData, complaintsData, logsData] = await Promise.all([
        api.getAdminAnalytics(),
        api.getDepartments(),
        api.getAllComplaints(
          statusFilter ? (statusFilter as ComplaintStatus) : undefined,
          deptFilter || undefined,
          searchQuery || undefined
        ),
        api.getAuditLogs(30),
      ]);
      setAnalytics(analyticsData);
      setDepartments(deptsData);
      setComplaints(complaintsData);
      setAuditLogs(logsData);
      if (deptsData.length > 0 && !overrideDept) {
        setOverrideDept(deptsData[0].id);
        setProvDeptId(deptsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load administrative console data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, deptFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideComplaint || !overrideReason.trim()) return;
    setOverrideLoading(true);
    try {
      await api.overrideComplaint(
        overrideComplaint.id,
        overrideCat,
        overrideDept,
        overrideReason.trim()
      );
      setOverrideComplaint(null);
      setOverrideReason("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to override category/department.");
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleProvisionOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvLoading(true);
    setProvSuccess(null);
    setProvError(null);
    try {
      const officer = await api.provisionOfficer({
        email: provEmail,
        password: provPassword,
        full_name: provName,
        department_id: provDeptId,
      });
      setProvSuccess(`Officer account created successfully for ${officer.full_name} (${officer.email}).`);
      setProvEmail("");
      setProvPassword("");
      setProvName("");
      await loadData();
    } catch (err: any) {
      setProvError(err.message || "Failed to provision officer.");
    } finally {
      setProvLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                Executive Administration
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Municipal Operations & AI Review Console
            </h1>
            <p className="text-xs text-slate-500">
              System-wide complaint monitoring, department workload balance, AI prediction overrides, and officer provisioning.
            </p>
          </div>

          <Link
            to="/admin/ai-review"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition self-start sm:self-auto"
          >
            <Cpu className="w-4 h-4" />
            <span>AI Review Queue ({analytics?.under_review_count || 0})</span>
          </Link>
        </div>

        {/* Analytics Top Cards */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Tickets
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {analytics.total_complaints}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Under Review
              </span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {analytics.under_review_count}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Assigned
              </span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">
                {analytics.assigned_count}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                In Progress
              </span>
              <span className="text-2xl font-black text-cyan-600 mt-1 block">
                {analytics.in_progress_count}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Resolved
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {analytics.resolved_count}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                AI Overrides
              </span>
              <span className="text-2xl font-black text-purple-600 mt-1 block">
                {analytics.ai_overridden_count}
              </span>
            </div>
          </div>
        )}

        {/* Department Workloads Table */}
        {analytics?.department_workloads && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>Department Workloads & Real-Time Distribution</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Department Name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3 text-center">Total Cases</th>
                    <th className="px-4 py-3 text-center">Pending</th>
                    <th className="px-4 py-3 text-center">In Progress</th>
                    <th className="px-4 py-3 text-center">Resolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.department_workloads.map((w) => (
                    <tr key={w.department_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{w.department_name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{w.department_code}</td>
                      <td className="px-4 py-3 text-center font-bold">{w.total_complaints}</td>
                      <td className="px-4 py-3 text-center text-amber-600 font-semibold">{w.pending_complaints}</td>
                      <td className="px-4 py-3 text-center text-blue-600 font-semibold">{w.in_progress_complaints}</td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-semibold">{w.resolved_complaints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            onClick={() => setActiveTab("COMPLAINTS")}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === "COMPLAINTS"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            All Complaints & Overrides
          </button>
          <button
            onClick={() => setActiveTab("PROVISION")}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === "PROVISION"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Provision Officer Accounts
          </button>
          <button
            onClick={() => setActiveTab("AUDIT")}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === "AUDIT"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Immutable Audit Trail
          </button>
        </div>

        {/* Tab 1: Complaints Management */}
        {activeTab === "COMPLAINTS" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search reference, title, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </form>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="REOPENED">Reopened</option>
                </select>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="p-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Complaints List */}
            {complaints.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No complaints matching filters.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 sm:p-6 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {c.reference_number}
                        </span>
                        <StatusBadge status={c.status} />
                        <CategoryBadge category={c.category} />
                        {c.ai_prediction?.is_overridden && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 font-semibold">
                            Admin Overridden
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Department: <strong className="text-slate-800">{c.department_name || "Awaiting Assignment"}</strong></span>
                        <span>•</span>
                        <span>Confidence: {c.ai_prediction ? `${(c.ai_prediction.confidence_score * 100).toFixed(1)}%` : "N/A"}</span>
                        <span>•</span>
                        <span>Date: {new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setOverrideComplaint(c);
                          setOverrideCat(c.category);
                          if (c.department_id) setOverrideDept(c.department_id);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Override Category / Dept</span>
                      </button>

                      <Link
                        to={`/complaints/${c.id}`}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                      >
                        View Full Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Provision Officer Accounts */}
        {activeTab === "PROVISION" && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Provision Municipal Department Officer</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Authorize departmental officers to process complaints within their specific municipal purview.
              </p>
            </div>

            {provSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                {provSuccess}
              </div>
            )}
            {provError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {provError}
              </div>
            )}

            <form onSubmit={handleProvisionOfficer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Officer Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Officer Michael Vance"
                  value={provName}
                  onChange={(e) => setProvName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="officer.name@smartcity.gov"
                  value={provEmail}
                  onChange={(e) => setProvEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={provPassword}
                  onChange={(e) => setProvPassword(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Municipal Department
                </label>
                <select
                  value={provDeptId}
                  onChange={(e) => setProvDeptId(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={provLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition"
              >
                {provLoading ? "Provisioning..." : "Create Officer Account"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Immutable Audit Trail */}
        {activeTab === "AUDIT" && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span>Immutable System Audit Trail</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action Type</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Actor Email</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {log.action_type}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {log.entity_type}:{log.entity_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {log.actor_email || "System"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Override Modal */}
        {overrideComplaint && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Override AI Classification
                </h3>
                <button
                  onClick={() => setOverrideComplaint(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div>Case: <strong className="text-slate-900">{overrideComplaint.reference_number}</strong></div>
                <div>Title: {overrideComplaint.title}</div>
                <div>Current Category: <strong className="capitalize">{overrideComplaint.category.replace("_", " ")}</strong></div>
              </div>

              <form onSubmit={handleApplyOverride} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Corrected Category
                  </label>
                  <select
                    value={overrideCat}
                    onChange={(e) => setOverrideCat(e.target.value as CivicCategory)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="pothole">Pothole (Road Authority)</option>
                    <option value="damaged_road">Damaged Road Surface (Road Authority)</option>
                    <option value="water_leak">Water Leak (Water Department)</option>
                    <option value="streetlight_failure">Streetlight Failure (Infrastructure)</option>
                    <option value="garbage">Waste & Garbage (Garbage Department)</option>
                    <option value="other">Other / Manual Evaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reassign to Department
                  </label>
                  <select
                    value={overrideDept}
                    onChange={(e) => setOverrideDept(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mandatory Override Reason (Audited)
                  </label>
                  <textarea
                    rows={3}
                    required
                    minLength={5}
                    placeholder="Explain why the prediction was adjusted (e.g. Image shows burst mainline rather than surface pothole)..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={overrideLoading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    {overrideLoading ? "Saving Override..." : "Save Override & Reassign"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideComplaint(null)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
