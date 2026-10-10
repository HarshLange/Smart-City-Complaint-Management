import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock, Search, ShieldCheck } from "lucide-react";
import { api } from "../../api/client";
import { CategoryBadge } from "../../components/common/CategoryBadge";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Timeline } from "../../components/common/Timeline";
import { ComplaintPublicTracking } from "../../types";

export const TrackComplaintPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [refNum, setRefNum] = useState(searchParams.get("ref") || "");
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<ComplaintPublicTracking | null>(null);

  const fetchTracking = async (r: string, p: string) => {
    if (!r.trim() || !p.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.trackComplaint(r.trim(), p.trim());
      setComplaint(data);
    } catch (err: any) {
      setComplaint(null);
      setError(err.message || "Invalid Complaint Reference Number or Tracking PIN.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("ref") && searchParams.get("pin")) {
      fetchTracking(searchParams.get("ref")!, searchParams.get("pin")!);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(refNum, pin);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Track Complaint Status
          </h1>
          <p className="text-sm text-slate-600">
            Verify real-time status and municipal department assignments with privacy verification.
          </p>
        </div>

        {/* Verification Form Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complaint Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. REF-20261010-8A4F2C"
                  value={refNum}
                  onChange={(e) => setRefNum(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  6-Digit Tracking PIN
                </label>
                <input
                  type="text"
                  placeholder="e.g. K8F2X9"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  maxLength={8}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Verify and Track Progress</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Verification Failed</strong>
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Results Card */}
        {complaint && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            {/* Top Bar */}
            <div className="px-6 py-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400 font-medium">Reference:</span>
                  <span className="font-mono font-bold text-sm tracking-wide text-blue-400">
                    {complaint.reference_number}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{complaint.title}</h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={complaint.status} />
                <CategoryBadge category={complaint.category} />
              </div>
            </div>

            {/* Department & Info */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Assigned Department</span>
                  <strong className="text-slate-900 text-sm">
                    {complaint.department_name || "Awaiting Review"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Reported On</span>
                  <span className="text-slate-900 font-medium">
                    {new Date(complaint.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Current Status</span>
                  <strong className="text-blue-600 font-semibold">{complaint.status}</strong>
                </div>
              </div>

              {/* Location details */}
              {(complaint.address_summary || complaint.landmark) && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    General Location
                  </h3>
                  <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    {complaint.address_summary || "Municipal territory"}
                    {complaint.landmark ? ` (Landmark: ${complaint.landmark})` : ""}
                  </p>
                </div>
              )}

              {/* Resolution Notes if Resolved */}
              {complaint.status === "RESOLVED" && complaint.resolution_notes && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Officer Resolution Summary</span>
                  </div>
                  <p className="leading-relaxed">{complaint.resolution_notes}</p>
                  {complaint.resolved_at && (
                    <div className="text-[11px] text-emerald-700 mt-2">
                      Resolved on: {new Date(complaint.resolved_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Progression Timeline */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Official Lifecycle Progression</h3>
                <Timeline history={complaint.status_timeline} />
              </div>
            </div>

            {/* Privacy Compliance Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Public Record • PII Protected</span>
              </span>
              <span>Updated in real-time</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
