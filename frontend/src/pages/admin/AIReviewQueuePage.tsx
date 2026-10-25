import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Eye,
  FileText,
  Layers,
  ShieldAlert,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "../../api/client";
import { CategoryBadge } from "../../components/common/CategoryBadge";
import { SecureEvidenceImage } from "../../components/common/SecureEvidenceImage";
import { StatusBadge } from "../../components/common/StatusBadge";
import { CivicCategory, Complaint, Department } from "../../types";

export const AIReviewQueuePage: React.FC = () => {
  const [queue, setQueue] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Override Modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [overrideCat, setOverrideCat] = useState<CivicCategory>("pothole");
  const [overrideDept, setOverrideDept] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [queueData, deptsData] = await Promise.all([
        api.getAiReviewQueue(),
        api.getDepartments(),
      ]);
      setQueue(queueData);
      setDepartments(deptsData);
      if (deptsData.length > 0 && !overrideDept) {
        setOverrideDept(deptsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load review queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !overrideReason.trim()) return;
    setOverrideLoading(true);
    try {
      await api.overrideComplaint(
        selectedComplaint.id,
        overrideCat,
        overrideDept,
        overrideReason.trim()
      );
      setSelectedComplaint(null);
      setOverrideReason("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to override category/department.");
    } finally {
      setOverrideLoading(false);
    }
  };

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white min-h-[44px] sm:min-h-0 px-3.5 py-2.5 sm:py-1.5 rounded border border-slate-200 shadow-subtle transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Return to Admin Console</span>
          </Link>
        </div>

        {/* Header Notice Card */}
        <div className="bg-white p-4 sm:p-6 rounded-md border border-slate-200 shadow-panel space-y-2">
          <div className="flex items-center gap-2 text-gov-navy">
            <Cpu className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Exception Handling & Quality Control
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            AI Classification Review Queue
          </h1>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            Tickets flagged due to low model confidence (&lt;80%), visual ambiguity, or image preprocessing warnings. Authoritative administrator review ensures proper department assignment without unverified automatic routing.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Queue Table / Mobile Cards */}
        <div className="bg-white rounded-md border border-slate-200 shadow-panel overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Flagged Complaints ({queue.length})
            </span>
            <button
              type="button"
              onClick={loadData}
              className="text-xs text-blue-700 hover:underline font-semibold min-h-[44px] sm:min-h-0 flex items-center"
            >
              Refresh Queue
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Loading review queue items...
            </div>
          ) : queue.length === 0 ? (
            <div className="p-12 text-center max-w-md mx-auto space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" aria-hidden="true" />
              <h2 className="text-sm font-bold text-slate-800">Queue is Clear</h2>
              <p className="text-xs text-slate-500">
                All submitted complaints currently meet model confidence thresholds or have already been reviewed.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Queue List (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {queue.map((c) => {
                  const conf = c.ai_prediction?.confidence_score;
                  const isLowConf = conf !== null && conf !== undefined && conf < 0.8;
                  const isConflict = c.ai_prediction?.all_probabilities?.disagreement_detected ||
                    c.ai_prediction?.all_probabilities?.fusion_details?.mode === "STRONG_DISAGREEMENT";
                  return (
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
                          <CategoryBadge category={c.category} />
                          {isConflict ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Vision ≠ Text Conflict
                            </span>
                          ) : conf !== null && conf !== undefined ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                isLowConf
                                   ? "bg-amber-50 text-amber-800 border-amber-300"
                                   : "bg-emerald-50 text-emerald-800 border-emerald-300"
                              }`}
                            >
                              {(conf * 100).toFixed(1)}% {isLowConf ? "(Low)" : ""}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Manual / N/A</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                          {c.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Suggested Dept: <strong className="text-slate-800">{c.ai_prediction?.suggested_department_code || c.department_code || "UNASSIGNED"}</strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setOverrideCat(c.category);
                        }}
                        className="w-full min-h-[44px] py-2.5 px-4 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded flex items-center justify-center transition active:scale-[0.98]"
                      >
                        Review & Override
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse gov-table">
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Date Logged</th>
                      <th scope="col">Title</th>
                      <th scope="col">Assigned Category</th>
                      <th scope="col">Model Confidence</th>
                      <th scope="col">Trigger Reason</th>
                      <th scope="col">Suggested Dept</th>
                      <th scope="col" className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {queue.map((c) => {
                      const conf = c.ai_prediction?.confidence_score;
                      const isLowConf = conf !== null && conf !== undefined && conf < 0.8;
                      const isConflict = c.ai_prediction?.all_probabilities?.disagreement_detected ||
                        c.ai_prediction?.all_probabilities?.fusion_details?.mode === "STRONG_DISAGREEMENT";
                      return (
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
                          <td>
                            {conf !== null && conf !== undefined ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  isLowConf
                                    ? "bg-amber-50 text-amber-800 border-amber-300"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-300"
                                }`}
                              >
                                {(conf * 100).toFixed(1)}% {isLowConf ? "(Low)" : ""}
                              </span>
                            ) : (
                              <span className="text-slate-400">Manual / N/A</span>
                            )}
                          </td>
                          <td>
                            {isConflict ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                Vision ≠ Text Conflict
                              </span>
                            ) : isLowConf ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                Confidence &lt; 80%
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 whitespace-nowrap">
                                Queued Triage
                              </span>
                            )}
                          </td>
                          <td className="text-slate-700 whitespace-nowrap">
                            {c.ai_prediction?.suggested_department_code || c.department_code || "UNASSIGNED"}
                          </td>
                          <td className="text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedComplaint(c);
                                setOverrideCat(c.category);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded"
                            >
                              Review & Override
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Override Action Modal */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="override-title"
        >
          <div className="bg-white rounded-md border border-slate-200 shadow-modal max-w-2xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 my-4 sm:my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="pr-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase block">
                  AI Review Decision • {selectedComplaint.reference_number}
                </span>
                <h3 id="override-title" className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center rounded -mr-2 -mt-2"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Evidence & Prediction Details */}
            {(() => {
              const selPred = selectedComplaint.ai_prediction;
              const selProbs = selPred?.all_probabilities || {};
              const selFusion = selProbs.fusion_details || {};
              const selDisagreement = selProbs.disagreement_detected || selFusion.mode === "STRONG_DISAGREEMENT";
              const primaryAtt = selectedComplaint.attachments?.find((a) => !a.is_resolution_evidence);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-1 font-semibold">Citizen Submitted Image</span>
                      {primaryAtt?.storage_path ? (
                        <div className="rounded border border-slate-300 bg-slate-900 overflow-hidden">
                          <SecureEvidenceImage
                            storagePath={primaryAtt.storage_path}
                            filename={primaryAtt.filename}
                            accessUrl={primaryAtt.access_url}
                            alt="Citizen defect submission"
                            className="w-full max-h-52 object-contain mx-auto"
                          />
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded border border-slate-200">
                          No image available
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded border border-slate-200">
                        <span className="text-slate-500 block font-semibold">Current Fused Category</span>
                        <div className="mt-1 flex items-center gap-2">
                          <CategoryBadge category={selectedComplaint.category} />
                          {selPred?.confidence_score !== undefined && (
                            <span className="font-semibold text-slate-700">
                              ({(selPred.confidence_score * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded border border-slate-200">
                        <span className="text-slate-500 block font-semibold">Citizen Description</span>
                        <p className="mt-1 text-slate-800 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
                          {selectedComplaint.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Multimodal Diagnostics Breakdown */}
                  <div className="bg-slate-50 rounded-md border border-slate-200 p-3.5 space-y-3 text-xs">
                    <span className="font-bold text-slate-900 uppercase tracking-wider block text-[11px]">
                      AI Classification Diagnostics & Conflict Analysis
                    </span>

                    {selDisagreement && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-semibold">Multimodal Conflict Flagged</strong>
                          <span className="text-[11px] leading-relaxed">
                            {selFusion.reason ||
                              `Conflict between visual detection (${selFusion.vision_category || "N/A"}) and textual grievance (${selFusion.nlp_category || "N/A"}). Automatic dispatch held for human verification.`}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white p-2.5 rounded border border-slate-200 space-y-1">
                        <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px]">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Vision Model (ResNet18+BiLSTM+Attention)</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-800 pt-0.5">
                          <span>Detected: <strong>{selFusion.vision_category || selectedComplaint.category}</strong></span>
                          <span className="font-mono text-slate-600">
                            {selFusion.vision_confidence !== undefined
                              ? `${(selFusion.vision_confidence * 100).toFixed(1)}%`
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-slate-200 space-y-1">
                        <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-[11px]">
                          <FileText className="w-3.5 h-3.5" />
                          <span>NLP Model (TF-IDF+LogisticRegression)</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-800 pt-0.5">
                          <span>Detected: <strong>{selFusion.nlp_category || "N/A"}</strong></span>
                          <span className="font-mono text-slate-600">
                            {selFusion.nlp_confidence !== undefined
                              ? `${(selFusion.nlp_confidence * 100).toFixed(1)}%`
                              : "N/A"}
                          </span>
                        </div>
                        {selFusion.matched_terms && selFusion.matched_terms.length > 0 && (
                          <div className="text-[10px] text-slate-500 pt-1">
                            Keywords: {selFusion.matched_terms.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Override Form */}
            <form onSubmit={handleApplyOverride} className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="new-cat" className="block text-xs font-semibold text-slate-800 mb-1">
                    Correct Civic Category
                  </label>
                  <select
                    id="new-cat"
                    value={overrideCat}
                    onChange={(e) => setOverrideCat(e.target.value as CivicCategory)}
                    className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-700"
                  >
                    <option value="pothole">Pothole (Road Authority)</option>
                    <option value="damaged_road">Damaged Road (Road Authority)</option>
                    <option value="water_leak">Water Leak (Water Department)</option>
                    <option value="streetlight_failure">Streetlight Failure (Infrastructure)</option>
                    <option value="garbage">Garbage & Waste (Sanitation)</option>
                    <option value="other">Other / General Issue</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="target-dept" className="block text-xs font-semibold text-slate-800 mb-1">
                    Re-route to Municipal Department
                  </label>
                  <select
                    id="target-dept"
                    value={overrideDept}
                    onChange={(e) => setOverrideDept(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-700"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="override-reason" className="block text-xs font-semibold text-slate-800 mb-1">
                  Reason for Override (Recorded in System Audit Log)
                </label>
                <textarea
                  id="override-reason"
                  rows={3}
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Model flagged confidence below 80% due to night lighting. Visual inspection confirms streetlight luminaire damage."
                  className="w-full px-3 py-2.5 sm:py-2 rounded border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-1.5 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideLoading || !overrideReason.trim()}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-1.5 rounded text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center shadow-subtle"
                >
                  {overrideLoading ? "Applying Override..." : "Confirm & Apply Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
