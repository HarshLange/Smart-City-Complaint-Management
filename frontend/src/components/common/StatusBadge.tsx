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
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  ASSIGNED: {
    label: "Assigned",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    dot: "bg-cyan-500",
  },
  RESOLVED: {
    label: "Resolved",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  CLOSED: {
    label: "Closed",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  REOPENED: {
    label: "Reopened",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
};

export const StatusBadge: React.FC<Props> = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig.SUBMITTED;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
};
