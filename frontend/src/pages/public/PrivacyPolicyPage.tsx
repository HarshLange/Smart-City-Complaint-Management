import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, Shield, ShieldCheck } from "lucide-react";

export const PrivacyPolicyPage: React.FC = () => {
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
            Legal & Public Records Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            CivicPulse Privacy Policy & Data Protection
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Last Updated: October 2026 • Municipal Digital Standards Policy Version 2.4
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-md border border-slate-200 shadow-panel space-y-6 text-xs text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Statutory Authority and Purpose
            </h2>
            <p>
              CivicPulse operates under municipal digital governance mandates to collect, process, and route public civic grievance reports to authorized city engineering and sanitation departments. We are committed to transparency, data minimization, and protecting citizen privacy in digital public interactions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Evidence Photographs:</strong> Images uploaded by citizens showing civic infrastructure defects. Metadata such as EXIF capture dates and approximate GPS coordinates may be extracted with device consent to pinpoint physical repair locations.
              </li>
              <li>
                <strong>Location Data:</strong> Street addresses, postal codes, and GPS latitude/longitude coordinates provided for defect geolocation.
              </li>
              <li>
                <strong>Complainant Contact Information:</strong> Full name, verified email address, and optional phone number to provide status progression alerts.
              </li>
              <li>
                <strong>Technical and Network Telemetry:</strong> Client IP address, browser user-agent, and cryptographic timestamps recorded in immutable audit logs to protect the system against automated denial-of-service and fraudulent spam.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              3. Storage and Cryptographic Security
            </h2>
            <p>
              All evidence photographs are isolated in private, encrypted cloud storage buckets. Access URLs are generated dynamically using short-lived HMAC-signed cryptographic tokens (valid up to 60 minutes) and require active session authorization. Plaintext tracking PINs are never stored; only salted SHA-256 password-grade hashes are preserved in our PostgreSQL database.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              4. Prohibition of Commercial Data Exploitation
            </h2>
            <p>
              Under no circumstances does CivicPulse sell, lease, or monetize citizen personal data, behavioral telemetry, or photographs to third-party data brokers or marketing intermediaries. Data is accessed solely by authorized municipal personnel for public service operations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              5. Citizen Data Rights and Retention
            </h2>
            <p>
              Citizens maintain the right to inspect complaints filed under their verified account, request corrections to misattributed reports, or request archival. Operational case records are retained in accordance with municipal statutory audit requirements (minimum 36 months).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              6. Contact Data Protection Officer
            </h2>
            <p>
              For inquiries regarding data privacy compliance, contact the Municipal Data Protection Officer at:{" "}
              <a href="mailto:privacy@smartcity.gov" className="text-blue-700 hover:underline font-mono">
                privacy@smartcity.gov
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
