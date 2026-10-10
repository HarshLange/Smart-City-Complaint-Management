import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Eye, Keyboard, ShieldCheck } from "lucide-react";

export const AccessibilityPage: React.FC = () => {
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
            Digital Inclusion Standards
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            CivicPulse Accessibility Statement
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Conforming to World Wide Web Consortium (W3C) Web Content Accessibility Guidelines (WCAG) 2.2 Level AA.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-md border border-slate-200 shadow-panel space-y-6 text-xs text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Our Municipal Digital Inclusion Commitment
            </h2>
            <p>
              The City believes digital municipal services must be equally accessible to all individuals, including citizens with visual, auditory, motor, or cognitive disabilities. CivicPulse is designed and continually tested to comply with WCAG 2.2 Level AA criteria and Section 508 electronic accessibility mandates.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Core Accessibility Features Implemented
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="font-bold text-slate-900 block mb-1">Keyboard Accessibility</span>
                <p className="text-slate-600 text-[11px]">
                  All interactive controls, forms, status lookups, and navigation dialogs are fully operable via keyboard (Tab, Enter, Escape, Arrow keys) with persistent visible focus outlines.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="font-bold text-slate-900 block mb-1">High-Contrast Color Palettes</span>
                <p className="text-slate-600 text-[11px]">
                  All text elements exceed the minimum 4.5:1 contrast ratio against light and dark backgrounds (WCAG AAA target achieved for body typography).
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="font-bold text-slate-900 block mb-1">Screen Reader Compatibility</span>
                <p className="text-slate-600 text-[11px]">
                  Equipped with semantic HTML5 elements, ARIA labels, accessible live status alerts, and skip-to-content bypass navigation links.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="font-bold text-slate-900 block mb-1">Respect for Reduced Motion</span>
                <p className="text-slate-600 text-[11px]">
                  CSS motion queries strictly honor the operating system <code className="font-mono text-blue-700">prefers-reduced-motion</code> preference, eliminating non-essential transitions.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              3. Telephonic Assistance for Screenless Citizens
            </h2>
            <p>
              Citizens who require voice assistance or cannot use screen interfaces may file reports directly through our dedicated accessibility telephone service:{" "}
              <strong className="text-slate-900">+1 (800) 555-2484</strong> (TTY/TDD enabled).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
