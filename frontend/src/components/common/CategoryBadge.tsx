import React from "react";
import { Droplet, HelpCircle, Lightbulb, Trash2, Truck } from "lucide-react";
import { CivicCategory } from "../../types";
import { cn } from "../../utils/cn";

interface Props {
  category: CivicCategory;
  className?: string;
}

const categoryConfig: Record<
  CivicCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  water_leak: {
    label: "Water Leak",
    icon: Droplet,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  streetlight_failure: {
    label: "Streetlight",
    icon: Lightbulb,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  pothole: {
    label: "Pothole",
    icon: Truck,
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  damaged_road: {
    label: "Damaged Road",
    icon: Truck,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  garbage: {
    label: "Waste & Garbage",
    icon: Trash2,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  other: {
    label: "General Issue",
    icon: HelpCircle,
    color: "text-slate-600 bg-slate-50 border-slate-200",
  },
};

export const CategoryBadge: React.FC<Props> = ({ category, className }) => {
  const config = categoryConfig[category] || categoryConfig.other;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border",
        config.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};
