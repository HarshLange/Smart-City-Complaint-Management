import React from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  FileCheck2,
  FileSearch,
  FileText,
  HelpCircle,
  Lock,
  PhoneCall,
  Shield,
  ShieldAlert,
} from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gov-navy text-slate-300 border-t border-slate-700/80 mt-auto font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 lg:py-12 pb-safe">
        {/* 4 Structured Municipal Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Citizen Services */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded bg-blue-700 flex items-center justify-center border border-blue-500/30">
                <Building2 className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className="font-bold text-base tracking-tight">CivicPulse</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Official municipal civic issue reporting, automated computer vision routing, and transparent field repair tracking portal.
            </p>
            <ul className="space-y-2 text-xs pt-1">
              <li>
                <Link to="/report" className="hover:text-white transition py-1 inline-block">
                  • Report a Public Issue
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-white transition py-1 inline-block">
                  • Track Status by PIN
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition py-1 inline-block">
                  • Citizen Case Dashboard
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition py-1 inline-block">
                  • Municipal Officer Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Municipal Departments & Jurisdictions */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Municipal Authorities
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <Link to="/departments" className="hover:text-white transition block py-0.5">
                  <strong className="text-white">Road Authority (PWD):</strong> Potholes, asphalt failures, road subsidence
                </Link>
              </li>
              <li>
                <Link to="/departments" className="hover:text-white transition block py-0.5">
                  <strong className="text-white">Water Department:</strong> Pipeline bursts, water leaks, storm drainage
                </Link>
              </li>
              <li>
                <Link to="/departments" className="hover:text-white transition block py-0.5">
                  <strong className="text-white">Infrastructure:</strong> Non-functional streetlights, wire hazards
                </Link>
              </li>
              <li>
                <Link to="/departments" className="hover:text-white transition block py-0.5">
                  <strong className="text-white">Sanitation:</strong> Waste accumulation, dumpster overflow
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Help, Guidelines & FAQs */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Help & Information
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/guidelines" className="hover:text-white transition py-1 inline-block">
                  • Municipal Reporting Guidelines
                </Link>
              </li>
              <li>
                <Link to="/status-definitions" className="hover:text-white transition py-1 inline-block">
                  • Status Progression Definitions
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition py-1 inline-block">
                  • Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-white transition py-1 inline-block">
                  • CivicPulse Help Center
                </Link>
              </li>
              <li>
                <Link to="/accessibility" className="hover:text-white transition py-1 inline-block">
                  • Accessibility Statement (WCAG 2.2 AA)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Urgent Hazards & Municipal Contact */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Emergency Notice</span>
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              For immediate life-safety emergencies, collapsed bridges, live wires sparking, or flash floods, dial <strong>911</strong> or <strong>112</strong> immediately.
            </p>
            <div className="pt-1 space-y-2 text-xs text-slate-300">
              <p>
                <strong className="text-white">Helpline:</strong> +1 (800) 555-CIVIC (08:00 - 18:00)
              </p>
              <p>
                <strong className="text-white">Email:</strong> support@smartcity.gov
              </p>
              <Link
                to="/contact"
                className="inline-block min-h-[44px] sm:min-h-0 py-2 sm:py-0 text-xs text-blue-400 hover:text-blue-300 underline font-semibold"
              >
                Municipal Contact Directory →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Security Ribbon */}
        <div className="mt-10 pt-6 border-t border-slate-700/80 text-[11px] text-slate-400 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-center md:text-left">© {new Date().getFullYear()} CivicPulse — Smart City Complaint Management System. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <Link to="/privacy" className="hover:text-white transition py-1 px-1">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-white transition py-1 px-1">
              Terms of Service
            </Link>
            <span>•</span>
            <Link to="/disclaimer" className="hover:text-white transition py-1 px-1">
              Legal Disclaimer
            </Link>
            <span>•</span>
            <Link to="/accessibility" className="hover:text-white transition py-1 px-1">
              Accessibility
            </Link>
            <span>•</span>
            <Link to="/status-definitions" className="hover:text-white transition py-1 px-1">
              Status Rules
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
