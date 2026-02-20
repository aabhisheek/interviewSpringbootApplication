"use client";

import { useState } from "react";
import { getSkillById } from "@/lib/api";

interface SkillCardProps {
  skill: {
    id: string;
    name: string;
    type?: { id: string; name: string };
    infoUrl?: string;
  };
}

export default function SkillCard({ skill }: SkillCardProps) {
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
        const data = await getSkillById(skill.id);
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
    <div className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition-all bg-white group">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{skill.name}</h3>
            {skill.type && (
              <span className="inline-block mt-0.5 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                {skill.type.name}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleToggle}
          className="shrink-0 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1"
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
