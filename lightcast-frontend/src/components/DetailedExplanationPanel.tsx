"use client";

import { useState, useRef } from "react";
import { getDetailedExplanation, DetailedExplanation } from "@/lib/api";

interface Props {
  question: string;
  transcript: string;
  score: number;
  /** Colour theme: "blue" for normal interview, "indigo" for voice interview */
  theme?: "blue" | "indigo";
  /**
   * "doubt"  — shown on the active question before answering.
   *            Button reads "Doubt? Get Model Answer" with amber styling.
   * "review" — shown after answering. Button reads "Show Detailed Explanation".
   */
  mode?: "doubt" | "review";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      onClick={copy}
      className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function DetailedExplanationPanel({
  question,
  transcript,
  score,
  theme = "blue",
  mode = "review",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DetailedExplanation | null>(null);
  const [error, setError] = useState("");
  const fetchedRef = useRef(false);

  // ── theme tokens ──────────────────────────────────────────────────────────
  const accent =
    theme === "indigo"
      ? "text-indigo-600 hover:text-indigo-700"
      : "text-blue-600 hover:text-blue-700";
  const accentBorder =
    theme === "indigo" ? "border-indigo-100" : "border-blue-100";
  const accentBg = theme === "indigo" ? "bg-indigo-50" : "bg-blue-50";
  const accentText =
    theme === "indigo" ? "text-indigo-700" : "text-blue-700";
  const accentTagBg =
    theme === "indigo"
      ? "bg-indigo-100 text-indigo-700"
      : "bg-blue-100 text-blue-700";

  const toggle = async () => {
    if (!isOpen && !fetchedRef.current) {
      setLoading(true);
      setError("");
      try {
        const result = await getDetailedExplanation(question, transcript, score);
        setData(result);
        fetchedRef.current = true;
      } catch {
        setError("Could not load explanation. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    setIsOpen((prev) => !prev);
  };

  // ── mode-specific button styling ─────────────────────────────────────────
  const isDoubt = mode === "doubt";

  return (
    <div className={`mt-3 pt-3 border-t ${isDoubt ? "border-amber-200" : accentBorder}`}>
      {/* Toggle button */}
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors select-none ${
          isDoubt
            ? "text-amber-600 hover:text-amber-700"
            : accent
        }`}
      >
        {isDoubt ? (
          /* Question-mark icon for doubt mode */
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          /* Chevron icon for review mode */
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}

        {isDoubt
          ? isOpen
            ? "Hide Model Answer"
            : "Doubt? Get Model Answer"
          : isOpen
          ? "Hide Detailed Explanation"
          : "Show Detailed Explanation"}

        <span
          className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
            isDoubt
              ? "bg-amber-100 text-amber-700"
              : accentTagBg
          }`}
        >
          {isDoubt ? "10/10 answer" : "10/10 answer + tip"}
        </span>
      </button>

      {/* Panel body */}
      {isOpen && (
        <div className="mt-3 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
              <svg
                className="w-4 h-4 animate-spin shrink-0"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Generating detailed explanation…
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              <svg
                className="w-4 h-4 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Model answer */}
              <div className={`${accentBg} border ${accentBorder} rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className={`w-3.5 h-3.5 ${accentText}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className={`text-xs font-bold uppercase tracking-wide ${accentText}`}>
                    Model Answer — 10 / 10
                  </p>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {data.detailedAnswer}
                </p>
              </div>

              {/* Code example */}
              {data.codeExample && (
                <div className="rounded-xl overflow-hidden border border-slate-700">
                  <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-3.5 h-3.5 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                      <span className="text-xs font-semibold text-slate-300">
                        {data.language
                          ? data.language.charAt(0).toUpperCase() +
                            data.language.slice(1)
                          : "Code"}
                        {" "}— Perfect Answer Example
                      </span>
                    </div>
                    <CopyButton text={data.codeExample} />
                  </div>
                  <pre className="bg-slate-900 text-slate-100 text-xs leading-relaxed p-4 overflow-x-auto font-mono">
                    <code>{data.codeExample}</code>
                  </pre>
                </div>
              )}

              {/* Bonus tip */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-3.5 h-3.5 text-amber-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    Bonus Interview Tip
                  </p>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {data.bonusTip}
                </p>
              </div>

              {/* Related question */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-3.5 h-3.5 text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Related Follow-up Question
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-800 leading-relaxed">
                  {data.relatedQuestion}
                </p>
              </div>

              {/* Additional info — commonly asked nearby topics */}
              {data.additionalInfo && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-3.5 h-3.5 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Also Commonly Asked in Interviews
                    </p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {data.additionalInfo}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
