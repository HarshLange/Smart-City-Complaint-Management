import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  MessageSquare,
  Plus,
  Search,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { api } from "../../api/client";
import { CategoryBadge } from "../../components/common/CategoryBadge";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Timeline } from "../../components/common/Timeline";
import { useAuthStore } from "../../store/authStore";
import { Complaint, ComplaintStatus } from "../../types";

export const DepartmentWorkspace: React.FC = () => {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Complaint for Inspection / Action Modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Status Update Form State
  const [newStatus, setNewStatus] = useState<ComplaintStatus>("IN_PROGRESS");
  const [statusNotes, setStatusNotes] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Officer Note State
  const [noteText, setNoteText] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [queueData, summaryData] = await Promise.all([
        api.getDepartmentQueue(
          statusFilter !== "ALL" ? (statusFilter as ComplaintStatus) : undefined,
          searchQuery || undefined
        ),
        api.getDepartmentSummary(),
      ]);
      setComplaints(queueData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || "Failed to load department workspace data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setActionLoading(true);
    try {
      // 1. If evidence uploaded, save it first
      if (evidenceFile) {
        await api.uploadResolutionEvidence(selectedComplaint.id, evidenceFile);
      }
      // 2. Update status
      const updated = await api.updateComplaintStatus(
        selectedComplaint.id,
        newStatus,
        statusNotes
      );
      setSelectedComplaint(updated);
      setStatusNotes("");
      setEvidenceFile(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update complaint status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !noteText.trim()) return;
    setActionLoading(true);
    try {
      await api.addOfficerNote(selectedComplaint.id, noteText.trim(), noteInternal);
      setNoteText("");
      // Refresh detail
      const refreshed = await api.getComplaintDetail(selectedComplaint.id);
      setSelectedComplaint(refreshed);
    } catch (err: any) {
      alert(err.message || "Failed to add officer note.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Workspace Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                Authorized Department Queue
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {user?.department_name || "Department Workspace"}
            </h1>
            <p className="text-xs text-slate-500">
              Officer: {user?.full_name} ({user?.email}) • Scoped exclusively to your department cases.
            </p>
          </div>
        </div>

        {/* Workload Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Active Assigned
              </span>
              <span className="text-3xl font-black text-blue-600 mt-1 block">
                {summary.total_active}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                In Progress Work
              </span>
              <span className="text-3xl font-black text-amber-600 mt-1 block">
                {summary.counts_by_status?.IN_PROGRESS || 0}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Resolved by Department
              </span>
              <span className="text-3xl font-black text-emerald-600 mt-1 block">
                {summary.total_resolved}
              </span>
            </div>
          </div>
        )}

        {/* Queue Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search reference, title, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </form>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {["ALL", "ASSIGNED", "IN_PROGRESS", "RESOLVED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    statusFilter === status
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status === "ALL" ? "All Queue" : status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Complaints Table */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading department queue...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-600">{error}</div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Queue is Clear</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No complaints are currently pending in this queue for your department.
              </p>
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
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">
                      {c.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Reporter: {c.citizen_name || "Anonymous"}</span>
                      <span>•</span>
                      <span>Address: {c.address || "Territory"}</span>
                      <span>•</span>
                      <span>Received: {new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedComplaint(c);
                      setNewStatus(c.status === "ASSIGNED" ? "IN_PROGRESS" : "RESOLVED");
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0 transition"
                  >
                    Open Action Panel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Panel Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedComplaint.reference_number}
                    </span>
                    <StatusBadge status={selectedComplaint.status} />
                    <CategoryBadge category={selectedComplaint.category} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedComplaint.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description & Photo */}
              <div className="space-y-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 uppercase block mb-1">
                    Description & Location
                  </span>
                  <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedComplaint.description}
                  </p>
                  <div className="mt-2 text-slate-500">
                    Location: {selectedComplaint.address || "Not specified"} • Landmark:{" "}
                    {selectedComplaint.landmark || "None"}
                  </div>
                </div>

                {/* Defect Photograph */}
                {selectedComplaint.attachments?.find((a) => !a.is_resolution_evidence) && (
                  <div>
                    <span className="font-semibold text-slate-700 uppercase block mb-1">
                      Defect Photograph
                    </span>
                    <div className="rounded-xl overflow-hidden border border-slate-200 max-h-60 bg-slate-100 flex items-center justify-center">
                      <img
                        src={selectedComplaint.attachments.find((a) => !a.is_resolution_evidence)?.access_url}
                        alt="Defect"
                        className="max-h-60 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Transition Control Form */}
              <form onSubmit={handleUpdateStatus} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Update Case Status
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="IN_PROGRESS">IN_PROGRESS (Crew Dispatched)</option>
                      <option value="RESOLVED">RESOLVED (Repairs Finished)</option>
                      <option value="UNDER_REVIEW">UNDER_REVIEW (Requires Assessment)</option>
                    </select>
                  </div>

                  {newStatus === "RESOLVED" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Resolution Photo Proof (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                        className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transition / Resolution Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter details about repair actions or field inspection results..."
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    required={newStatus === "RESOLVED"}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition"
                >
                  {actionLoading ? "Updating Status..." : "Apply Status Update"}
                </button>
              </form>

              {/* Add Internal Note */}
              <form onSubmit={handleAddNote} className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Add Internal Officer Note
                </h3>
                <textarea
                  rows={2}
                  placeholder="Private internal note visible only to municipal officers..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !noteText.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
                >
                  Save Internal Note
                </button>
              </form>

              {/* Timeline */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Timeline History
                </h3>
                <Timeline history={selectedComplaint.status_history} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
