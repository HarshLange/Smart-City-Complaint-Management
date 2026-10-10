import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  FileSearch,
  Image as ImageIcon,
  LocateFixed,
  Lock,
  MapPin,
  Trash2,
  Upload,
} from "lucide-react";
import { api } from "../../api/client";
import { CategoryBadge } from "../../components/common/CategoryBadge";
import { useAuthStore } from "../../store/authStore";
import { CivicCategory } from "../../types";

export const NewComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success Confirmation State
  const [successData, setSuccessData] = useState<{
    reference_number: string;
    tracking_pin: string;
    category: CivicCategory;
    department_name: string;
    confidence_score: number | null;
  } | null>(null);

  const [pinCopied, setPinCopied] = useState(false);
  const [refCopied, setRefCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(selected.type)) {
        setSubmitError("Please select a valid image file (JPEG, PNG, or WebP).");
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        setSubmitError("Photograph file size exceeds the 5MB municipal limit.");
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setSubmitError(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setGpsError(
        "Geolocation is not supported by your browser. Please enter street address manually."
      );
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(
          "Location permission was denied or unavailable. Please enter your street address manually below."
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setSubmitError("A photograph of the defect is required for verification.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("file", file);
      if (latitude !== null) formData.append("latitude", latitude.toString());
      if (longitude !== null) formData.append("longitude", longitude.toString());
      if (address.trim()) formData.append("address", address.trim());
      if (landmark.trim()) formData.append("landmark", landmark.trim());

      const res = await api.submitComplaint(formData);

      setSuccessData({
        reference_number: res.reference_number,
        tracking_pin: res.tracking_pin,
        category: res.category,
        department_name: res.department_name || "Review Queue",
        confidence_score: res.confidence_score,
      });
    } catch (err: any) {
      setSubmitError(
        err.message || "Failed to submit complaint. Please check your network and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: "ref" | "pin") => {
    navigator.clipboard.writeText(text);
    if (type === "pin") {
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2500);
    } else {
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2500);
    }
  };

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded border border-slate-200 shadow-subtle transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Return to Overview</span>
          </Link>
        </div>

        {/* Page Heading */}
        <div className="border-b border-slate-200 pb-4">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
            Civic Issue Reporting
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Report a Civic Issue
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Provide a clear photograph, concise title, description, and location details. Your submission will be routed to the appropriate municipal department.
          </p>
        </div>

        {/* Success Modal / Confirmation Receipt */}
        {successData ? (
          <div className="bg-white rounded-md border-2 border-emerald-500 shadow-modal p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-700" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Complaint Registered Successfully
                </h2>
                <p className="text-xs text-slate-600">
                  Your report has been received and queued for department dispatch.
                </p>
              </div>
            </div>

            {/* Credentials Card (Important) */}
            <div className="bg-amber-50/70 border border-amber-200 rounded p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                <Lock className="w-4 h-4 text-amber-700" aria-hidden="true" />
                <span>Save Your Tracking Credentials</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Please record your Reference Number and Tracking PIN below. For citizen privacy, the Tracking PIN is displayed only once and cannot be recovered if lost.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Reference Number */}
                <div className="bg-white p-3 rounded border border-amber-300 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Reference Number
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {successData.reference_number}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(successData.reference_number, "ref")}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs flex items-center gap-1 font-medium"
                    aria-label="Copy Reference Number"
                  >
                    {refCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Tracking PIN */}
                <div className="bg-white p-3 rounded border border-amber-300 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Secure Tracking PIN
                    </span>
                    <span className="font-mono font-bold text-sm text-blue-700 tracking-wider">
                      {successData.tracking_pin}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(successData.tracking_pin, "pin")}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs flex items-center gap-1 font-medium"
                    aria-label="Copy Tracking PIN"
                  >
                    {pinCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Department Assignment Notification */}
            <div className="bg-slate-50 rounded border border-slate-200 p-4 text-xs space-y-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
                Preliminary System Routing
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <CategoryBadge category={successData.category} />
                <span className="text-slate-600">
                  Assigned to: <strong className="text-slate-900">{successData.department_name}</strong>
                </span>
              </div>
            </div>

            {/* Next Action Links */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                to={`/track?ref=${encodeURIComponent(successData.reference_number)}&pin=${encodeURIComponent(successData.tracking_pin)}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition text-center"
              >
                Track This Ticket Now
              </Link>
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto px-5 py-2.5 rounded text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 text-center"
                >
                  Go to Citizen Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setSuccessData(null);
                  setTitle("");
                  setDescription("");
                  setAddress("");
                  setLandmark("");
                  removeFile();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded text-sm font-medium text-slate-600 hover:text-slate-900 text-center"
              >
                Submit Another Report
              </button>
            </div>
          </div>
        ) : (
          /* Structured 4-Section Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
              <div
                role="alert"
                className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-3"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Unable to Process Submission</p>
                  <p className="mt-0.5 text-red-700">{submitError}</p>
                </div>
              </div>
            )}

            {/* Section 1: Photographic Evidence */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 rounded bg-gov-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Photographic Evidence (Required)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Upload an authentic image of the civic issue. Accepted formats: JPEG, PNG, or WebP up to 5MB.
                  </p>
                </div>
              </div>

              {!file ? (
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-600 rounded p-8 text-center bg-slate-50/50 transition">
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="w-12 h-12 rounded bg-blue-50 text-blue-700 mx-auto flex items-center justify-center border border-blue-200">
                      <Camera className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div>
                      <label
                        htmlFor="photo-upload"
                        className="cursor-pointer font-semibold text-sm text-blue-700 hover:text-blue-800 hover:underline"
                      >
                        Choose a photograph
                      </label>
                      <span className="text-xs text-slate-500"> or drag and drop here</span>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="sr-only"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Clear photos of potholes, water leaks, broken lights, or waste aid rapid classification.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center gap-4">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Defect Preview"
                      className="w-24 h-24 object-cover rounded border border-slate-300"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <span className="font-semibold text-xs text-slate-900 block truncate">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="px-3 py-1.5 rounded text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Replace Image</span>
                  </button>
                </div>
              )}
            </div>

            {/* Section 2: Issue Title & Description */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 rounded bg-gov-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Issue Details</h2>
                  <p className="text-xs text-slate-500">Provide an informative summary of the problem.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="issue-title" className="block text-xs font-semibold text-slate-800 mb-1">
                    Issue Title (Brief Summary)
                  </label>
                  <input
                    id="issue-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    minLength={3}
                    maxLength={150}
                    placeholder="e.g. Deep pothole causing lane hazard on Main Street"
                    className="w-full px-3 py-2 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div>
                  <label htmlFor="issue-desc" className="block text-xs font-semibold text-slate-800 mb-1">
                    Detailed Description
                  </label>
                  <textarea
                    id="issue-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                    placeholder="Describe the severity, duration, and any safety hazards or traffic impact..."
                    className="w-full px-3 py-2 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                  <span className="text-[11px] text-slate-500 block text-right mt-1">
                    {description.length} / 2000 characters
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Location Details */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 rounded bg-gov-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Incident Location</h2>
                  <p className="text-xs text-slate-500">
                    Use GPS detection or enter the physical street address manually.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* GPS Capture */}
                <div className="p-3.5 rounded bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Browser GPS Coordinates
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {latitude && longitude
                        ? `Captured: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                        : "Optional — Coordinates pinpoint the exact field defect."}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={gpsLoading}
                    className="px-3.5 py-1.5 rounded text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                    <span>{gpsLoading ? "Detecting..." : latitude ? "Re-detect GPS" : "Capture Location"}</span>
                  </button>
                </div>

                {gpsError && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
                    {gpsError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="street-address" className="block text-xs font-semibold text-slate-800 mb-1">
                      Street Address or Intersection
                    </label>
                    <input
                      id="street-address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 1420 Commercial Avenue"
                      className="w-full px-3 py-2 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label htmlFor="landmark" className="block text-xs font-semibold text-slate-800 mb-1">
                      Nearby Landmark (Optional)
                    </label>
                    <input
                      id="landmark"
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Opposite City Park entrance"
                      className="w-full px-3 py-2 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Review & Submit */}
            <div className="bg-white rounded-md border border-slate-200 shadow-panel p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 rounded bg-gov-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Review & Submit</h2>
                  <p className="text-xs text-slate-500">
                    Confirm your report details before submitting to municipal dispatch.
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed">
                By submitting this ticket, you certify that the information provided is accurate to the best of your knowledge. Your report will be classified, queued, and investigated by municipal authorities.
              </div>

              <button
                type="submit"
                disabled={submitting || !file}
                className="w-full py-3 rounded text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-subtle"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Image & Registering Ticket...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>Submit Complaint to Municipal Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
