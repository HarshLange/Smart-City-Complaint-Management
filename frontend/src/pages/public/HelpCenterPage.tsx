import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  FileSearch,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  PhoneCall,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

export const HelpCenterPage: React.FC = () => {
  const guides = [
    {
      title: "How to File a Civic Issue Report",
      desc: "Step-by-step guidance on capturing photographs, setting GPS coordinates, and selecting relevant category details.",
      link: "/guidelines",
      icon: Camera,
    },
    {
      title: "Understanding Status Transitions",
      desc: "Learn what each status from SUBMITTED to RESOLVED means and what field crews are doing at each stage.",
      link: "/status-definitions",
      icon: FileSearch,
    },
    {
      title: "Requesting a Ticket Reopening",
      desc: "If repairs were incomplete or the pothole/leak recurred, follow our official procedure to reopen the case file.",
      link: "/status-definitions",
      icon: RotateCcw,
    },
    {
      title: "Municipal Authorities Directory",
      desc: "Browse operational divisions: Road Authority (PWD), Water Resources, Electrical Grid, and Sanitation.",
      link: "/departments",
      icon: BookOpen,
    },
  ];

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
            Public Knowledge & Guidance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            CivicPulse Citizen Help Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official instructions, procedural walkthroughs, and answers for municipal public services.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {guides.map((g, idx) => {
            const Icon = g.icon;
            return (
              <div
                key={idx}
                className="bg-white p-5 sm:p-6 rounded-md border border-slate-200 shadow-subtle flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{g.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{g.desc}</p>
                </div>
                <div>
                  <Link
                    to={g.link}
                    className="text-xs font-semibold text-blue-700 hover:underline min-h-[44px] sm:min-h-0 inline-flex items-center gap-1"
                  >
                    <span>Read Guidance</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Helpline Contact Card */}
        <div className="bg-white p-5 sm:p-6 rounded-md border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-bold text-slate-900">Need Personalized Assistance?</h3>
            <p className="text-xs text-slate-600">
              Our citizen helpdesk is available Monday through Saturday from 08:00 to 18:00.
            </p>
          </div>
          <Link
            to="/contact"
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 sm:py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-subtle transition shrink-0 flex items-center justify-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
