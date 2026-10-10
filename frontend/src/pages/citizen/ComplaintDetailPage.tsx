import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  RotateCcw,
  Shield,
  User,
  X,
} from "lucide-react";
import { api } from "../../api/client";
import { CategoryBadge } from "../../components/common/CategoryBadge";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Timeline } from "../../components/common/Timeline";
import { useAuthStore } from "../../store/authStore";
import { Complaint } from "../../types";

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reopen Modal
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);

  const fetchComplaint = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getComplaintDetail(id);
      setComplaint(data);
    } catch (err: any) {
      setError(err.message || "Failed to load complaint details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reopenReason.trim()) return;
    setReopening(true);
    try {
      await api.reopenComplaint(id, reopenReason.trim());
      setReopenOpen(false);
      setReopenReason("");
      await fetchComplaint();
    } catch (err: any) {
      alert(err.message || "Failed to reopen complaint.");
    } finally {
      setReopening(false);
    }
  };

  if (loading) {
    return (
      <div id="main-content" className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500">Loading complaint record...</span>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div id="main-content" className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white p-6 rounded-md border border-slate-200 text-center space-y-4 shadow-panel">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" aria-hidden="true" />
          <h1 className="text-lg font-bold text-slate-900">Complaint Record Not Found</h1>
          <p className="text-xs text-slate-600">{error || "Unable to retrieve the requested complaint."}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gov-navy text-white rounded text-xs font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const primaryAttachment = complaint.attachments?.find((a) => !a.is_resolution_evidence);
  const evidenceAttachment = complaint.attachments?.find((a) => a.is_resolution_evidence);

  const canReopen =
    (complaint.status === "RESOLVED" || complaint.status === "CLOSED") &&
    (user?.role === "ADMIN" || complaint.user_id === user?.id);

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded border border-slate-200 shadow-subtle transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </button>

          <span className="text-xs font-mono text-slate-500">
            Case ID: {complaint.reference_number}
          </span>
        </div>

        {/* Case Record Header Banner */}
        <div className="bg-white p-6 rounded-md border border-slate-200 shadow-panel space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-slate-700 uppercase">
                  {complaint.reference_number}
                </span>
                <span>•</span>
                <span className="text-xs text-slate-500">
                  Logged {new Date(complaint.created_at).toLocaleString()}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {complaint.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <CategoryBadge category={complaint.category} />
              <StatusBadge status={complaint.status} />
              {canReopen && (
                <button
                  type="button"
                  onClick={() => setReopenOpen(true)}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Request Reopening</span>
                </button>
              )}
            </div>
          </div>

          {/* Operational Metadata Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Responsible Department</span>
              <span className="text-slate-900 font-semibold block mt-0.5">
                {complaint.department_name || "Assigned to Review Queue"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Assigned Officer</span>
              <span className="text-slate-900 font-semibold block mt-0.5">
                {complaint.assigned_officer_name || "Unassigned (Queue Pending)"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Priority Level</span>
              <span className="text-slate-900 font-semibold uppercase block mt-0.5">
                {complaint.priority}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Reporting Citizen</span>
              <span className="text-slate-900 font-semibold block mt-0.5">
                {complaint.citizen_name || "Verified Citizen"}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Operational Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Evidence & Case Details (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Photographic Evidence */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel p-6 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>Citizen Evidence Photograph</span>
                {primaryAttachment?.access_url && (
                  <a
                    href={primaryAttachment.access_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <span>Full Resolution</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                )}
              </h2>

              {primaryAttachment?.access_url ? (
                <div className="overflow-hidden rounded border border-slate-200 bg-slate-900">
                  <img
                    src={primaryAttachment.access_url}
                    alt="Citizen defect evidence"
                    className="w-full max-h-96 object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded border border-slate-200">
                  No preview available for this image attachment.
                </div>
              )}
            </div>

            {/* Description & Location */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                Detailed Case Information
              </h2>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Description of Issue
                </span>
                <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded border border-slate-100 whitespace-pre-wrap">
                  {complaint.description}
                </p>
              </div>

              {(complaint.address || complaint.landmark) && (
                <div className="space-y-1 pt-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    Location & Landmark
                  </span>
                  <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded border border-slate-100 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
                      <span>{complaint.address || "No street address provided"}</span>
                    </div>
                    {complaint.landmark && (
                      <p className="text-slate-500 pl-5">Near landmark: {complaint.landmark}</p>
                    )}
                    {complaint.latitude && complaint.longitude && (
                      <p className="text-slate-400 font-mono text-[11px] pl-5">
                        GPS: {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Resolution Notice & Evidence (When Resolved) */}
            {(complaint.resolution_notes || evidenceAttachment) && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-md p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-900 pb-2 border-b border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  <span>Official Resolution Notice</span>
                </div>

                {complaint.resolution_notes && (
                  <div>
                    <span className="text-xs font-semibold text-emerald-900 block mb-1">
                      Department Field Notes:
                    </span>
                    <p className="text-xs text-emerald-800 leading-relaxed bg-white/80 p-3 rounded border border-emerald-200">
                      {complaint.resolution_notes}
                    </p>
                  </div>
                )}

                {evidenceAttachment?.access_url && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-semibold text-emerald-900 block">
                      Field Crew Completion Photograph:
                    </span>
                    <img
                      src={evidenceAttachment.access_url}
                      alt="Resolution evidence"
                      className="max-h-64 rounded border border-emerald-300 object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Timeline & Notes (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Status Timeline */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel p-6">
              <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4">
                Lifecycle & Progression
              </h2>
              <Timeline history={complaint.status_history} />
            </div>

            {/* Officer Notes (Authorized Access Only) */}
            {complaint.officer_notes && complaint.officer_notes.length > 0 && (
              <div className="bg-white rounded-md border border-slate-200 shadow-panel p-6 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span>Investigation Notes</span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {complaint.officer_notes.length} recorded
                  </span>
                </h2>
                <div className="space-y-2.5">
                  {complaint.officer_notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-3 rounded border text-xs space-y-1 ${
                        note.is_internal
                          ? "bg-amber-50/60 border-amber-200 text-amber-900"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span>{note.officer_name}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="leading-relaxed">{note.note_text}</p>
                      {note.is_internal && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mt-1">
                          [Internal Department Record]
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reopen Request Modal */}
      {reopenOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reopen-title"
        >
          <div className="bg-white rounded-md border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 id="reopen-title" className="text-base font-bold text-slate-900">
                Request Complaint Reopening
              </h3>
              <button
                type="button"
                onClick={() => setReopenOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReopen} className="space-y-4">
              <div>
                <label
                  htmlFor="reopen-reason"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  Reason for Reopening (Required)
                </label>
                <textarea
                  id="reopen-reason"
                  rows={4}
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Explain why the resolution was incomplete or if the defect has recurred..."
                  className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReopenOpen(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reopening || !reopenReason.trim()}
                  className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50"
                >
                  {reopening ? "Submitting..." : "Confirm Reopening"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
