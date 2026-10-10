import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  MessageSquare,
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

  // Selected Complaint for Action Modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Status Update Form State
  const [newStatus, setNewStatus] = useState<ComplaintStatus>("IN_PROGRESS");
  const [statusNotes, setStatusNotes] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Officer Note Form State
  const [noteText, setNoteText] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);
  const [noteSubmitting, setNoteSubmitting] = useState(false);

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
      if (evidenceFile) {
        await api.uploadResolutionEvidence(selectedComplaint.id, evidenceFile);
      }
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
    setNoteSubmitting(true);
    try {
      await api.addOfficerNote(selectedComplaint.id, noteText.trim(), noteInternal);
      setNoteText("");
      const refreshed = await api.getComplaintDetail(selectedComplaint.id);
      setSelectedComplaint(refreshed);
    } catch (err: any) {
      alert(err.message || "Failed to record officer note.");
    } finally {
      setNoteSubmitting(false);
    }
  };

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Operational Officer Header */}
        <div className="bg-white p-6 rounded-md border border-slate-200 shadow-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gov-navy bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 uppercase tracking-wider">
                {user?.department_name || "Assigned Department"}
              </span>
              <span className="text-xs text-slate-500">• Municipal Field Operations</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Department Operations Queue
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Logged in as <strong className="text-slate-800">{user?.full_name}</strong>. Inspect complaints, assign field crews, record notes, and upload verified completion evidence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-2 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
            >
              Refresh Queue
            </button>
          </div>
        </div>

        {/* Real Workload Statistics */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block">
                Total Department Tickets
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {summary.total_tickets || 0}
              </span>
            </div>

            <div className="bg-white p-4 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block">
                Pending / Submitted
              </span>
              <span className="text-2xl font-bold text-blue-700 mt-1 block">
                {summary.pending_tickets || 0}
              </span>
            </div>

            <div className="bg-white p-4 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block">
                Active In Progress
              </span>
              <span className="text-2xl font-bold text-amber-700 mt-1 block">
                {summary.in_progress_tickets || 0}
              </span>
            </div>

            <div className="bg-white p-4 rounded-md border border-slate-200 shadow-subtle">
              <span className="text-slate-500 font-medium uppercase tracking-wider block">
                Resolved by Department
              </span>
              <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                {summary.resolved_tickets || 0}
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-subtle flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search reference, description, address..."
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

          <div className="flex items-center gap-2">
            <label htmlFor="officer-status-select" className="text-xs font-medium text-slate-600 shrink-0">
              Filter Queue:
            </label>
            <select
              id="officer-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="ALL">All Department Tickets</option>
              <option value="SUBMITTED">Newly Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ASSIGNED">Assigned to Crew</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Operational Case Table */}
        <div className="bg-white rounded-md border border-slate-200 shadow-panel overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Retrieving operational tickets...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center max-w-md mx-auto space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
              <h2 className="text-sm font-bold text-slate-800">Queue is Clear</h2>
              <p className="text-xs text-slate-500">
                No active complaints match the selected filter in your department's jurisdiction.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Date Logged</th>
                    <th scope="col">Issue Title</th>
                    <th scope="col">Category</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col">Assigned Officer</th>
                    <th scope="col" className="text-right">Actions</th>
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
                      <td className="text-xs font-bold uppercase text-slate-700 whitespace-nowrap">
                        {c.priority}
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="text-xs text-slate-600 whitespace-nowrap">
                        {c.assigned_officer_name || "Unassigned"}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedComplaint(c);
                            setNewStatus(c.status);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                        >
                          Manage Case
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Structured Officer Action Modal */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-case-title"
        >
          <div className="bg-white rounded-md border border-slate-200 shadow-modal max-w-4xl w-full p-6 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase block">
                  Department Inspection • {selectedComplaint.reference_number}
                </span>
                <h3 id="modal-case-title" className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Case Details & Citizen Evidence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Defect Description & Location
                </span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedComplaint.description}
                </p>
                <div className="text-xs text-slate-600 space-y-0.5 bg-slate-50 p-3 rounded border border-slate-200">
                  <p><strong>Address:</strong> {selectedComplaint.address || "Not specified"}</p>
                  {selectedComplaint.landmark && <p><strong>Landmark:</strong> {selectedComplaint.landmark}</p>}
                  {selectedComplaint.latitude && selectedComplaint.longitude && (
                    <p className="font-mono text-[11px] text-slate-500">
                      GPS: {selectedComplaint.latitude.toFixed(5)}, {selectedComplaint.longitude.toFixed(5)}
                    </p>
                  )}
                  <p className="pt-1 text-slate-500">
                    Complainant: <strong>{selectedComplaint.citizen_name || "Citizen"}</strong> ({selectedComplaint.citizen_email || "Email verified"})
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Citizen Uploaded Image
                </span>
                {selectedComplaint.attachments?.find((a) => !a.is_resolution_evidence)?.access_url ? (
                  <img
                    src={selectedComplaint.attachments.find((a) => !a.is_resolution_evidence)!.access_url}
                    alt="Citizen defect submission"
                    className="w-full max-h-56 object-contain rounded border border-slate-300 bg-slate-900"
                  />
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded border border-slate-200">
                    No image available
                  </div>
                )}
              </div>
            </div>

            {/* Form 1: Status Progression & Resolution Evidence */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-2">
                Update Ticket Lifecycle Status
              </span>

              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="update-status" className="block text-xs font-semibold text-slate-800 mb-1">
                      New Operational Status
                    </label>
                    <select
                      id="update-status"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                      className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-700"
                    >
                      <option value="ASSIGNED">ASSIGNED (Dispatch Field Crew)</option>
                      <option value="IN_PROGRESS">IN_PROGRESS (Under Active Repair)</option>
                      <option value="RESOLVED">RESOLVED (Repairs Completed)</option>
                      <option value="CLOSED">CLOSED (Final Administrative Sign-off)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="evidence-file" className="block text-xs font-semibold text-slate-800 mb-1">
                      Completion Photo Evidence (Optional)
                    </label>
                    <input
                      id="evidence-file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="status-notes" className="block text-xs font-semibold text-slate-800 mb-1">
                    Status Transition Notes (Visible to Complainant)
                  </label>
                  <textarea
                    id="status-notes"
                    rows={2}
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="e.g. Asphalt crew completed patch repair. Road re-opened for traffic."
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold disabled:opacity-50"
                  >
                    {actionLoading ? "Saving Status..." : "Apply Status Update"}
                  </button>
                </div>
              </form>
            </div>

            {/* Form 2: Internal Investigation Note */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-2">
                Add Officer Investigation Note
              </span>

              <form onSubmit={handleAddNote} className="space-y-3">
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record internal findings, material requisitions, or field updates..."
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-700"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noteInternal}
                      onChange={(e) => setNoteInternal(e.target.checked)}
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                    />
                    <span>Mark as Internal Note (hidden from citizen tracking)</span>
                  </label>

                  <button
                    type="submit"
                    disabled={noteSubmitting || !noteText.trim()}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold disabled:opacity-50"
                  >
                    {noteSubmitting ? "Saving..." : "Record Note"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
