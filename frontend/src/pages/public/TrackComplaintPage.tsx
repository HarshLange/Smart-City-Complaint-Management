import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileSearch,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { api } from "../../api/client";
import { CategoryBadge } from "../../components/common/CategoryBadge";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Timeline } from "../../components/common/Timeline";
import { useAuthStore } from "../../store/authStore";
import { Complaint, ComplaintPublicTracking } from "../../types";

export const TrackComplaintPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [refNum, setRefNum] = useState(searchParams.get("ref") || "");
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<ComplaintPublicTracking | null>(null);
  const [userComplaints, setUserComplaints] = useState<Complaint[]>([]);

  // Enforce authenticated-only tracking
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnPath = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${returnPath}`, { replace: true });
    }
  }, [authLoading, isAuthenticated, location, navigate]);

  // Load user's complaints for convenient reference selection
  useEffect(() => {
    if (isAuthenticated && user?.role === "CITIZEN") {
      api
        .getMyComplaints()
        .then(setUserComplaints)
        .catch(() => {});
    }
  }, [isAuthenticated, user]);

  const fetchTracking = async (r: string, p: string) => {
    if (!r.trim() || !p.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.trackComplaint(r.trim(), p.trim());
      setComplaint(data);
    } catch (err: any) {
      setComplaint(null);
      setError(
        err.message ||
          "Unable to verify complaint. Please check your Reference Number and Tracking PIN."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qRef = searchParams.get("ref");
    const qPin = searchParams.get("pin");
    if (qRef && qPin) {
      setRefNum(qRef);
      setPin(qPin);
      fetchTracking(qRef, qPin);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ ref: refNum.trim(), pin: pin.trim() });
    fetchTracking(refNum, pin);
  };

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 py-5 sm:py-10 px-3 sm:px-6 lg:px-8 pb-20 lg:pb-10">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-2 rounded-md border border-slate-200 shadow-subtle transition min-h-[40px] touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Return to Overview</span>
          </Link>
        </div>

        {/* Page Heading */}
        <div className="border-b border-slate-200 pb-3 sm:pb-4">
          <span className="text-[11px] sm:text-xs font-bold text-blue-700 uppercase tracking-wider block">
            Public Service Verification
          </span>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Track Complaint Status
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Enter the 16-character Reference Number and 6-character Tracking PIN received when your complaint was registered.
          </p>
        </div>

        {/* Authenticated Identity & Recent Submissions Helper */}
        {isAuthenticated && user && (
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-800">
              <User className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Signed in as <strong>{user.full_name}</strong>
              </span>
            </div>

            {userComplaints.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <label htmlFor="quick-ref-select" className="text-slate-600 font-medium shrink-0">
                  Select ticket:
                </label>
                <select
                  id="quick-ref-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      setRefNum(e.target.value);
                    }
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-md border border-blue-300 text-xs font-mono bg-white text-slate-800 focus:ring-2 focus:ring-blue-700 w-full sm:w-auto touch-manipulation"
                >
                  <option value="">-- Choose from your {userComplaints.length} tickets --</option>
                  {userComplaints.map((uc) => (
                    <option key={uc.id} value={uc.reference_number}>
                      {uc.reference_number} — {uc.title.substring(0, 24)}...
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Verification Form Card */}
        <div className="bg-white rounded-md p-4 sm:p-7 border border-slate-200 shadow-panel">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label
                  htmlFor="track-ref-input"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  Complaint Reference Number
                </label>
                <input
                  id="track-ref-input"
                  type="text"
                  placeholder="e.g. REF-20261010-8A4F2C"
                  value={refNum}
                  onChange={(e) => setRefNum(e.target.value)}
                  required
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  className="w-full min-h-[44px] px-3 py-2 rounded-md border border-slate-300 text-sm font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 touch-manipulation"
                />
              </div>

              <div>
                <label
                  htmlFor="track-pin-input"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  6-Character Tracking PIN
                </label>
                <input
                  id="track-pin-input"
                  type="text"
                  placeholder="e.g. K8F2X9"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  maxLength={8}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  className="w-full min-h-[44px] px-3 py-2 rounded-md border border-slate-300 text-sm font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 touch-manipulation"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>PIN verification ensures citizen privacy and data integrity.</span>
              </div>
              <button
                type="submit"
                disabled={loading || !refNum.trim() || !pin.trim()}
                className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-md text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-subtle touch-manipulation"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" aria-hidden="true" />
                    <span>Lookup Status</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Feedback */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">Verification Unsuccessful</p>
              <p className="mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Complaint Details Panel upon successful verification */}
        {complaint && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header Status Card */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel p-6 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                    Official Reference: {complaint.reference_number}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {complaint.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CategoryBadge category={complaint.category} />
                  <StatusBadge status={complaint.status} />
                </div>
              </div>

              {/* Operational Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-500 font-medium block">Assigned Authority</span>
                  <span className="text-slate-900 font-semibold block mt-1 text-sm">
                    {complaint.department_name || "Assigned to Review Queue"}
                  </span>
                </div>

                <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-500 font-medium block">Reported Timestamp</span>
                  <span className="text-slate-900 font-semibold block mt-1 text-sm">
                    {new Date(complaint.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-500 font-medium block">Priority Level</span>
                  <span className="text-slate-900 font-semibold block mt-1 text-sm uppercase">
                    {complaint.priority}
                  </span>
                </div>
              </div>

              {/* Location & Resolution Notes */}
              {(complaint.address_summary || complaint.landmark) && (
                <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                    <span>Reported Location</span>
                  </div>
                  <p className="text-slate-600">
                    {complaint.address_summary}
                    {complaint.landmark ? ` (Near ${complaint.landmark})` : ""}
                  </p>
                </div>
              )}

              {complaint.resolution_notes && (
                <div className="p-4 rounded bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span>Department Resolution Notice</span>
                  </div>
                  <p className="text-emerald-700 leading-relaxed">
                    {complaint.resolution_notes}
                  </p>
                  {complaint.resolved_at && (
                    <p className="text-[11px] text-emerald-600 pt-1">
                      Completed on: {new Date(complaint.resolved_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Lifecycle Timeline */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel p-6 sm:p-7">
              <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700" aria-hidden="true" />
                <span>Ticket Lifecycle & Status Progression</span>
              </h3>
              <Timeline history={complaint.status_timeline} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
