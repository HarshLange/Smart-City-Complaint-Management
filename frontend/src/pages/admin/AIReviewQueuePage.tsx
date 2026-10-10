import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  FileText,
  Sliders,
  X,
} from "lucide-react";
import { api } from "../../api/client";
import { CategoryBadge } from "../../components/common/CategoryBadge";
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
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin Console</span>
          </Link>
        </div>

        {/* Title Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-600">
            <Cpu className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Human-in-the-Loop Review
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            AI Classification Review Queue
          </h1>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Complaints flagged due to low model confidence (&lt;80%), borderline feature ambiguity, or inference failure. Authoritative administrator review ensures reliable department dispatch without blind automatic routing.
          </p>
        </div>

        {/* Review Queue List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading review queue...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-white rounded-2xl border border-rose-200">
            {error}
          </div>
        ) : queue.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Review Queue Empty</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All complaints have been high-confidence classified or verified by administrators.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {queue.map((c) => {
              const photo = c.attachments?.find((a) => !a.is_resolution_evidence);
              const conf = c.ai_prediction ? (c.ai_prediction.confidence_score * 100).toFixed(1) : "0.0";

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {c.reference_number}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={c.status} />
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Conf: {conf}%</span>
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>

                    {/* Defect Photo Preview */}
                    {photo ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-100 flex items-center justify-center">
                        <img
                          src={photo.access_url}
                          alt="Defect"
                          className="max-h-48 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                        No photograph attached
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Predicted Class:</span>
                        <strong className="text-slate-800 capitalize">
                          {c.ai_prediction?.predicted_category || "Unclassified"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Suggested Dept:</span>
                        <span className="font-semibold text-indigo-700">
                          {c.department_name || "Awaiting Review"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedComplaint(c);
                        setOverrideCat(c.category);
                        if (c.department_id) setOverrideDept(c.department_id);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Review & Assign Department</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Override Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Verify & Route Complaint
                </h3>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div>Case: <strong className="text-slate-900">{selectedComplaint.reference_number}</strong></div>
                <div>Title: {selectedComplaint.title}</div>
              </div>

              <form onSubmit={handleApplyOverride} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign Verified Category
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
                    Assign Department
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
                    Review Verification Reason (Audited)
                  </label>
                  <textarea
                    rows={3}
                    required
                    minLength={5}
                    placeholder="Document your verification rationale..."
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
                    {overrideLoading ? "Confirming..." : "Confirm & Route Case"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedComplaint(null)}
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
