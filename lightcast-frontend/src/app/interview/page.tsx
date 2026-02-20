"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import InterviewRoom from "@/components/InterviewRoom";
import { useAuth } from "@/context/AuthContext";
import { getInterviewToken, getInterviewQuestions } from "@/lib/api";

export default function InterviewPage() {
  const { user } = useAuth();
  const [skill, setSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>("");
  const [questions, setQuestions] = useState<string[]>([]);

  const handleStart = async () => {
    if (!skill.trim()) return;
    setLoading(true);
    setError("");

    try {
      const studentProfileId = user?.email || `guest-${Date.now()}`;
      const interviewDisplayId = `interview-${Date.now()}`;

      const [tokenData, questionsData] = await Promise.all([
        getInterviewToken(studentProfileId, interviewDisplayId),
        getInterviewQuestions(skill.trim()),
      ]);

      const questionsList: string[] =
        questionsData.questions ||
        questionsData.data?.questions ||
        questionsData.data ||
        [];

      if (!questionsList.length) {
        throw new Error("No questions were generated for this skill.");
      }

      setToken(tokenData.token);
      setWsUrl(tokenData.wsUrl);
      setQuestions(questionsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start interview.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = () => {
    setToken(null);
    setWsUrl("");
    setQuestions([]);
    setSkill("");
  };

  return (
    <ProtectedRoute>
      <div>
        {token && questions.length > 0 ? (
          <InterviewRoom
            token={token}
            wsUrl={wsUrl}
            questions={questions}
            skill={skill}
            onEnd={handleEnd}
          />
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Practice Interview</h2>
              <p className="text-slate-500 text-sm mt-1">Answer AI-generated questions and get instant feedback</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "10 questions", sub: "Auto-generated" },
                { icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z", label: "Voice answers", sub: "Record & submit" },
                { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Scored 0–10", sub: "Instant results" },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Choose a skill to practice</h3>
              <input
                id="skill"
                type="text"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="e.g. Java, Python, React, System Design..."
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
                    Generating questions...
                  </>
                ) : (
                  "Start Interview"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
