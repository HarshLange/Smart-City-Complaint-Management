import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Send,
} from "lucide-react";

export const ContactPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
            Public Service Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Municipal Contact & Citizen Support
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Get in touch with municipal dispatchers, department liaisons, and accessibility officers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Direct Phone and Physical Address */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-md border border-slate-200 shadow-subtle space-y-4 text-xs text-slate-700">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                Civic Center Headquarters
              </h2>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">Municipal Secretariat</strong>
                  <p className="text-slate-600">Civic Square, Central Avenue, City Hall</p>
                  <p className="text-slate-600">Smart City, SC 400001</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">Public Operating Hours</strong>
                  <p className="text-slate-600">Monday - Friday: 08:30 - 17:30</p>
                  <p className="text-slate-600">Saturday: 09:00 - 13:00 (Emergency Desk Open 24/7)</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">Telephone Inquiries</strong>
                  <p className="font-mono text-slate-800">+1 (800) 555-CIVIC</p>
                  <p className="text-[11px] text-slate-500">Toll-free municipal general helpline</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">General Electronic Inquiries</strong>
                  <p className="font-mono text-slate-800">citizen.support@smartcity.gov</p>
                </div>
              </div>
            </div>

            {/* Emergency Hotline Alert Box */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-950">
                <PhoneCall className="w-4 h-4 text-amber-700" />
                <span>Emergency Public Hazards</span>
              </span>
              <p className="text-[11px] text-amber-800">
                For live electrical wires touching water, major gas line leaks, or road collapse, dial <strong>911</strong> immediately.
              </p>
            </div>
          </div>

          {/* Right Column: Citizen Inquiry Form */}
          <div className="md:col-span-7 bg-white p-6 sm:p-7 rounded-md border border-slate-200 shadow-panel">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Submit Citizen General Inquiry
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Have a question about municipal boundaries, bylaws, or portal procedures? Our staff responds within 1 business day.
            </p>

            {submitted ? (
              <div className="p-6 text-center space-y-3 bg-emerald-50 rounded border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-emerald-950">Inquiry Received</h3>
                <p className="text-xs text-emerald-800">
                  Thank you for contacting municipal services. Your inquiry has been routed to our citizen liaison desk.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setName("");
                    setEmail("");
                    setSubject("");
                    setMessage("");
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 rounded hover:bg-emerald-50"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Eleanor Rigby"
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Subject / Department Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Question regarding Road Authority pothole jurisdiction"
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Inquiry Details *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details regarding your municipal inquiry..."
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold transition flex items-center justify-center gap-2 shadow-subtle"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
