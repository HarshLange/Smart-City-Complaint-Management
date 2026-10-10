import React from "react";
import { Landmark } from "lucide-react";

export const OfficialBanner: React.FC = () => {
  return (
    <div className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[11px] py-1 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium">
          <Landmark className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
          <span>Municipal Issue Reporting & Resolution Portal</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-slate-500">
          <span>Official Public Service</span>
          <span>•</span>
          <span>Automated Department Dispatch</span>
        </div>
      </div>
    </div>
  );
};
