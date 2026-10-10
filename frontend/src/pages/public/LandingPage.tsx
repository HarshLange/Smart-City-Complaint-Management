import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Cpu,
  Droplet,
  FileSearch,
  HelpCircle,
  Lightbulb,
  Lock,
  MapPin,
  Search,
  Shield,
  Trash2,
  Truck,
  Users,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [trackRef, setTrackRef] = useState("");
  const [trackPin, setTrackPin] = useState("");

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackRef.trim()) {
      navigate(`/track?ref=${encodeURIComponent(trackRef.trim())}&pin=${encodeURIComponent(trackPin.trim())}`);
    }
  };

  const categories = [
    {
      title: "Road Potholes & Cracks",
      dept: "Road Authority",
      icon: Truck,
      color: "text-orange-600 bg-orange-50 border-orange-200",
      desc: "Surface deterioration, road craters, and driving hazards.",
    },
    {
      title: "Water Pipeline Leaks",
      dept: "Water Department",
      icon: Droplet,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      desc: "Burst mainlines, valve failures, and potable water leakage.",
    },
    {
      title: "Streetlight Failures",
      dept: "Infrastructure Department",
      icon: Lightbulb,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      desc: "Dark corridors, flickering bulbs, and electrical hazards.",
    },
    {
      title: "Garbage & Waste",
      dept: "Garbage Department",
      icon: Trash2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      desc: "Overflowing municipal dumpsters, litter, and hygiene risks.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Capture & Describe",
      desc: "Take a photograph of the civic defect. Attach GPS coordinates or input your street address.",
      icon: Camera,
    },
    {
      num: "02",
      title: "Deep Vision AI Classification",
      desc: "Our EfficientNetV2-S model verifies the image and deterministically maps the ticket to the responsible department.",
      icon: Cpu,
    },
    {
      num: "03",
      title: "Municipal Dispatch & Resolution",
      desc: "Authorized department crews are assigned, complete field repairs, and upload verified photo evidence upon resolution.",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200 py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Next-Gen Municipal Governance Platform
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Intelligent Civic Issue Resolution for Responsive Cities
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Empowering citizens with AI-assisted defect reporting. Upload an image, get verified classification via deep learning, and track resolution progress with municipal accountability.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/report"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition group"
                >
                  <Camera className="w-5 h-5" />
                  <span>Report an Issue Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition"
                >
                  <FileSearch className="w-5 h-5 text-slate-500" />
                  <span>Track Complaint</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Privacy-Preserving Tracking PIN</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>EfficientNetV2-S Neural Engine</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Deterministic Department Routing</span>
                </div>
              </div>
            </div>

            {/* Right Column: Quick Tracking Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Fast Complaint Lookup</h2>
                    <p className="text-xs text-slate-500">Track progress using your Reference Number and PIN</p>
                  </div>
                </div>

                <form onSubmit={handleQuickTrack} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. REF-20261010-8A4F2C"
                      value={trackRef}
                      onChange={(e) => setTrackRef(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Secure Tracking PIN
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. K8F2X9"
                      value={trackPin}
                      onChange={(e) => setTrackPin(e.target.value)}
                      required
                      maxLength={8}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono uppercase"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      High-entropy PIN issued at submission protects your personal data from public enumeration.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition flex items-center justify-center gap-2"
                  >
                    <span>Verify & Track Status</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Civic Categories Showcase */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
              Automated Routing
            </h2>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              Civic Issue Categories Handled Automatically
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              Our neural network classifies uploaded defect imagery into authoritative municipal service categories with server-side validation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${c.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">{c.title}</h4>
                  <div className="text-xs font-semibold text-blue-600 mb-2">
                    Routes to: {c.dept}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How the Process Works */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
              Transparent Lifecycle
            </h2>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              From Citizen Report to Field Resolution
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              Every status transition is signed, timestamped, and auditable across our municipal state machine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-3xl font-black text-slate-200 absolute top-4 right-4">
                    {s.num}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-sm shadow-blue-500/20">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security & Privacy Notice */}
      <section className="py-14 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto bg-slate-800/80 border border-slate-700 rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-xl font-bold text-white">
                Strict Citizen Data Privacy & Object Security
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Public tracking endpoints never expose citizen names, phone numbers, or private internal notes. All uploaded photographs remain stored in isolated private object storage, with access granted only to verified officers and the original reporting citizen.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
