import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Calendar,
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
      if (deptsData.length > 0 && !provDeptId) {
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

  const handleProvisionOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provEmail || !provPassword || !provName || !provDeptId) return;
    setProvLoading(true);
    setProvSuccess(null);
    setProvError(null);
    try {
      const created = await api.provisionOfficer({
        email: provEmail.trim(),
        password: provPassword,
        full_name: provName.trim(),
        department_id: provDeptId,
      });
      setProvSuccess(`Officer account created successfully for ${created.full_name} (${created.email}).`);
      setProvEmail("");
      setProvPassword("");
      setProvName("");
      await loadData();
    } catch (err: any) {
      setProvError(err.message || "Failed to provision department officer.");
    } finally {
      setProvLoading(false);
    }
  };

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Administrator Console Header */}
        <div className="bg-white p-6 rounded-md border border-slate-200 shadow-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gov-navy bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 uppercase tracking-wider">
                System Oversight & Governance
              </span>
              <span className="text-xs text-slate-500">• Municipal Administrator</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Municipal Administrator Console
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Comprehensive city-wide ticket oversight, department routing management, officer provisioning, and system audit logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/ai-review"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 transition shadow-subtle shrink-0"
            >
              <Cpu className="w-4 h-4" aria-hidden="true" />
              <span>AI Review Queue ({analytics?.under_review_count || 0})</span>
            </Link>
          </div>
        </div>

        {/* Real System Analytics Summary */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block">
                Total City Reports
              </span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                {analytics.total_complaints}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block">
                Active In Progress
              </span>
              <span className="text-xl font-bold text-amber-700 mt-0.5 block">
                {analytics.in_progress_count + analytics.assigned_count}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block">
                Field Resolved
              </span>
              <span className="text-xl font-bold text-emerald-700 mt-0.5 block">
                {analytics.resolved_count + analytics.closed_count}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block">
                AI Overrides Logged
              </span>
              <span className="text-xl font-bold text-indigo-700 mt-0.5 block">
                {analytics.ai_overridden_count}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block">
                Active Officers
              </span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                {analytics.total_officers}
              </span>
            </div>
          </div>
        )}

        {/* Department Workload Distribution */}
        {analytics?.department_workloads && (
          <div className="bg-white p-5 rounded-md border border-slate-200 shadow-panel space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Department Workload Distribution
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {analytics.department_workloads.map((dw) => (
                <div key={dw.department_id} className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900">{dw.department_name}</div>
                  <div className="text-[11px] text-slate-500">Code: {dw.department_code}</div>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/80 text-[11px]">
                    <span>Total: <strong>{dw.total_complaints}</strong></span>
                    <span className="text-amber-700">Active: <strong>{dw.in_progress_complaints}</strong></span>
                    <span className="text-emerald-700">Done: <strong>{dw.resolved_complaints}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Console Navigation Tabs */}
        <div className="border-b border-slate-200 flex gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("COMPLAINTS")}
            className={`pb-2.5 transition border-b-2 ${
              activeTab === "COMPLAINTS"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            All Municipal Complaints ({complaints.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PROVISION")}
            className={`pb-2.5 transition border-b-2 ${
              activeTab === "PROVISION"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Provision Officer Accounts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("AUDIT")}
            className={`pb-2.5 transition border-b-2 ${
              activeTab === "AUDIT"
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Security & System Audit Log ({auditLogs.length})
          </button>
        </div>

        {/* Tab 1: All Complaints Management */}
        {activeTab === "COMPLAINTS" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-md border border-slate-200 shadow-subtle flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <form onSubmit={handleSearch} className="relative flex-1 max-w-md flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search reference, title, address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold text-slate-700"
                >
                  Filter
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  <option value="">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
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

            {/* Complaints Table */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  Loading system complaints...
                </div>
              ) : complaints.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  No complaints match the filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse gov-table">
                    <thead>
                      <tr>
                        <th scope="col">Reference</th>
                        <th scope="col">Date</th>
                        <th scope="col">Title</th>
                        <th scope="col">Category</th>
                        <th scope="col">Department</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {complaints.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                            {c.reference_number}
                          </td>
                          <td className="text-xs text-slate-500 whitespace-nowrap">
                            {new Date(c.created_at).toLocaleDateString()}
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
                          <td>
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="text-right whitespace-nowrap">
                            <Link
                              to={`/complaints/${c.id}`}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                            >
                              Inspect Record
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Provision Officer Accounts */}
        {activeTab === "PROVISION" && (
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-panel max-w-2xl space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Provision Department Officer Account
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized municipal administrators can create officer accounts bound to specific department authorities.
              </p>
            </div>

            {provSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{provSuccess}</span>
              </div>
            )}

            {provError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{provError}</span>
              </div>
            )}

            <form onSubmit={handleProvisionOfficer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Officer Full Name
                </label>
                <input
                  type="text"
                  required
                  value={provName}
                  onChange={(e) => setProvName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  value={provEmail}
                  onChange={(e) => setProvEmail(e.target.value)}
                  placeholder="marcus.vance@smartcity.gov"
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Assigned Municipal Department
                </label>
                <select
                  required
                  value={provDeptId}
                  onChange={(e) => setProvDeptId(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-700"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Initial Temporary Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={provPassword}
                  onChange={(e) => setProvPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <button
                type="submit"
                disabled={provLoading}
                className="px-5 py-2.5 rounded text-xs font-semibold text-white bg-gov-navy hover:bg-slate-800 transition disabled:opacity-50"
              >
                {provLoading ? "Provisioning..." : "Provision Officer Account"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Security & System Audit Log */}
        {activeTab === "AUDIT" && (
          <div className="bg-white rounded-md border border-slate-200 shadow-panel overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Immutable System Audit Trail
              </span>
              <span className="text-[11px] text-slate-500">
                Latest {auditLogs.length} events recorded
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Action Type</th>
                    <th scope="col">Actor Role</th>
                    <th scope="col">Entity ID</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition text-xs">
                      <td className="text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
                          {log.actor_role}
                        </span>
                      </td>
                      <td className="font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {log.entity_id ? log.entity_id.substring(0, 8) + "..." : "System"}
                      </td>
                      <td className="text-slate-600 max-w-md truncate">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
