import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Droplet, Lightbulb, Mail, Phone, Trash2, Truck } from "lucide-react";

export const DepartmentDirectoryPage: React.FC = () => {
  const departments = [
    {
      code: "ROAD",
      name: "Road & Highway Authority (PWD)",
      division: "Civil Infrastructure & Public Works",
      email: "road.authority@smartcity.gov",
      phone: "+1 (800) 555-ROAD",
      icon: Truck,
      sla: "24-48 Hours",
      jurisdiction: [
        "Municipal asphalt road surfaces and potholes",
        "Pedestrian footpaths, concrete curbs, and walkways",
        "Speed breakers and road signage visibility",
        "Bridge approach expansion joints and storm drainage covers on roadways",
      ],
    },
    {
      code: "WATR",
      name: "Water Resources & Sewerage Department",
      division: "Hydraulic & Environmental Engineering",
      email: "water.department@smartcity.gov",
      phone: "+1 (800) 555-WATR",
      icon: Droplet,
      sla: "12-24 Hours",
      jurisdiction: [
        "Potable municipal water distribution pipelines and main bursts",
        "Water contamination or turbidity complaints",
        "Overflowing stormwater drains and roadside sewer blockages",
        "Damaged or missing manhole covers (emergency priority dispatch)",
      ],
    },
    {
      code: "INFR",
      name: "Infrastructure & Electrical Engineering",
      division: "Electrical Utilities & Smart City Grid",
      email: "infrastructure@smartcity.gov",
      phone: "+1 (800) 555-GRID",
      icon: Lightbulb,
      sla: "24-36 Hours",
      jurisdiction: [
        "LED street lighting outages and darkened public transit corridors",
        "Damaged electrical feeder pillars and open service junction boxes",
        "Low-hanging or severed municipal telecom/utility wiring",
        "Smart city traffic signals, timer malfunctions, and surveillance poles",
      ],
    },
    {
      code: "SANI",
      name: "Sanitation & Solid Waste Management",
      division: "Public Health & Waste Services",
      email: "sanitation@smartcity.gov",
      phone: "+1 (800) 555-SANI",
      icon: Trash2,
      sla: "12-24 Hours",
      jurisdiction: [
        "Overflowing community dumpsters and uncollected street litter",
        "Unauthorized roadside debris dumps and construction waste",
        "Animal carcass disposal and biohazard sanitation",
        "Sanitary cleansing of public plazas, pedestrian subways, and parks",
      ],
    },
  ];

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
            Public Authorities Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Municipal Departments & Jurisdictions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative directory of municipal departments, jurisdictional responsibilities, and operational response SLAs.
          </p>
        </div>

        <div className="space-y-6">
          {departments.map((dept) => {
            const Icon = dept.icon;
            return (
              <div
                key={dept.code}
                className="bg-white p-5 sm:p-6 rounded-md border border-slate-200 shadow-subtle space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                          {dept.code}
                        </span>
                        <h2 className="text-base font-bold text-slate-900">{dept.name}</h2>
                      </div>
                      <span className="text-[11px] text-slate-500">{dept.division}</span>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded w-fit">
                    Target SLA: {dept.sla}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                    Jurisdictional Responsibilities:
                  </span>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    {dept.jurisdiction.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-blue-700 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
                  <a href={`mailto:${dept.email}`} className="flex items-center gap-1.5 min-h-[44px] sm:min-h-0 text-slate-700 hover:text-blue-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-[11px]">{dept.email}</span>
                  </a>
                  <a href={`tel:${dept.phone}`} className="flex items-center gap-1.5 min-h-[44px] sm:min-h-0 text-slate-700 hover:text-blue-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-[11px]">{dept.phone}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
