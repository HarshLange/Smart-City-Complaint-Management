import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  CheckCircle,
  Clock,
  Droplet,
  FileSearch,
  HelpCircle,
  Lightbulb,
  Lock,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [trackRef, setTrackRef] = useState("");
  const [trackPin, setTrackPin] = useState("");

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackRef.trim() && trackPin.trim()) {
      navigate(
        `/track?ref=${encodeURIComponent(trackRef.trim())}&pin=${encodeURIComponent(
          trackPin.trim()
        )}`
      );
    }
  };

  const categories = [
    {
      title: "Roads & Potholes",
      dept: "Road Authority",
      icon: Truck,
      code: "ROAD",
      desc: "Damaged asphalt, potholes, roadway subsidence, and surface hazards.",
    },
    {
      title: "Water & Drainage",
      dept: "Water Department",
      icon: Droplet,
      code: "WATR",
      desc: "Pipeline bursts, municipal supply leaks, overflowing drains, and valve failures.",
    },
    {
      title: "Streetlights & Utilities",
      dept: "Infrastructure Department",
      icon: Lightbulb,
      code: "INFR",
      desc: "Non-functioning streetlights, exposed wiring, and utility pole damage.",
    },
    {
      title: "Sanitation & Waste",
      dept: "Sanitation Department",
      icon: Trash2,
      code: "SANI",
      desc: "Overflowing public dumpsters, uncollected waste, and roadside litter accumulation.",
    },
  ];

  const steps = [
    {
      step: 1,
      title: "Submit a photograph and describe the issue",
      desc: "Provide a clear picture of the civic problem and note the location. GPS coordinates can be attached automatically with your permission or entered manually.",
    },
    {
      step: 2,
      title: "Automated classification and department routing",
      desc: "The system inspects the image using computer vision and assigns the ticket to the responsible department. Low-confidence predictions are flagged for officer review.",
    },
    {
      step: 3,
      title: "Track progress through field resolution",
      desc: "Use your private Reference Number and Tracking PIN to check updates as field crews inspect, repair, and upload completion evidence.",
    },
  ];

  return (
    <div id="main-content" className="min-h-screen flex flex-col bg-slate-50">
      {/* Civic Service Hero */}
      <section className="bg-white border-b border-slate-200 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left: Purpose & Primary Service Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-blue-700" aria-hidden="true" />
                <span>Municipal Citizen Services Portal</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Report a civic issue. Follow it through resolution.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Submit a report about a damaged road, water leak, broken streetlight, or waste problem. Receive a reference number and check progress as the responsible municipal team responds.
              </p>

              {/* Service Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/report"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition shadow-subtle focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  <span>Report an Issue</span>
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
                >
                  <FileSearch className="w-4 h-4 text-slate-600" aria-hidden="true" />
                  <span>Track a Complaint</span>
                </Link>
              </div>

              {/* Operational Assurances */}
              <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Personal information protected with tracking PIN</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Deterministic department routing & review</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Transparent timeline updates from field crews</span>
                </div>
              </div>
            </div>

            {/* Right: Quick Lookup Service Panel */}
            <div className="lg:col-span-5">
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-6 sm:p-7 shadow-panel">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 mb-5">
                  <div className="w-8 h-8 rounded bg-blue-700 text-white flex items-center justify-center">
                    <Search className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Track an Existing Complaint</h2>
                    <p className="text-xs text-slate-500">Check current department handling status</p>
                  </div>
                </div>

                <form onSubmit={handleQuickTrack} className="space-y-4">
                  <div>
                    <label
                      htmlFor="quick-ref"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Complaint Reference Number
                    </label>
                    <input
                      id="quick-ref"
                      type="text"
                      placeholder="e.g. REF-20261010-8A4F2C"
                      value={trackRef}
                      onChange={(e) => setTrackRef(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded border border-slate-300 text-sm font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="quick-pin"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      6-Character Tracking PIN
                    </label>
                    <input
                      id="quick-pin"
                      type="text"
                      placeholder="e.g. K8F2X9"
                      value={trackPin}
                      onChange={(e) => setTrackPin(e.target.value)}
                      required
                      maxLength={8}
                      className="w-full px-3 py-2 rounded border border-slate-300 text-sm font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      The tracking PIN was issued upon submission to verify your authorization to view ticket updates.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded text-sm font-semibold text-white bg-gov-navy hover:bg-slate-800 transition flex items-center justify-center gap-2"
                  >
                    <span>Check Resolution Progress</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Categories Section */}
      <section className="py-12 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
              Supported Civic Issues
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Issues Handled by Municipal Departments
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Submitted photographs are analyzed by our computer vision classifier and routed directly to the appropriate authority for field inspection.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map((c, idx) => {
              const Icon = c.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-md border border-slate-200 shadow-subtle flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded bg-slate-100 text-slate-800 flex items-center justify-center mb-3 border border-slate-200">
                      <Icon className="w-5 h-5 text-blue-700" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-blue-700 font-semibold mt-0.5 mb-2">
                      {c.dept}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Department Code: {c.code}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How the Process Works */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
              Public Service Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              How the Reporting and Resolution Process Works
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              A transparent, audited lifecycle from submission to resolution by municipal crews.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div
                key={s.step}
                className="bg-slate-50 p-6 rounded-md border border-slate-200 relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                    Step {s.step}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded bg-slate-100 border border-slate-300 text-xs text-slate-700 leading-relaxed flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong>Service note:</strong> Computer vision provides initial categorization assistance. Municipal officers review tickets before dispatch, ensuring that uncertain or ambiguous reports receive human inspection without delay.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
