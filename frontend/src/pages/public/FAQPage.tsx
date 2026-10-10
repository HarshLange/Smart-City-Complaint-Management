import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, HelpCircle, Search } from "lucide-react";

export const FAQPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const allFaqs = [
    {
      category: "Reporting & Submission",
      q: "Can I submit an issue without creating an account?",
      a: "Yes. You can report an issue using guest submission. You will receive a unique 16-character Reference Number and a 6-character Tracking PIN. Creating an account is recommended if you wish to track multiple tickets simultaneously in a personal dashboard.",
    },
    {
      category: "Reporting & Submission",
      q: "What file formats and image sizes are supported?",
      a: "CivicPulse accepts JPEG, PNG, and WebP images up to 10 Megabytes in size. Our backend validates magic bytes to prevent non-image files from being uploaded.",
    },
    {
      category: "Reporting & Submission",
      q: "What should I do if my GPS location does not match my real position?",
      a: "You can manually type your street name, house/building number, and prominent landmarks (e.g. 'Near Metro Pillar 42') in the address fields provided in the submission form.",
    },
    {
      category: "AI & Routing",
      q: "What happens if the AI predicts the wrong category?",
      a: "Our machine learning model provides routing assistance. If model confidence is below 80%, or if an issue contains unusual characteristics, it is routed to an administrative human review queue where a municipal officer verifies and corrects the category before dispatching crews.",
    },
    {
      category: "Tracking & PINs",
      q: "What if I lost my 6-character Tracking PIN?",
      a: "If you submitted while logged into a citizen account, all your tickets are permanently visible on your Citizen Dashboard without requiring the PIN. If you submitted as a guest, please contact municipal support with your approximate time, location, and description.",
    },
    {
      category: "Resolution & Evidence",
      q: "How do I know when the repair is actually completed?",
      a: "When a field crew resolves the issue, municipal procedures require them to photograph the finished repair and upload it as completion evidence. You can view this photograph directly in the complaint detail view.",
    },
    {
      category: "Resolution & Evidence",
      q: "Can I request that a complaint be reopened?",
      a: "Yes. Once marked Resolved, a 'Request Reopening' button appears on your complaint record. You may enter an explanation describing why the repair was insufficient, which routes the complaint back to supervisory review.",
    },
  ];

  const filteredFaqs = allFaqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.a.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            Knowledge Base
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Frequently Asked Questions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Answers to common citizen inquiries regarding the CivicPulse complaint resolution platform.
          </p>
        </div>

        {/* Search Filter Bar */}
        <div className="bg-white p-3 sm:p-3.5 rounded-md border border-slate-200 shadow-subtle">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 sm:top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search questions by keyword (e.g. tracking, PIN, photo, pothole)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
            />
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded border border-slate-200">
              No matching questions found for "{searchTerm}".
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-md border border-slate-200 shadow-subtle overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full text-left px-4 sm:px-5 py-3.5 sm:py-4 min-h-[48px] flex items-center justify-between gap-3 sm:gap-4 font-semibold text-sm text-slate-900 hover:bg-slate-50 transition"
                    aria-expanded={isOpen}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider block mb-0.5">
                        {faq.category}
                      </span>
                      <span>{faq.q}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-blue-700" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 pt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
