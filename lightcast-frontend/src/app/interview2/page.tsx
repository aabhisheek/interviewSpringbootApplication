"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import VoiceInterviewRoom from "@/components/VoiceInterviewRoom";
import { useAuth } from "@/context/AuthContext";
import { getInterviewToken } from "@/lib/api";

export default function Interview2Page() {
  const { user } = useAuth();
  const [skill, setSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>("");

  const handleStart = async () => {
    if (!skill.trim()) return;
    setLoading(true);
    setError("");

    try {
      const studentProfileId = user?.email || `guest-${Date.now()}`;
      const interviewDisplayId = `interview2-${Date.now()}`;

      const tokenData = await getInterviewToken(studentProfileId, interviewDisplayId);
      setToken(tokenData.token);
      setWsUrl(tokenData.wsUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start interview.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = () => {
    setToken(null);
    setWsUrl("");
    setSkill("");
  };

  return (
    <ProtectedRoute>
      <div>
        {token ? (
          <VoiceInterviewRoom
            token={token}
            wsUrl={wsUrl}
            skill={skill}
            onEnd={handleEnd}
          />
        ) : (
          <>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-slate-900">Voice Interview</h2>
                <span className="text-xs font-semibold px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full">
                  Adaptive AI
                </span>
              </div>
              <p className="text-slate-500 text-sm">An AI agent speaks questions aloud and adapts difficulty based on your answers</p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3 mb-8 max-w-md">
              {[
                { icon: "M15.536 8.464a5 5 0 010 7.072M12 9v6m0 0l-3-3m3 3l3-3", color: "bg-violet-50 text-violet-600", label: "AI speaks questions", sub: "Natural voice via TTS" },
                { icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z", color: "bg-blue-50 text-blue-600", label: "You answer verbally", sub: "Groq Whisper STT" },
                { icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", color: "bg-emerald-50 text-emerald-600", label: "Adaptive difficulty", sub: "Harder as you improve" },
                { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-amber-50 text-amber-600", label: "Instant scoring", sub: "LLaMA 3.3 evaluation" },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center mb-2`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Choose a skill to be interviewed on</h3>
              <input
                id="skill"
                type="text"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="e.g. Java, System Design, React..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-shadow"
              />

              {error && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                onClick={handleStart}
                disabled={loading || !skill.trim()}
                className="mt-4 w-full px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm6.364 10.364a.75.75 0 0 0-1.5 0 4.875 4.875 0 0 1-9.75 0 .75.75 0 0 0-1.5 0 6.375 6.375 0 0 0 5.625 6.326V19.5h-2.25a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-2.25v-1.81A6.375 6.375 0 0 0 18.364 11.364z" />
                    </svg>
                    Start Voice Interview
                  </>
                )}
              </button>

              <p className="mt-3 text-xs text-slate-400 text-center">
                Allow microphone access when prompted · Best on Chrome / Edge
              </p>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
