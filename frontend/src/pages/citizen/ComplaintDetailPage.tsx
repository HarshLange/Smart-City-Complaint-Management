import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Cpu,
  FileText,
  MapPin,
  RotateCcw,
  Shield,
  User,
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500">Loading complaint details...</span>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-lg mx-auto bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Complaint Not Found</h2>
          <p className="text-xs text-slate-600">{error || "Unable to retrieve complaint."}</p>
          <Link
            to="/dashboard"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
          >
            Return to Dashboard
          </Link>
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
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            {canReopen && (
              <button
                onClick={() => setReopenOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Request Reopening</span>
              </button>
            )}
          </div>
        </div>

        {/* Complaint Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                {complaint.reference_number}
              </span>
              <StatusBadge status={complaint.status} />
              <CategoryBadge category={complaint.category} />
            </div>
            <div className="text-xs text-slate-400">
              Reported: {new Date(complaint.created_at).toLocaleString()}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {complaint.title}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {complaint.description}
          </p>

          {/* Department and Assignment Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block mb-0.5">Assigned Department</span>
              <strong className="text-slate-800 text-sm">
                {complaint.department_name || "Review Queue"}
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block mb-0.5">Assigned Officer</span>
              <strong className="text-slate-800 text-sm">
                {complaint.assigned_officer_name || "Awaiting Crew Assignment"}
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block mb-0.5">Citizen Identity</span>
              <span className="text-slate-800 font-medium">
                {complaint.citizen_name || "Anonymous Citizen"}
              </span>
            </div>
          </div>
        </div>

        {/* Media & Location Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Issue Photograph */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Original Defect Photograph</span>
            </h2>
            {primaryAttachment ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-72">
                <img
                  src={primaryAttachment.access_url}
                  alt="Defect"
                  className="w-full h-auto max-h-72 object-contain"
                />
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No defect photograph on file.
              </div>
            )}
          </div>

          {/* Location & GPS Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Location Coordinates</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Street Address</span>
                <p className="text-slate-800 font-medium text-sm">
                  {complaint.address || "Street address not provided"}
                </p>
                {complaint.landmark && (
                  <p className="text-slate-500 text-xs">Landmark: {complaint.landmark}</p>
                )}
              </div>

              {complaint.latitude && complaint.longitude && (
                <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl space-y-1 text-blue-900">
                  <span className="font-semibold block uppercase">GPS Geolocation</span>
                  <div className="font-mono text-xs">
                    Lat: {complaint.latitude.toFixed(6)}, Lon: {complaint.longitude.toFixed(6)}
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${complaint.latitude},${complaint.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-1 font-bold text-blue-700 underline text-xs"
                  >
                    Open in External Maps ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Prediction Breakdown Card */}
        {complaint.ai_prediction && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  AI Deep Learning Vision Model Inspection
                </h2>
              </div>
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                {complaint.ai_prediction.model_name} • {complaint.ai_prediction.model_version}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Predicted Class</span>
                <strong className="text-slate-900 text-sm capitalize">
                  {complaint.ai_prediction.predicted_category.replace("_", " ")}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Model Confidence</span>
                <strong className="text-indigo-600 text-sm">
                  {(complaint.ai_prediction.confidence_score * 100).toFixed(1)}%
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Processing Status</span>
                <span className="font-semibold text-slate-800">
                  {complaint.ai_prediction.processing_status}
                </span>
              </div>
            </div>

            {/* Probability Distribution */}
            {complaint.ai_prediction.all_probabilities && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Full Neural Softmax Probability Distribution
                </h3>
                <div className="space-y-1.5">
                  {Object.entries(complaint.ai_prediction.all_probabilities).map(([cat, prob]) => (
                    <div key={cat} className="space-y-0.5">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span className="capitalize">{cat.replace("_", " ")}</span>
                        <span className="font-mono">{((prob as number) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${(prob as number) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {complaint.ai_prediction.is_overridden && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-0.5">
                <strong className="font-bold">Human Administrator Override Applied</strong>
                <p>Reason: {complaint.ai_prediction.override_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Resolution Evidence Card (if resolved) */}
        {complaint.status === "RESOLVED" && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-6 h-6" />
              <h2 className="text-lg font-bold">Field Repair Completed & Resolved</h2>
            </div>

            <div className="text-xs text-emerald-900 space-y-1">
              <span className="font-semibold block uppercase">Officer Resolution Notes:</span>
              <p className="bg-white p-3 rounded-xl border border-emerald-200 text-slate-800 leading-relaxed">
                {complaint.resolution_notes || "Repair completed per municipal specifications."}
              </p>
            </div>

            {evidenceAttachment && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-emerald-900 block">
                  Field Resolution Photo Proof:
                </span>
                <div className="rounded-xl overflow-hidden border border-emerald-200 max-h-72 bg-white flex items-center justify-center">
                  <img
                    src={evidenceAttachment.access_url}
                    alt="Resolution Evidence"
                    className="w-full h-auto max-h-72 object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progression Timeline */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Lifecycle History & Department Actions
          </h2>
          <Timeline history={complaint.status_history} />
        </div>

        {/* Reopen Modal */}
        {reopenOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Request Case Reopening</h3>
              <p className="text-xs text-slate-600">
                If the defect was not adequately resolved, explain the remaining issue for department re-evaluation:
              </p>
              <form onSubmit={handleReopen} className="space-y-4">
                <textarea
                  rows={4}
                  required
                  placeholder="Detail why the issue remains unresolved..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={reopening}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                  >
                    {reopening ? "Submitting..." : "Submit Reopening Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReopenOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
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
