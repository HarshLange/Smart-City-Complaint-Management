import React from "react";
import { Link } from "react-router-dom";
import { Building2, Shield, HeartHandshake, PhoneCall } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">CivicPulse</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              An automated, transparent civic complaint resolution platform powered by trained deep-learning vision models and deterministic department routing.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 rounded-md px-2.5 py-1.5 w-fit">
              <Shield className="w-3.5 h-3.5" />
              <span>Municipal Data Privacy Enforced</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Citizen Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/report" className="hover:text-white transition">
                  Report Civic Issue
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-white transition">
                  Track Complaint Progress
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition">
                  Citizen Dashboard
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition">
                  Officer & Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Departments */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Departments
            </h4>
            <ul className="space-y-2 text-xs">
              <li>Road Authority (Potholes, Asphalt)</li>
              <li>Water Department (Pipeline Leaks, Drainage)</li>
              <li>Infrastructure (Streetlights, Electrical)</li>
              <li>Garbage & Sanitation (Waste, Litter)</li>
            </ul>
          </div>

          {/* Emergency & Support */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Emergency Services
            </h4>
            <p className="text-xs leading-relaxed text-slate-400 mb-3">
              For immediate life safety, fire, or gas line hazards, do not use this portal. Contact municipal emergency dispatch immediately:
            </p>
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm bg-rose-950/40 border border-rose-900/60 rounded-md px-3 py-2 w-fit">
              <PhoneCall className="w-4 h-4" />
              <span>Emergency Dispatch: 911 / 112</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CivicPulse Smart City Management System. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400">Security & Encryption</span>
            <span>•</span>
            <span className="hover:text-slate-400">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-400">WCAG 2.1 AA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
