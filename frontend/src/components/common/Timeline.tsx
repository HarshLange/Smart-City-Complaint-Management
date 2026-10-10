import React from "react";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { StatusHistory } from "../../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  history: StatusHistory[];
}

export const Timeline: React.FC<Props> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-4 text-center">
        No status history recorded yet.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((event, eventIdx) => {
          const isLast = eventIdx === history.length - 1;
          const formattedDate = new Date(event.created_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <li key={event.id || eventIdx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div>
                    <div className="relative px-1">
                      <div className="h-7 w-7 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center text-blue-600">
                        {event.new_status === "RESOLVED" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : event.new_status === "UNDER_REVIEW" ? (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <StatusBadge status={event.new_status} />
                        <span className="text-xs text-slate-500">
                          by <strong className="text-slate-700">{event.actor_name}</strong> ({event.actor_role})
                        </span>
                      </div>
                      <time className="text-[11px] sm:text-xs text-slate-400 font-medium shrink-0">{formattedDate}</time>
                    </div>
                    {event.notes && (
                      <div className="mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                        {event.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
