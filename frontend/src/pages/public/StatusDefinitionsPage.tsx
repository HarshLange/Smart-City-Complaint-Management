import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, FileCheck2, GitBranch, RotateCcw, Shield } from "lucide-react";

export const StatusDefinitionsPage: React.FC = () => {
  const transitions = [
    {
      current: "SUBMITTED",
      next: "UNDER_REVIEW, ASSIGNED",
      trigger: "Intake gateway validation & AI confidence check",
    },
    {
      current: "UNDER_REVIEW",
      next: "ASSIGNED, CLOSED",
      trigger: "Supervisory department officer inspection or administrative rejection",
    },
    {
      current: "ASSIGNED",
      next: "IN_PROGRESS, UNDER_REVIEW",
      trigger: "Field engineer dispatches repair crew or returns ticket for clarification",
    },
    {
      current: "IN_PROGRESS",
      next: "RESOLVED, UNDER_REVIEW",
      trigger: "Physical repair completed with photo evidence, or blocked due to weather",
    },
    {
      current: "RESOLVED",
      next: "CLOSED, REOPENED",
      trigger: "Complainant verification sign-off or citizen reopening request",
    },
    {
      current: "CLOSED",
      next: "REOPENED",
      trigger: "Administrative audit or citizen appeal within 14 days",
    },
    {
      current: "REOPENED",
      next: "ASSIGNED, IN_PROGRESS",
      trigger: "Supervisory reassignment for field remediation",
    },
  ];

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded border border-slate-200 shadow-subtle transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Return to Overview</span>
          </Link>
        </div>

        <div className="border-b border-slate-200 pb-4">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
            Lifecycle Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Official Ticket Status Definitions & Lifecycle Rules
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Understanding the deterministic state machine governing all municipal reports in CivicPulse.
          </p>
        </div>

        {/* State Definitions */}
        <div className="space-y-4 text-xs text-slate-700">
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-subtle space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Status Definitions
            </h2>

            <div className="space-y-3">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded">
                <span className="font-bold text-blue-900 uppercase block">SUBMITTED</span>
                <p className="text-blue-800 text-[11px] mt-0.5">
                  The initial state. The report is recorded in the PostgreSQL database with an immutable timestamp, reference number, and plain tracking PIN hash. The AI classification model processes the image attachment.
                </p>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded">
                <span className="font-bold text-amber-900 uppercase block">UNDER_REVIEW</span>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Triggered when AI classification confidence is below 80%, when contradictory information is detected, or when cross-department jurisdictional overlap requires administrative human officer determination.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded">
                <span className="font-bold text-indigo-900 uppercase block">ASSIGNED</span>
                <p className="text-indigo-800 text-[11px] mt-0.5">
                  The complaint has been accepted by the responsible municipal authority (PWD, Water, Infrastructure, or Sanitation) and assigned to a designated field operations officer.
                </p>
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded">
                <span className="font-bold text-purple-900 uppercase block">IN_PROGRESS</span>
                <p className="text-purple-800 text-[11px] mt-0.5">
                  Field repair teams have been dispatched to the physical site. Work crews are actively repairing the pothole, welding the pipeline, installing replacement LED street fixtures, or clearing waste.
                </p>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded">
                <span className="font-bold text-emerald-900 uppercase block">RESOLVED</span>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Field repairs have concluded. The field officer has uploaded photographic proof of completion to the secure case file and provided closure notes. The citizen is notified.
                </p>
              </div>

              <div className="p-3 bg-slate-100 border border-slate-300 rounded">
                <span className="font-bold text-slate-900 uppercase block">CLOSED</span>
                <p className="text-slate-700 text-[11px] mt-0.5">
                  Final state. Either confirmed satisfactory by the reporting citizen, or archived administratively after the 14-day statutory verification window.
                </p>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded">
                <span className="font-bold text-rose-900 uppercase block">REOPENED</span>
                <p className="text-rose-800 text-[11px] mt-0.5">
                  Requested by the complainant or administrator due to recurring defects or deficient workmanship. The ticket is immediately prioritized for supervisor inspection.
                </p>
              </div>
            </div>
          </div>

          {/* Transition Matrix Table */}
          <div className="bg-white rounded-md border border-slate-200 shadow-panel overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Server-Enforced State Transition Matrix
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                CivicPulse validates every transition against this matrix on the server. Unauthorized status changes are strictly blocked.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table text-xs">
                <thead>
                  <tr>
                    <th scope="col">Starting State</th>
                    <th scope="col">Authorized Next States</th>
                    <th scope="col">Operational Trigger / Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transitions.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="font-mono font-bold text-slate-800">{t.current}</td>
                      <td className="font-mono text-blue-700 font-semibold">{t.next}</td>
                      <td className="text-slate-600">{t.trigger}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
