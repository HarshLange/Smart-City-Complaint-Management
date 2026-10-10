import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Droplet,
  FileCheck2,
  FileSearch,
  FileText,
  HelpCircle,
  Info,
  Lightbulb,
  Lock,
  MapPin,
  Phone,
  PhoneCall,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Users,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [trackRef, setTrackRef] = useState("");
  const [trackPin, setTrackPin] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

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
      dept: "Road Authority (PWD)",
      icon: Truck,
      code: "ROAD",
      desc: "Deep asphalt potholes, roadway subsidence, failed speed breakers, and cracked paving hazards.",
      sla: "24-48 hours response",
    },
    {
      title: "Water Supply & Drainage",
      dept: "Water Resources Department",
      icon: Droplet,
      code: "WATR",
      desc: "Pressurized mainline pipeline bursts, contaminated supply, overflowing storm drains, and open manholes.",
      sla: "12-24 hours response",
    },
    {
      title: "Streetlights & Grid",
      dept: "Infrastructure & Electrical",
      icon: Lightbulb,
      code: "INFR",
      desc: "Non-functional street lamps, dangling overhead wires, damaged feeder pillars, and darkened corridors.",
      sla: "24-36 hours response",
    },
    {
      title: "Waste & Sanitation",
      dept: "Sanitation Department",
      icon: Trash2,
      code: "SANI",
      desc: "Overflowing public bins, unattended community dumpsters, dead animal removal, and public health litter.",
      sla: "12-24 hours response",
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Photograph & Report Issue",
      desc: "Capture a clear photo of the municipal defect on your smartphone or desktop. GPS coordinates are securely extracted or pinned on a digital map.",
      icon: Camera,
    },
    {
      step: "02",
      title: "AI Analysis & Routing",
      desc: "Our neural computer vision model classifies the issue severity and routes the ticket to the jurisdiction authority without clerical delays.",
      icon: Sparkles,
    },
    {
      step: "03",
      title: "Field Crew Dispatch",
      desc: "Assigned municipal engineers inspect the site, record internal investigation notes, and deploy asphalt, plumbing, or electrical repair crews.",
      icon: Truck,
    },
    {
      step: "04",
      title: "Verified Evidence Resolution",
      desc: "Repairs are completed and field officers upload completion photo evidence. The complainant receives real-time SMS/web status closure.",
      icon: CheckCircle2,
    },
  ];

  const statusDefinitions = [
    {
      status: "SUBMITTED",
      color: "bg-blue-50 text-blue-800 border-blue-200",
      description: "Complaint successfully received into the municipal intake gateway and indexed with unique reference number.",
    },
    {
      status: "UNDER_REVIEW",
      color: "bg-amber-50 text-amber-800 border-amber-200",
      description: "AI classification flagged for officer review, or supervisory review of jurisdictional boundaries in progress.",
    },
    {
      status: "ASSIGNED",
      color: "bg-indigo-50 text-indigo-800 border-indigo-200",
      description: "Ticket assigned to a specific field engineering division officer and entered into crew maintenance schedule.",
    },
    {
      status: "IN_PROGRESS",
      color: "bg-purple-50 text-purple-800 border-purple-200",
      description: "Field personnel are actively carrying out excavation, patching, replacement, or sanitation cleanup on site.",
    },
    {
      status: "RESOLVED",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      description: "Physical repairs completed with verified photographic completion evidence uploaded to the secure case file.",
    },
    {
      status: "CLOSED",
      color: "bg-slate-100 text-slate-800 border-slate-300",
      description: "Citizen sign-off confirmed or administrative archive completed after mandatory audit retention period.",
    },
  ];

  const faqs = [
    {
      q: "What types of civic issues can I report through CivicPulse?",
      a: "CivicPulse accepts reports on municipal public infrastructure: road potholes and paving hazards, leaking water pipelines and open drains, broken streetlights and exposed utility wiring, and overflowing waste or uncollected garbage. Immediate life-threatening emergencies must be reported to 911/emergency dispatch.",
    },
    {
      q: "How does the AI classification system work?",
      a: "When you upload an evidence photo, our trained neural vision model (EfficientNetV2-S) analyzes the image features to identify defect patterns (e.g. asphalt fractures vs. leaking pipes). It automatically routes the ticket to the responsible department. If model confidence is below 80%, the ticket enters an administrative human review queue before dispatch.",
    },
    {
      q: "How do I track my complaint without an account?",
      a: "Every submission generates a 16-character Reference Number (e.g. REF-20261010-XXXXXX) and a 6-character cryptographic Tracking PIN. You can sign in or enter your credentials in the tracking portal to monitor live timeline updates, officer notes, and completion photos.",
    },
    {
      q: "Are my personal details and photos visible to the general public?",
      a: "No. All evidence photographs are stored in private encrypted storage buckets with strict object-level access controls. Citizen email addresses and phone numbers are only visible to authorized municipal officers handling the case.",
    },
    {
      q: "What happens if a reported issue is not resolved properly?",
      a: "If a complaint is marked Resolved but the repair is incomplete or defective, citizens can submit a Reopening Request with one click through the complaint detail page, explaining the deficiency for supervisory review.",
    },
  ];

  return (
    <div id="main-content" className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* SECTION 1: Emergency & Urgent Public Safety Advisory Ribbon */}
      <section className="bg-amber-600 text-white px-4 py-2.5 border-b border-amber-700 shadow-subtle" aria-label="Urgent Public Safety Advisory">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <ShieldAlert className="w-4 h-4 text-amber-200 shrink-0" aria-hidden="true" />
            <span>
              <strong>EMERGENCY NOTICE:</strong> For immediate life-safety hazards, major gas leaks, live electrical wire fires, or active flooding, call <strong>911</strong> or <strong>112</strong> directly. Do not submit non-emergency tickets for urgent emergencies.
            </span>
          </div>
          <Link
            to="/guidelines"
            className="underline hover:text-amber-100 font-semibold shrink-0 text-[11px]"
          >
            Read Reporting Scope Guidelines →
          </Link>
        </div>
      </section>

      {/* SECTION 2: Primary Civic Service Hero */}
      <section className="bg-white border-b border-slate-200 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Mission, Headlines, and Primary Action Buttons */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-blue-700" aria-hidden="true" />
                <span>Municipal Digital Services Platform • Official Civic Portal</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Report a municipal issue. Follow transparent field resolution.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                CivicPulse connects citizens directly with city public works departments. Submit a photograph of potholes, water leaks, defective streetlights, or waste problems to initiate instant AI routing and real-time tracked field repair.
              </p>

              {/* Primary Call-to-Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/report"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition shadow-subtle focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  <span>Report a Civic Issue Now</span>
                </Link>

                <Link
                  to="/track"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
                >
                  <FileSearch className="w-4 h-4 text-slate-600" aria-hidden="true" />
                  <span>Track Complaint by PIN</span>
                </Link>
              </div>

              {/* Service Trust Guarantees */}
              <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Encrypted evidence storage in private cloud buckets</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Verified resolution with photographic crew proof</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Accountable service level targets across 4 departments</span>
                </div>
              </div>
            </div>

            {/* Right Column: Fast Track Portal Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-50 border border-slate-300 rounded-md p-6 sm:p-7 shadow-panel space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                  <div className="w-8 h-8 rounded bg-gov-navy text-white flex items-center justify-center">
                    <Search className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Track an Existing Ticket</h2>
                    <p className="text-xs text-slate-500">Live jurisdictional inspection status</p>
                  </div>
                </div>

                <form onSubmit={handleQuickTrack} className="space-y-4">
                  <div>
                    <label
                      htmlFor="hero-ref"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Complaint Reference Number
                    </label>
                    <input
                      id="hero-ref"
                      type="text"
                      placeholder="e.g. REF-20261010-8A4F2C"
                      value={trackRef}
                      onChange={(e) => setTrackRef(e.target.value)}
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
                      htmlFor="hero-pin"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      6-Character Tracking PIN
                    </label>
                    <input
                      id="hero-pin"
                      type="text"
                      placeholder="e.g. K8F2X9"
                      value={trackPin}
                      onChange={(e) => setTrackPin(e.target.value)}
                      required
                      maxLength={8}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                      className="w-full min-h-[44px] px-3 py-2 rounded-md border border-slate-300 text-sm font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 touch-manipulation"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Issued upon submission to prevent unauthorized snooping on your municipal report.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full min-h-[48px] py-3 rounded-md text-sm font-semibold text-white bg-gov-navy hover:bg-slate-800 active:bg-slate-900 transition flex items-center justify-center gap-2 shadow-subtle touch-manipulation"
                  >
                    <span>Check Live Resolution Progress</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>

                <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-200">
                  Registered citizen?{" "}
                  <Link to="/dashboard" className="text-blue-700 font-semibold hover:underline">
                    Sign in to view all complaints
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: How CivicPulse Works (4-Step Process) */}
      <section className="py-14 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
              Public Service Procedure
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Transparent Municipal Resolution in Four Steps
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              From the moment you take a photograph to verified closure, every step is recorded in an immutable audit trail.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="bg-white p-6 rounded-md border border-slate-200 shadow-subtle flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-400">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-4 rounded bg-white border border-slate-200 text-xs text-slate-700 flex items-start gap-3 shadow-subtle">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong>Computer Vision Safety Guarantee:</strong> Artificial intelligence provides preliminary image routing assistance. Low-confidence predictions (below 80% certainty) are automatically held in an administrative verification queue so no report is misallocated.
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Supported Civic Issue Categories Grid */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
              Municipal Jurisdictions
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Supported Civic Problem Categories
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Each civic category maps directly to specialized municipal field crews with established service response benchmarks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((c, idx) => {
              const Icon = c.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-50 p-5 rounded-md border border-slate-200 shadow-subtle flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded bg-white text-slate-800 flex items-center justify-center border border-slate-200 shadow-subtle">
                      <Icon className="w-5 h-5 text-blue-700" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                      <p className="text-xs text-blue-700 font-semibold mt-0.5">
                        {c.dept}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Code: <strong className="font-mono text-slate-700">{c.code}</strong></span>
                    <span className="text-emerald-700 font-semibold">{c.sla}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 6: Municipal Reporting Guidelines */}
      <section className="py-14 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                Citizen Quality Guidelines
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Before Submitting Your Report
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                High-quality citizen submissions allow our AI classification model to route tickets with 98% accuracy and help field engineers reach the location without telephone callbacks.
              </p>

              <div className="space-y-3 pt-2 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 bg-white rounded border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Clear, Well-Lit Photographs:</strong> Capture the defect in daylight from a safe distance of 3-5 meters showing both the defect and nearby surroundings.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Accurate Physical Location:</strong> Allow GPS geolocation or provide street name, house number, and prominent landmarks (e.g. opposite City Bank).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded border border-slate-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Public Property Only:</strong> CivicPulse resolves defects on municipal streets and public infrastructure. Private residential plumbing or private property disputes are outside municipal jurisdiction.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/guidelines"
                  className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>Read Full Comprehensive Reporting Manual</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white p-6 rounded-md border border-slate-200 shadow-panel space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 uppercase tracking-wider">
                  Photo Verification Standards
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                    <span className="font-bold text-emerald-900 block mb-1">
                      Recommended Photograph Format:
                    </span>
                    <ul className="list-disc pl-4 text-emerald-800 space-y-0.5">
                      <li>Wide-angle view showing pothole depth and road lane context</li>
                      <li>Water leak showing pooling volume and source pipe</li>
                      <li>Streetlight pole showing fixture head and pole identification plate</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <span className="font-bold text-red-900 block mb-1">
                      Unacceptable Photographs:
                    </span>
                    <ul className="list-disc pl-4 text-red-800 space-y-0.5">
                      <li>Blurry, nighttime, or extreme close-ups without background context</li>
                      <li>Screenshots of social media posts or third-party web photos</li>
                      <li>Photographs showing faces or personal private identification</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: Status & Lifecycle Transparency Guide */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
              Accountability Standards
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Official Status Definitions & Progression
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              CivicPulse enforces an audited finite state machine. A complaint cannot be skipped, deleted, or closed without verified evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statusDefinitions.map((s) => (
              <div key={s.status} className="p-4 rounded-md border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${s.color}`}>
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/status-definitions"
              className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              <span>View Full Legal Status Progression Rules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 8: Municipal Department Directory */}
      <section className="py-14 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                Public Directory
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Municipal Authorities & Escalation
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-2xl">
                Browse our four principal operational divisions, their jurisdictional mandates, and verified department contacts.
              </p>
            </div>
            <Link
              to="/departments"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shrink-0 shadow-subtle"
            >
              View Detailed Directory
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  CODE: ROAD
                </span>
                <span className="text-xs text-slate-500">Public Works Division</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Road and Highway Authority</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Maintains municipal asphalt thoroughfares, concrete sidewalks, lane markings, storm drainage covers, and traffic calming speed bumps.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 font-mono">
                Official Contact: road.authority@smartcity.gov
              </div>
            </div>

            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  CODE: WATR
                </span>
                <span className="text-xs text-slate-500">Hydraulic Engineering Division</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Water and Sewerage Department</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Manages potable water distribution pipelines, reservoir pressure, municipal valves, sewage treatment connections, and storm drains.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 font-mono">
                Official Contact: water.department@smartcity.gov
              </div>
            </div>

            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  CODE: INFR
                </span>
                <span className="text-xs text-slate-500">Electrical Engineering Division</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Infrastructure & Street Lighting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Supervises municipal LED street luminaires, underground utility ducting, electrical junction boxes, and smart city traffic sensors.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 font-mono">
                Official Contact: infrastructure@smartcity.gov
              </div>
            </div>

            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  CODE: SANI
                </span>
                <span className="text-xs text-slate-500">Solid Waste Management Division</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Sanitation and Solid Waste</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Executes daily municipal refuse collection, bulk waste transport, dumpster sterilization, and public park sanitary maintenance.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 font-mono">
                Official Contact: sanitation@smartcity.gov
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9: Public Trust, Data Privacy & Security Commitments */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gov-navy text-white rounded-lg p-8 sm:p-10 shadow-panel">
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                <span>Government Digital Standards</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Our Security, Privacy and Data Governance Commitments
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                CivicPulse adheres to strict municipal public-record security baselines. Evidence is cryptographically shielded, access is role-segregated, and personal identity data is never commodified.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 mt-6 border-t border-slate-700 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm">Private Evidence Isolation</h4>
                <p className="text-slate-300 leading-relaxed">
                  Photographs are preserved in private Supabase Storage buckets, requiring authorized temporary HMAC-signed tokens for authorized viewing.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm">PostgreSQL Audit Trails</h4>
                <p className="text-slate-300 leading-relaxed">
                  Every state update, officer note, and AI override is committed to immutable PostgreSQL ledger rows with client IP address and timestamp.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm">WCAG 2.2 AA Accessibility</h4>
                <p className="text-slate-300 leading-relaxed">
                  Designed for all citizens: high-contrast typography, screen reader skip links, semantic ARIA roles, and keyboard navigation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: Frequently Asked Questions (FAQ) */}
      <section className="py-14 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
              Citizen Knowledge Base
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto">
              Find immediate answers regarding reporting procedures, tracking PINs, and resolution timelines.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-md border border-slate-200 shadow-subtle overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full text-left px-5 py-4 min-h-[48px] flex items-center justify-between gap-4 font-semibold text-sm text-slate-900 hover:bg-slate-50 active:bg-slate-100 transition touch-manipulation"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-blue-700" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <Link
              to="/faq"
              className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Browse All Questions in our Help Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 11: Municipal Assistance & Support Contact */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-50 border border-slate-200 rounded-md p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-subtle">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                Citizen Assistance Helpline
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Need Help Submitting a Complaint?
              </h2>
              <p className="text-xs text-slate-600 max-w-xl">
                Municipal support specialists are on call Monday through Saturday, 08:00 to 18:00 to assist senior citizens, provide phone accessibility, and answer tracking inquiries.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Link
                to="/contact"
                className="px-5 py-2.5 rounded text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 transition shadow-subtle flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Contact Municipal Support</span>
              </Link>
              <Link
                to="/accessibility"
                className="px-5 py-2.5 rounded text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition"
              >
                Accessibility Services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
