"use client";

import { useState } from "react";
import { getOccupationById } from "@/lib/api";

interface OccupationCardProps {
  occupation: {
    id: string;
    name: string;
    pluralName?: string;
  };
}

export default function OccupationCard({ occupation }: OccupationCardProps) {
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!details) {
      setLoading(true);
      try {
        const data = await getOccupationById(occupation.id);
        setDetails(data);
      } catch {
        setDetails({ error: "Failed to load details" });
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition-all bg-white">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{occupation.name}</h3>
            {occupation.pluralName && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{occupation.pluralName}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleToggle}
          className="shrink-0 text-xs font-medium text-slate-500 hover:text-violet-600 transition-colors flex items-center gap-1"
        >
          {loading ? (
            "Loading..."
          ) : expanded ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              Hide
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              Details
            </>
          )}
        </button>
      </div>
      {expanded && details && (
        <pre className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 overflow-x-auto max-h-64 overflow-y-auto font-mono">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}
