import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Edit2,
  FileText,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Sliders,
  UserCheck,
  UserCog,
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
  const [officers, setOfficers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"COMPLAINTS" | "DEPARTMENTS" | "OFFICERS" | "AUDIT">("COMPLAINTS");

  // Filtering
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Officer Provision Form State
  const [provEmail, setProvEmail] = useState("");
  const [provPassword, setProvPassword] = useState("");
  const [provName, setProvName] = useState("");
  const [provDeptId, setProvDeptId] = useState("");
  const [provPhone, setProvPhone] = useState("");
  const [provLoading, setProvLoading] = useState(false);
  const [provSuccess, setProvSuccess] = useState<string | null>(null);
  const [provError, setProvError] = useState<string | null>(null);

  // Department Modals State
  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [newDeptEmail, setNewDeptEmail] = useState("");
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  const [editDept, setEditDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [editDeptDesc, setEditDeptDesc] = useState("");
  const [editDeptEmail, setEditDeptEmail] = useState("");
  const [editDeptActive, setEditDeptActive] = useState(true);

  // Complaint Assignment Modal State
  const [assignComplaint, setAssignComplaint] = useState<Complaint | null>(null);
  const [assignOfficerId, setAssignOfficerId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, deptsData, complaintsData, officersData, logsData] = await Promise.all([
        api.getAdminAnalytics(),
        api.adminGetDepartments(),
        api.getAllComplaints(
          statusFilter ? (statusFilter as ComplaintStatus) : undefined,
          deptFilter || undefined,
          searchQuery || undefined
        ),
        api.listUsers("OFFICER"),
        api.getAuditLogs(40),
      ]);
      setAnalytics(analyticsData);
      setDepartments(deptsData);
      setComplaints(complaintsData);
      setOfficers(officersData);
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

  // Provision Officer Handler
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
        phone_number: provPhone.trim() || undefined,
        department_id: provDeptId,
      });
      setProvSuccess(`Officer account created successfully for ${created.full_name} (${created.email}).`);
      setProvEmail("");
      setProvPassword("");
      setProvName("");
      setProvPhone("");
      await loadData();
    } catch (err: any) {
      setProvError(err.message || "Failed to provision officer account.");
    } finally {
      setProvLoading(false);
    }
  };

  // Create Department Handler
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptCode || !newDeptName || !newDeptEmail) return;
    setDeptSubmitting(true);
    try {
      await api.adminCreateDepartment({
        code: newDeptCode.trim().toUpperCase(),
        name: newDeptName.trim(),
        description: newDeptDesc.trim(),
        contact_email: newDeptEmail.trim(),
      });
      setCreateDeptOpen(false);
      setNewDeptCode("");
      setNewDeptName("");
      setNewDeptDesc("");
      setNewDeptEmail("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create department.");
    } finally {
      setDeptSubmitting(false);
    }
  };

  // Edit Department Handler
  const handleSaveEditDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDept) return;
    setDeptSubmitting(true);
    try {
      await api.adminUpdateDepartment(editDept.id, {
        name: editDeptName.trim(),
        description: editDeptDesc.trim(),
        contact_email: editDeptEmail.trim(),
        is_active: editDeptActive,
      });
      setEditDept(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update department.");
    } finally {
      setDeptSubmitting(false);
    }
  };

  // Toggle Officer Active Status
  const handleToggleOfficerStatus = async (officer: User) => {
    try {
      await api.adminUpdateUser(officer.id, {
        is_active: !officer.is_active,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to change officer status.");
    }
  };

  // Change Officer Department
  const handleChangeOfficerDept = async (officer: User, newDeptId: string) => {
    try {
      await api.adminUpdateUser(officer.id, {
        department_id: newDeptId,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to reassign officer department.");
    }
  };

  // Assign Officer to Complaint
  const handleAssignOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignComplaint || !assignOfficerId) return;
    setAssignLoading(true);
    try {
      await api.assignOfficer(assignComplaint.id, assignOfficerId, assignNotes.trim() || undefined);
      setAssignComplaint(null);
      setAssignOfficerId("");
      setAssignNotes("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to assign officer to complaint.");
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Executive Header Banner */}
        <div className="bg-white p-6 rounded-md border border-slate-200 shadow-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gov-navy bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 uppercase tracking-wider">
                Municipal Administration Console
              </span>
              <span className="text-xs text-slate-500">• City Operations Command</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Civic Operations & Governance
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Manage cross-department queues, inspect AI automated routing, provision officers, and audit system events.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Link
              to="/admin/ai-review"
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3.5 py-2.5 sm:py-2 rounded text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 transition shadow-subtle flex items-center justify-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
              <span>AI Review Queue ({analytics?.under_review_count || 0})</span>
            </Link>
            <button
              type="button"
              onClick={loadData}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3.5 py-2.5 sm:py-2 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition flex items-center justify-center"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Real-time System Statistics */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 text-xs">
            <div className="bg-white p-3 sm:p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block text-[10px] sm:text-xs">Total Reports</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">{analytics.total_complaints}</span>
            </div>
            <div className="bg-white p-3 sm:p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block text-[10px] sm:text-xs">Submitted</span>
              <span className="text-xl sm:text-2xl font-bold text-blue-700 mt-1 block">{analytics.submitted_count}</span>
            </div>
            <div className="bg-white p-3 sm:p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block text-[10px] sm:text-xs">Under Review</span>
              <span className="text-xl sm:text-2xl font-bold text-amber-600 mt-1 block">{analytics.under_review_count}</span>
            </div>
            <div className="bg-white p-3 sm:p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block text-[10px] sm:text-xs">In Progress</span>
              <span className="text-xl sm:text-2xl font-bold text-indigo-700 mt-1 block">{analytics.in_progress_count}</span>
            </div>
            <div className="bg-white p-3 sm:p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block text-[10px] sm:text-xs">Resolved</span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 block">{analytics.resolved_count}</span>
            </div>
            <div className="bg-white p-3 sm:p-3.5 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block text-[10px] sm:text-xs">Active Officers</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">{analytics.total_officers}</span>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Console Navigation Tabs */}
        <div className="border-b border-slate-200 flex gap-1 sm:gap-5 text-xs font-semibold overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setActiveTab("COMPLAINTS")}
            className={`min-h-[44px] px-3.5 py-2.5 shrink-0 transition border-b-2 flex items-center whitespace-nowrap ${
              activeTab === "COMPLAINTS"
                ? "border-blue-700 text-blue-700 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Municipal Complaints ({complaints.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DEPARTMENTS")}
            className={`min-h-[44px] px-3.5 py-2.5 shrink-0 transition border-b-2 flex items-center whitespace-nowrap ${
              activeTab === "DEPARTMENTS"
                ? "border-blue-700 text-blue-700 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Departments & Jurisdictions ({departments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("OFFICERS")}
            className={`min-h-[44px] px-3.5 py-2.5 shrink-0 transition border-b-2 flex items-center whitespace-nowrap ${
              activeTab === "OFFICERS"
                ? "border-blue-700 text-blue-700 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Officer Accounts ({officers.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("AUDIT")}
            className={`min-h-[44px] px-3.5 py-2.5 shrink-0 transition border-b-2 flex items-center whitespace-nowrap ${
              activeTab === "AUDIT"
                ? "border-blue-700 text-blue-700 font-bold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Security & Audit ({auditLogs.length})
          </button>
        </div>

        {/* Tab 1: All Complaints Management */}
        {activeTab === "COMPLAINTS" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-md border border-slate-200 shadow-subtle flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <form onSubmit={handleSearch} className="relative flex-1 max-w-md flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5 pointer-events-none" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search reference, title, address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold text-slate-700 flex items-center justify-center"
                >
                  Filter
                </button>
              </form>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
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
                  className="w-full sm:w-auto px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
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

            {/* Complaints Table / Mobile Cards */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading system complaints...
                </div>
              ) : complaints.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  No complaints match the filter criteria.
                </div>
              ) : (
                <>
                  {/* Mobile Complaints List (< md) */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {complaints.map((c) => (
                      <div key={c.id} className="p-4 space-y-3 bg-white">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-900 block">
                              {c.reference_number}
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge status={c.status} />
                            <CategoryBadge category={c.category} />
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                            {c.title}
                          </h3>
                          <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>🏛️ {c.department_name || "Unassigned"}</span>
                            <span>
                              👤 {c.assigned_officer_name ? (
                                <strong className="text-slate-700">{c.assigned_officer_name}</strong>
                              ) : (
                                <em className="text-slate-400">Unassigned</em>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setAssignComplaint(c);
                              const matching = officers.filter(
                                (o) => o.department_id === c.department_id && o.is_active
                              );
                              setAssignOfficerId(matching[0]?.id || "");
                            }}
                            className="flex-1 min-h-[44px] py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-center transition active:scale-[0.98]"
                          >
                            Assign Officer
                          </button>
                          <Link
                            to={`/complaints/${c.id}`}
                            className="flex-1 min-h-[44px] py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center justify-center transition active:scale-[0.98]"
                          >
                            Inspect Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse gov-table">
                      <thead>
                        <tr>
                          <th scope="col">Reference</th>
                          <th scope="col">Date</th>
                          <th scope="col">Title</th>
                          <th scope="col">Category</th>
                          <th scope="col">Department</th>
                          <th scope="col">Status</th>
                          <th scope="col">Assigned Officer</th>
                          <th scope="col" className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {complaints.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/80 transition text-xs">
                            <td className="font-mono font-semibold text-slate-800 whitespace-nowrap">
                              {c.reference_number}
                            </td>
                            <td className="text-slate-500 whitespace-nowrap">
                              {new Date(c.created_at).toLocaleDateString()}
                            </td>
                            <td className="max-w-xs truncate font-medium text-slate-900">
                              {c.title}
                            </td>
                            <td>
                              <CategoryBadge category={c.category} />
                            </td>
                            <td className="text-slate-600 whitespace-nowrap">
                              {c.department_name || "Unassigned"}
                            </td>
                            <td>
                              <StatusBadge status={c.status} />
                            </td>
                            <td className="text-slate-600 whitespace-nowrap">
                              {c.assigned_officer_name ? (
                                <span className="font-medium text-slate-800">{c.assigned_officer_name}</span>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignComplaint(c);
                                  // Default officer to first matching department officer if available
                                  const matching = officers.filter(
                                    (o) => o.department_id === c.department_id && o.is_active
                                  );
                                  setAssignOfficerId(matching[0]?.id || "");
                                }}
                                className="px-2 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded"
                              >
                                Assign
                              </button>
                              <Link
                                to={`/complaints/${c.id}`}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                              >
                                Inspect
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Departments & Jurisdictions Management */}
        {activeTab === "DEPARTMENTS" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-md border border-slate-200 shadow-subtle">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Municipal Departments & Jurisdictions
                </h2>
                <p className="text-xs text-slate-500">
                  Configure department routing codes, update leadership contacts, and toggle service availability.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateDeptOpen(true)}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3.5 py-2.5 sm:py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded flex items-center justify-center gap-1.5 shadow-subtle transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Department</span>
              </button>
            </div>

            <div className="bg-white rounded-md border border-slate-200 shadow-panel overflow-hidden">
              {/* Mobile Departments List (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {departments.map((dept) => (
                  <div key={dept.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                          {dept.code}
                        </span>
                        <span className="font-semibold text-sm text-slate-900">
                          {dept.name}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          dept.is_active
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {dept.is_active ? "Operational" : "Inactive"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {dept.description}
                    </p>

                    <p className="text-[11px] font-mono text-slate-500">
                      ✉️ {dept.contact_email}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">Officers</span>
                        <span className="font-bold text-slate-900 text-sm">{dept.officer_count ?? 0}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">Open Tickets</span>
                        <span className="font-bold text-blue-700 text-sm">{dept.active_complaints_count ?? 0}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditDept(dept);
                        setEditDeptName(dept.name);
                        setEditDeptDesc(dept.description);
                        setEditDeptEmail(dept.contact_email);
                        setEditDeptActive(dept.is_active);
                      }}
                      className="w-full min-h-[44px] py-2.5 px-4 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center justify-center transition active:scale-[0.98]"
                    >
                      Edit Department Configuration
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Code</th>
                      <th scope="col">Department Name</th>
                      <th scope="col">Description</th>
                      <th scope="col">Contact Email</th>
                      <th scope="col">Active Officers</th>
                      <th scope="col">Open Tickets</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/80 transition text-xs">
                        <td className="font-mono font-bold text-slate-800 whitespace-nowrap">
                          {dept.code}
                        </td>
                        <td className="font-semibold text-slate-900 whitespace-nowrap">
                          {dept.name}
                        </td>
                        <td className="text-slate-600 max-w-xs truncate">
                          {dept.description}
                        </td>
                        <td className="text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {dept.contact_email}
                        </td>
                        <td className="text-slate-800 font-bold whitespace-nowrap">
                          {dept.officer_count ?? 0}
                        </td>
                        <td className="text-blue-700 font-bold whitespace-nowrap">
                          {dept.active_complaints_count ?? 0}
                        </td>
                        <td className="whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              dept.is_active
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {dept.is_active ? "Operational" : "Inactive"}
                          </span>
                        </td>
                        <td className="text-right whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditDept(dept);
                              setEditDeptName(dept.name);
                              setEditDeptDesc(dept.description);
                              setEditDeptEmail(dept.contact_email);
                              setEditDeptActive(dept.is_active);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Officer Accounts Management & Provisioning */}
        {activeTab === "OFFICERS" && (
          <div className="space-y-6">
            {/* Registered Officers Table / Mobile Cards */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel overflow-hidden space-y-3">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Authorized Department Officers
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Municipal personnel with ticket inspection, investigation notes, and status update authority.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto">
                  {officers.length} provisioned officers
                </span>
              </div>

              {/* Mobile Officers List (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {officers.map((officer) => (
                  <div key={officer.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm text-slate-900">
                          {officer.full_name}
                        </h3>
                        <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                          {officer.email}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          officer.is_active
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {officer.is_active ? "Active" : "Deactivated"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 block">
                        Assigned Department:
                      </label>
                      <select
                        value={officer.department_id || ""}
                        onChange={(e) => handleChangeOfficerDept(officer, e.target.value)}
                        className="w-full min-h-[44px] px-3 py-2 rounded border border-slate-300 text-xs bg-white text-slate-800 focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="" disabled>-- Assign Department --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Joined: {new Date(officer.created_at).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleOfficerStatus(officer)}
                        className={`min-h-[44px] px-4 py-2 text-xs font-semibold rounded border transition flex items-center justify-center ${
                          officer.is_active
                            ? "text-red-700 bg-red-50 hover:bg-red-100 border-red-200"
                            : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                        }`}
                      >
                        {officer.is_active ? "Deactivate Account" : "Activate Account"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Officer Name</th>
                      <th scope="col">Official Email</th>
                      <th scope="col">Assigned Department</th>
                      <th scope="col">Account Status</th>
                      <th scope="col">Provisioned Date</th>
                      <th scope="col" className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {officers.map((officer) => (
                      <tr key={officer.id} className="hover:bg-slate-50/80 transition text-xs">
                        <td className="font-semibold text-slate-900 whitespace-nowrap">
                          {officer.full_name}
                        </td>
                        <td className="text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {officer.email}
                        </td>
                        <td className="whitespace-nowrap">
                          <select
                            value={officer.department_id || ""}
                            onChange={(e) => handleChangeOfficerDept(officer, e.target.value)}
                            className="px-2 py-1 rounded border border-slate-300 text-xs bg-white text-slate-800 focus:ring-1 focus:ring-blue-700"
                          >
                            <option value="" disabled>-- Assign Department --</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.code})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              officer.is_active
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {officer.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="text-slate-500 whitespace-nowrap">
                          {new Date(officer.created_at).toLocaleDateString()}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleOfficerStatus(officer)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded border transition ${
                              officer.is_active
                                ? "text-red-700 bg-red-50 hover:bg-red-100 border-red-200"
                                : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                            }`}
                          >
                            {officer.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Provision New Officer Form */}
            <div className="bg-white p-4 sm:p-6 rounded-md border border-slate-200 shadow-panel max-w-2xl space-y-4 sm:space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  <span>Provision New Officer Account</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorized administrators create verified officer credentials scoped strictly to department jurisdiction.
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Officer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={provName}
                      onChange={(e) => setProvName(e.target.value)}
                      placeholder="e.g. Marcus Vance"
                      className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Contact Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={provPhone}
                      onChange={(e) => setProvPhone(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                      className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Official Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={provEmail}
                      onChange={(e) => setProvEmail(e.target.value)}
                      placeholder="marcus.vance@smartcity.gov"
                      className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={provPassword}
                      onChange={(e) => setProvPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Assigned Municipal Department *
                  </label>
                  <select
                    required
                    value={provDeptId}
                    onChange={(e) => setProvDeptId(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-700"
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
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-50 shadow-subtle flex items-center justify-center"
                >
                  {provLoading ? "Provisioning..." : "Provision Officer Account"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 4: Security & System Audit Log */}
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

            {/* Mobile Audit List (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 space-y-1.5 bg-white text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {log.action_type}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-700 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                    <span>Actor: <strong>{log.actor_email || "System"}</strong></span>
                    <span className="font-mono text-slate-500">IP: {log.ip_address || "Internal"}</span>
                  </div>
                  {log.details && (
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 font-mono text-[11px] text-slate-600 break-all">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Action Type</th>
                    <th scope="col">Actor Email</th>
                    <th scope="col">IP Address</th>
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
                        {log.action_type}
                      </td>
                      <td className="text-slate-700 whitespace-nowrap">
                        {log.actor_email || "System"}
                      </td>
                      <td className="font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {log.ip_address || "Internal"}
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

      {/* Modal 1: Register New Department */}
      {createDeptOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-dept-title"
        >
          <div className="bg-white rounded-md border border-slate-200 shadow-modal max-w-lg w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 id="create-dept-title" className="text-base font-bold text-slate-900">
                Register Municipal Department
              </h3>
              <button
                type="button"
                onClick={() => setCreateDeptOpen(false)}
                className="text-slate-400 hover:text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center rounded -mr-2 -mt-2"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Department Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PARKS"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs font-mono uppercase focus:ring-2 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="parks@smartcity.gov"
                    value={newDeptEmail}
                    onChange={(e) => setNewDeptEmail(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parks and Public Recreation Department"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Jurisdiction & Scope Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Municipal maintenance of city parks, public playgrounds, and botanical reserves."
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateDeptOpen(false)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptSubmitting}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded disabled:opacity-50 flex items-center justify-center shadow-subtle"
                >
                  {deptSubmitting ? "Registering..." : "Register Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Department */}
      {editDept && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dept-title"
        >
          <div className="bg-white rounded-md border border-slate-200 shadow-modal max-w-lg w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase">
                  Code: {editDept.code}
                </span>
                <h3 id="edit-dept-title" className="text-base font-bold text-slate-900 mt-0.5">
                  Edit Department Configuration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditDept(null)}
                className="text-slate-400 hover:text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center rounded -mr-2 -mt-2"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  required
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editDeptEmail}
                  onChange={(e) => setEditDeptEmail(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Jurisdiction Scope
                </label>
                <textarea
                  rows={3}
                  required
                  value={editDeptDesc}
                  onChange={(e) => setEditDeptDesc(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1 min-h-[44px] sm:min-h-0">
                <input
                  type="checkbox"
                  id="dept-active-toggle"
                  checked={editDeptActive}
                  onChange={(e) => setEditDeptActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                />
                <label htmlFor="dept-active-toggle" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Department is active for automated AI ticket routing
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditDept(null)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptSubmitting}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded disabled:opacity-50 flex items-center justify-center shadow-subtle"
                >
                  {deptSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Assign Officer to Complaint */}
      {assignComplaint && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-modal-title"
        >
          <div className="bg-white rounded-md border border-slate-200 shadow-modal max-w-lg w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="pr-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase block">
                  {assignComplaint.reference_number} • {assignComplaint.department_name || "Department Review"}
                </span>
                <h3 id="assign-modal-title" className="text-base font-bold text-slate-900 mt-0.5">
                  Assign Officer to Case
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignComplaint(null)}
                className="text-slate-400 hover:text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center rounded -mr-2 -mt-2"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignOfficerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Select Department Officer
                </label>
                <select
                  required
                  value={assignOfficerId}
                  onChange={(e) => setAssignOfficerId(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-700"
                >
                  <option value="" disabled>-- Select Officer --</option>
                  {officers
                    .filter((o) => o.is_active)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.full_name} ({o.department_name || "General"})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Assignment Instructions / Field Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. High priority road hazard. Inspect pothole and dispatch hot-mix patching crew."
                  className="w-full px-3 py-2.5 sm:py-2 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignComplaint(null)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignLoading || !assignOfficerId}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded disabled:opacity-50 flex items-center justify-center shadow-subtle"
                >
                  {assignLoading ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
