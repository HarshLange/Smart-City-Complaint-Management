import React from "react";
import { ComplaintStatus } from "../../types";
import { cn } from "../../utils/cn";

interface Props {
  status: ComplaintStatus;
  className?: string;
}

const statusConfig: Record<
  ComplaintStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  SUBMITTED: {
    label: "Submitted",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-600",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-600",
  },
  ASSIGNED: {
    label: "Assigned",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    dot: "bg-sky-600",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
    dot: "bg-indigo-600",
  },
  RESOLVED: {
    label: "Resolved",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    dot: "bg-emerald-600",
  },
  CLOSED: {
    label: "Closed",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    dot: "bg-slate-500",
  },
  REOPENED: {
    label: "Reopened",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-rose-600",
  },
};

export const StatusBadge: React.FC<Props> = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig.SUBMITTED;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border tracking-wide",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
