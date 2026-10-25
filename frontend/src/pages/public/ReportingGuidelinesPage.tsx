import React from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileCheck2,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export const ReportingGuidelinesPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  return (
    <div id="main-content" className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white min-h-[44px] sm:min-h-0 px-3.5 py-2.5 sm:py-1.5 rounded border border-slate-200 shadow-subtle transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Return to Overview</span>
          </Link>
        </div>

        <div className="border-b border-slate-200 pb-4">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
            Official Quality Standards
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Municipal Reporting Guidelines & Checklist
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Guidelines to ensure fast AI categorization, accurate dispatch, and efficient field repairs.
          </p>
        </div>

        <div className="space-y-6 text-xs text-slate-700 leading-relaxed">
          {/* Rule 1: Photography */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-subtle space-y-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Camera className="w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                1. Photographic Evidence Quality
              </h2>
            </div>
            <p>
              Your photograph provides the primary evidence analyzed by our neural computer vision classifier. Clear photos allow the system to confirm road degradation depth, pipe burst diameter, or fixture models without physical pre-inspection.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                <span className="font-bold text-emerald-900 block mb-1">Recommended Approach:</span>
                <ul className="list-disc pl-4 text-emerald-800 space-y-0.5 text-[11px]">
                  <li>Stand 3 to 5 meters back so the roadway, curb, or surrounding buildings are visible.</li>
                  <li>Shoot in natural daylight where possible.</li>
                  <li>Hold the camera steady to avoid motion blur.</li>
                </ul>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <span className="font-bold text-red-900 block mb-1">Avoid:</span>
                <ul className="list-disc pl-4 text-red-800 space-y-0.5 text-[11px]">
                  <li>Extreme close-ups showing only asphalt texture with zero surroundings.</li>
                  <li>Photographs taken through rain-streaked car windshields while moving.</li>
                  <li>Photos showing private citizens or vehicle registration license plates.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Rule 2: Location */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-subtle space-y-3">
            <div className="flex items-center gap-2 text-blue-700">
              <MapPin className="w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                2. Precise Physical Location
              </h2>
            </div>
            <p>
              Field work crews operate trucks carrying specific asphalt, pipe fittings, or lift cranes. Accurate addresses ensure crews do not spend hours searching neighborhoods.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Enable device location permissions when prompted to automatically attach GPS coordinates.</li>
              <li>Provide the exact street name and nearest building number (e.g. "Opposite 452 Elm Street").</li>
              <li>Include visible permanent landmarks (e.g. "Intersection of 5th Ave, near Public Library").</li>
            </ul>
          </div>

          {/* Rule 3: Description */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-subtle space-y-3">
            <div className="flex items-center gap-2 text-blue-700">
              <FileCheck2 className="w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                3. Descriptive Detail & Hazard Rating
              </h2>
            </div>
            <p>
              In your text description, summarize the approximate physical dimensions and traffic hazard level:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Roads:</strong> Mention if the pothole has exposed reinforcing steel, or if vehicles are swerving dangerously.</li>
              <li><strong>Water:</strong> State whether clean drinking supply is spraying or if it is stagnant sewage overflow.</li>
              <li><strong>Electrical:</strong> Note if sparks are visible, if wires are touching tree branches, or if multiple streetlights are dark.</li>
            </ul>
          </div>

          {/* Rule 4: Prohibited */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-subtle space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                4. What NOT to Submit to CivicPulse
              </h2>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Emergencies:</strong> Active gas leaks, downed high-voltage wires on occupied vehicles, or bridge collapses (call 911).</li>
              <li><strong>Private Disputes:</strong> Neighbor disputes regarding property lines, private trees, or private driveway maintenance.</li>
              <li><strong>Commercial Advertising:</strong> Spam, commercial vendor solicitations, or self-promotional content.</li>
            </ul>
          </div>
        </div>

        <div className="pt-2 text-center">
          <Link
            to={isAuthenticated ? "/report" : "/login?redirect=%2Freport"}
            className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-subtle transition inline-flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Ready? Submit an Issue Now</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
