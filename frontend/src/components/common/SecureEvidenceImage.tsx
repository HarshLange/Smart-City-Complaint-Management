import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Download,
  ExternalLink,
  Eye,
  FileImage,
  Loader2,
  Maximize2,
  X,
  ZoomIn,
} from "lucide-react";
import { api } from "../../api/client";

interface SecureEvidenceImageProps {
  storagePath: string;
  alt: string;
  filename?: string;
  accessUrl?: string;
  isResolutionEvidence?: boolean;
  className?: string;
}

export const SecureEvidenceImage: React.FC<SecureEvidenceImageProps> = ({
  storagePath,
  alt,
  filename,
  accessUrl,
  isResolutionEvidence = false,
  className = "w-full max-h-96 object-contain mx-auto",
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadImage = async () => {
    if (!storagePath) {
      setLoading(false);
      setError("No storage path provided for evidence object.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Primary authenticated stream via backend authorization gateway
      const url = await api.getFileBlobUrl(storagePath);
      setBlobUrl(url);
    } catch (err: any) {
      // 2. Fallback to pre-signed URL or direct access URL if provided
      try {
        const signedRes = await api.getSignedUrl(storagePath, 1800);
        if (signedRes.signed_url) {
          setBlobUrl(signedRes.signed_url);
          return;
        }
      } catch {
        // Fallback to access_url if available
        if (accessUrl && accessUrl.startsWith("http")) {
          setBlobUrl(accessUrl);
          return;
        }
      }
      setError(err.message || "Unable to retrieve evidence from secure storage bucket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImage();

    return () => {
      // Clean up object URLs on component unmount
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [storagePath]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || (isResolutionEvidence ? "resolution_evidence.jpg" : "complaint_evidence.jpg");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="w-full h-64 bg-slate-100 rounded border border-slate-200 flex flex-col items-center justify-center gap-2 p-6 animate-pulse">
        <Loader2 className="w-6 h-6 text-blue-700 animate-spin" aria-hidden="true" />
        <span className="text-xs text-slate-500 font-medium">
          Retrieving encrypted evidence from private municipal storage...
        </span>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="w-full p-6 bg-slate-50 rounded border border-dashed border-slate-300 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
          <FileImage className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">Photo Evidence Unavailable</p>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">{error}</p>
        </div>
        <button
          type="button"
          onClick={loadImage}
          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition"
        >
          Retry Retrieval
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="group relative overflow-hidden rounded border border-slate-200 bg-slate-900">
        <img
          src={blobUrl}
          alt={alt}
          className={className}
          loading="lazy"
        />

        {/* Hover / Focus Overlay with Zoom and Download */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 rounded bg-white/90 hover:bg-white text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-subtle transition focus:outline-none focus:ring-2 focus:ring-blue-700"
            aria-label="Enlarge evidence photograph"
          >
            <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Inspect Full Image</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-subtle transition focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Download original evidence photograph"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Lightbox / Zoom Dialog Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution evidence inspection"
        >
          <div className="bg-slate-900 rounded-md border border-slate-700 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-modal">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950 text-white">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-blue-400" aria-hidden="true" />
                <span className="text-xs font-semibold tracking-wide">
                  {filename || "Evidence Inspection Record"}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {isResolutionEvidence ? "Resolution Proof" : "Defect Submission"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Save Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded transition"
                  aria-label="Close image inspection dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/90">
              <img
                src={blobUrl}
                alt={alt}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded"
              />
            </div>

            {/* Modal Footer Ribbon */}
            <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950 text-slate-400 text-[11px] flex items-center justify-between">
              <span>Encrypted Object Path: <code className="text-slate-300 font-mono">{storagePath}</code></span>
              <span>CivicPulse Secure Storage Infrastructure</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
