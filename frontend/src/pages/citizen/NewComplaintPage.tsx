import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Copy,
  Cpu,
  Image as ImageIcon,
  LocateFixed,
  MapPin,
  Trash2,
  Upload,
} from "lucide-react";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/authStore";

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

  // Success Modal State
  const [successData, setSuccessData] = useState<{
    reference_number: string;
    tracking_pin: string;
    category: string;
    department_name: string;
    confidence_score: number;
  } | null>(null);

  const [pinCopied, setPinCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        setSubmitError("Photograph file size exceeds maximum allowable limit of 5MB.");
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
      setGpsError("Geolocation is not supported by your browser. Please enter street address manually.");
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
      setSubmitError("A photograph of the defect is required for AI verification.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("file", file);

      if (latitude !== null) formData.append("latitude", latitude.toString());
      if (longitude !== null) formData.append("longitude", longitude.toString());
      if (address) formData.append("address", address);
      if (landmark) formData.append("landmark", landmark);

      const res = await api.submitComplaint(formData);
      setSuccessData({
        reference_number: res.reference_number,
        tracking_pin: res.tracking_pin,
        category: res.category,
        department_name: res.department_name,
        confidence_score: res.confidence_score,
      });
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit complaint. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Report a Civic Issue
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Submit photographic evidence. Our AI neural network classifies the issue and assigns it directly to municipal maintenance crews.
          </p>
        </div>

        {submitError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Submission Incomplete</strong>
              <span>{submitError}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Photograph Upload */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                1. Issue Photograph (Required)
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Clear photographs ensure high-confidence deep-learning classification. JPEG, PNG, or WebP up to 5MB.
            </p>

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-80 bg-slate-100 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Issue Preview"
                  className="w-full h-auto max-h-80 object-contain"
                />
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-3 right-3 p-2 bg-rose-600 text-white rounded-lg shadow-md hover:bg-rose-700 transition"
                  title="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/30">
                <div className="w-12 h-12 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center mb-1">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  Click to browse or drag & drop photograph
                </span>
                <span className="text-xs text-slate-400">
                  Accepts JPEG, PNG, WebP (Max 5MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
              </label>
            )}
          </div>

          {/* Section 2: Details */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              2. Problem Description
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Summary / Title
              </label>
              <input
                type="text"
                placeholder="e.g. Deep pothole causing tire damage near crossing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
                maxLength={200}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Description
              </label>
              <textarea
                rows={4}
                placeholder="Describe the severity, hazard risk, or specific location details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={10}
                maxLength={4000}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Geolocation & Address */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  3. Defect Location
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCaptureLocation}
                disabled={gpsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>{gpsLoading ? "Acquiring GPS..." : "Detect GPS Coordinates"}</span>
              </button>
            </div>

            {latitude && longitude && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>GPS Captured: {latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLatitude(null);
                    setLongitude(null);
                  }}
                  className="text-emerald-700 font-bold hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

            {gpsError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                {gpsError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 142 Riverway Blvd"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nearby Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. In front of Central Library"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 text-base"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Running Deep Vision AI Classification...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-5 h-5" />
                  <span>Submit & Classify Issue</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Success Modal */}
        {successData && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">
                  Complaint Registered!
                </h3>
                <p className="text-xs text-slate-500">
                  Your ticket has been classified and routed to municipal authorities.
                </p>
              </div>

              {/* Reference & PIN Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Public Reference Number
                  </span>
                  <span className="text-base font-mono font-bold text-blue-600">
                    {successData.reference_number}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Secret Tracking PIN
                    </span>
                    <span className="text-lg font-mono font-bold text-slate-900 tracking-wider">
                      {successData.tracking_pin}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(successData.tracking_pin)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-lg transition"
                    title="Copy PIN"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {pinCopied && (
                  <span className="text-[11px] text-emerald-600 font-semibold block text-center">
                    PIN copied to clipboard!
                  </span>
                )}
              </div>

              {/* AI Classification Info */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 text-xs text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">AI Category:</span>
                  <strong className="text-slate-900 capitalize">
                    {successData.category.replace("_", " ")}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Routed Department:</span>
                  <strong className="text-blue-700">{successData.department_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Confidence Score:</span>
                  <span className="font-semibold text-slate-800">
                    {(successData.confidence_score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  to={`/track?ref=${encodeURIComponent(successData.reference_number)}&pin=${encodeURIComponent(successData.tracking_pin)}`}
                  className="flex-1 py-2.5 rounded-xl text-center text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
                >
                  Track Progress
                </Link>
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="flex-1 py-2.5 rounded-xl text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    My Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className="flex-1 py-2.5 rounded-xl text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Home
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
