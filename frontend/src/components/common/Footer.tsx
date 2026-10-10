import React from "react";
import { Link } from "react-router-dom";
import { Building2, Shield, Lock, AlertTriangle } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gov-navy text-slate-300 border-t border-slate-700/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Identity & Mission */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded bg-blue-700 flex items-center justify-center border border-blue-500/30">
                <Building2 className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className="font-bold text-base tracking-tight">CivicPulse</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              A municipal civic issue reporting and complaint management portal. Citizen reports are automatically routed to responsible authorities with transparent status tracking.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1.5 w-fit">
              <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
              <span>Data Protection & Privacy Enforced</span>
            </div>
          </div>

          {/* Citizen Services Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Citizen Services
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/report" className="hover:text-white transition">
                  Report a Civic Issue
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-white transition">
                  Track a Complaint by PIN
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition">
                  Citizen Account Dashboard
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition">
                  Authorized Officer Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Municipal Departments */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Municipal Authorities
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li>• Road Authority (Potholes & Pavement)</li>
              <li>• Water Department (Pipeline Leaks & Drainage)</li>
              <li>• Infrastructure (Streetlights & Utilities)</li>
              <li>• Sanitation Department (Waste & Cleanliness)</li>
            </ul>
          </div>

          {/* Urgent Assistance Guidance */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Urgent Civic Hazards</span>
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              For immediate life safety, severe gas leaks, downed high-voltage wires, or flash flooding hazards, please do not use this online ticket system. Contact your local emergency dispatch or municipal emergency line directly.
            </p>
          </div>
        </div>

        {/* Bottom Metadata & Legal */}
        <div className="mt-8 pt-6 border-t border-slate-700 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} CivicPulse — Smart City Complaint Management System.</p>
          <div className="flex items-center gap-3">
            <span>Server-side Encryption</span>
            <span>•</span>
            <span>Privacy Preserved Tracking</span>
            <span>•</span>
            <span>Accessibility Standards Target: WCAG 2.2 AA</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
