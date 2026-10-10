import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Cpu, ShieldAlert } from "lucide-react";

export const DisclaimerPage: React.FC = () => {
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
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
            Legal & Operational Notices
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Official Municipal Disclaimer & Disclosures
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            CivicPulse Regulatory Notice • Municipal Operations Governance
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-md border border-slate-200 shadow-panel space-y-6 text-xs text-slate-700 leading-relaxed">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-sm">Critical Life Safety Exclusion</p>
              <p className="mt-0.5 text-xs text-amber-800">
                CivicPulse is strictly a <strong>non-emergency</strong> municipal ticketing platform. In cases of active electrical fires, structural building collapse, severe natural disasters, or gas leaks, immediately dial <strong>911</strong> or local emergency dispatch services. Do not submit an online form.
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Automated AI Classification Disclosure
            </h2>
            <p>
              CivicPulse employs machine learning (EfficientNetV2-S deep neural network) to analyze defect photographs and provide automated department routing suggestions. While trained on thousands of municipal defect images, classification results are heuristic and advisory. Municipal supervisory officers retain absolute discretion to review, reassign, or override automated recommendations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Accuracy of Geolocation and Physical Addresses
            </h2>
            <p>
              Location data obtained via browser geolocation APIs relies on device GPS, cellular towers, and Wi-Fi triangulations which may exhibit inaccuracy in dense urban canyons. The complainant is responsible for reviewing and confirming the physical road or landmark name prior to submission.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              3. Limitation of Municipal Liability
            </h2>
            <p>
              Neither the municipality, its officers, contractors, nor technology providers shall be liable for indirect, incidental, or consequential damages resulting from delays in physical repair execution, extreme weather constraints, or technical communication outages.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
