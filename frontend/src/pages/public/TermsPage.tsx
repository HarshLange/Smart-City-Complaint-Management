import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Shield, ShieldAlert } from "lucide-react";

export const TermsPage: React.FC = () => {
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
            Public Service Terms
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            CivicPulse Terms of Public Service
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Effective: October 2026 • Municipal Digital Gateway Regulations
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-md border border-slate-200 shadow-panel space-y-6 text-xs text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Acceptance of Municipal Service Terms
            </h2>
            <p>
              By accessing or submitting information through the CivicPulse municipal portal, you agree to comply with these Terms of Public Service and all applicable municipal bylaws and public records statutes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Permitted and Authorized Submissions
            </h2>
            <p>
              CivicPulse is designated exclusively for reporting physical infrastructure defects on public municipal property, including potholes, water supply pipe leaks, damaged streetlighting, and public sanitation litter.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              3. Strictly Prohibited Activities
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Submitting false, fabricated, or fraudulent hazard reports.</li>
              <li>Uploading photographs containing explicit, abusive, harassing, or defamatory imagery.</li>
              <li>Attempting to upload executable scripts, malicious binaries, or bypassing rate limits.</li>
              <li>Misusing tracking PINs or attempting brute-force enumeration of municipal case records.</li>
              <li>Reporting private residential civil disputes outside municipal infrastructure authority.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              4. Response Benchmarks and Department Discretion
            </h2>
            <p>
              While municipal departments aim to respond within designated target windows (e.g. 24-48 hours for road hazards), response timelines may vary depending on emergency weather events, material requisitions, and public safety priorities. Submission of a complaint does not constitute a legally binding contractual repair guarantee.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              5. Account Termination and Sanctions
            </h2>
            <p>
              The municipality reserves the right to deactivate accounts, reject submissions, or report persistent malicious spam submissions to law enforcement authorities under public mischief regulations.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
