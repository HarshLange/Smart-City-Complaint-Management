import React from "react";
import { AlertCircle, Droplet, Lightbulb, Trash2, Truck } from "lucide-react";
import { CivicCategory } from "../../types";
import { cn } from "../../utils/cn";

interface Props {
  category: CivicCategory;
  className?: string;
  showIcon?: boolean;
}

const categoryConfig: Record<
  CivicCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  water_leak: {
    label: "Water Leak",
    icon: Droplet,
    color: "text-blue-800 bg-blue-50/80 border-blue-200",
  },
  streetlight_failure: {
    label: "Streetlight Failure",
    icon: Lightbulb,
    color: "text-amber-800 bg-amber-50/80 border-amber-200",
  },
  pothole: {
    label: "Pothole",
    icon: Truck,
    color: "text-orange-800 bg-orange-50/80 border-orange-200",
  },
  damaged_road: {
    label: "Road Damage",
    icon: Truck,
    color: "text-slate-800 bg-slate-100 border-slate-300",
  },
  garbage: {
    label: "Garbage & Waste",
    icon: Trash2,
    color: "text-emerald-800 bg-emerald-50/80 border-emerald-200",
  },
  other: {
    label: "General Issue",
    icon: AlertCircle,
    color: "text-slate-700 bg-slate-50 border-slate-200",
  },
};

export const CategoryBadge: React.FC<Props> = ({ category, className, showIcon = true }) => {
  const config = categoryConfig[category] || categoryConfig.other;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border tracking-tight",
        config.color,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
};
