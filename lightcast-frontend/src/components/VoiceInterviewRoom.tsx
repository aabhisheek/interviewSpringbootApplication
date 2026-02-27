"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  LiveKitRoom,
  VideoTrack,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import {
  submitInterviewAnswer,
  getAdaptiveQuestion,
  AnswerResult,
} from "@/lib/api";

// ─── Config ─────────────────────────────────────────────────────────────────
const TOTAL_QUESTIONS = 8;

// ─── Types ───────────────────────────────────────────────────────────────────
type AgentState =
  | "idle"
  | "generating"
  | "speaking"
  | "listening"
  | "processing";

interface QuestionResult extends AnswerResult {
  question: string;
  difficulty: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  return s >= 7 ? "text-green-600" : s >= 4 ? "text-yellow-600" : "text-red-600";
}
function scoreBg(s: number) {
  return s >= 7 ? "bg-green-500" : s >= 4 ? "bg-yellow-500" : "bg-red-500";
}
function difficultyStyle(d: string) {
  if (d === "advanced")
    return "text-red-700 bg-red-50 border-red-200";
  if (d === "intermediate")
    return "text-yellow-700 bg-yellow-50 border-yellow-200";
  return "text-green-700 bg-green-50 border-green-200";
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className={`${scoreBg(score)} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums ${scoreColor(score)}`}>
        {score}/10
      </span>
    </div>
  );
}

function AnimatedBars({
  active,
  color,
  count = 10,
}: {
  active: boolean;
  color: string;
  count?: number;
}) {
  const heights = [3, 6, 9, 6, 4, 8, 5, 7, 4, 6];
  return (
    <div className="flex items-end gap-0.5 h-8">
      {heights.slice(0, count).map((h, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full ${color} transition-all`}
          style={{
            height: active ? `${h * 3}px` : "4px",
            opacity: active ? 1 : 0.3,
            transitionDuration: `${150 + i * 30}ms`,
            transitionDelay: active ? `${i * 40}ms` : "0ms",
          }}
        />
      ))}
    </div>
  );
}

// ─── Summary Screen ───────────────────────────────────────────────────────────
function SummaryScreen({
  results,
  skill,
  onReset,
}: {
  results: QuestionResult[];
  skill: string;
  onReset: () => void;
}) {
  const avg =
    results.length > 0
      ? results.reduce((s, r) => s + r.score, 0) / results.length
      : 0;

  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Voice Interview Complete
        </h2>
        <p className="text-gray-500 mt-1">
          {skill} — {results.length} questions
        </p>
        <div
          className={`text-6xl font-bold mt-6 tabular-nums ${scoreColor(
            Math.round(avg)
          )}`}
        >
          {avg.toFixed(1)}
          <span className="text-2xl font-normal text-gray-400">/10</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">Average Score</p>
        <div className="max-w-xs mx-auto mt-3">
          <ScoreBar score={Math.round(avg)} />
        </div>
      </div>

      <div className="space-y-4">
        {results.map((r, i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-indigo-600 uppercase">
                    Q{i + 1}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded border ${difficultyStyle(
                      r.difficulty
                    )}`}
                  >
                    {r.difficulty}
                  </span>
                </div>
                <p className="text-gray-900 font-medium">{r.question}</p>
              </div>
              <span
                className={`shrink-0 text-xl font-bold tabular-nums ${scoreColor(
                  r.score
                )}`}
              >
                {r.score}/10
              </span>
            </div>
            <div className="space-y-3">
              <ScoreBar score={r.score} />
              {r.transcript && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                    Your Answer
                  </p>
                  <p className="text-sm text-gray-700 italic">
                    &ldquo;{r.transcript}&rdquo;
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                  Feedback
                </p>
                <p className="text-sm text-gray-700">{r.feedback}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={onReset}
          className="px-8 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Start New Interview
        </button>
      </div>
    </div>
  );
}

// ─── Voice Interview UI (inside LiveKitRoom) ──────────────────────────────────
function VoiceInterviewUI({
  skill,
  onComplete,
}: {
  skill: string;
  onComplete: (results: QuestionResult[]) => void;
}) {
  // ── Render state ──
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentDifficulty, setCurrentDifficulty] = useState("beginner");
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [statusText, setStatusText] = useState(
    "Press Start to begin your adaptive voice interview"
  );
  const [audioLevel, setAudioLevel] = useState(0);
  const [questionNum, setQuestionNum] = useState(0);

  // ── LiveKit ──
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const cameraTrack = tracks.find(
    (t) =>
      t.participant.identity === localParticipant.identity &&
      t.source === Track.Source.Camera
  );

  // ── Refs (never stale in async callbacks) ──
  const micStreamRef = useRef<MediaStream | null>(null);
  const manualStopRef = useRef<(() => void) | null>(null);
  const abortedRef = useRef(false);
  const resultsRef = useRef<QuestionResult[]>([]);
  resultsRef.current = results;
  // Pre-loaded voices so they're ready before any async gap
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // Preload TTS voices (Chrome loads them asynchronously)
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        micStreamRef.current = s;
      })
      .catch(console.error);

    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ── TTS ──────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.88;
      utter.pitch = 1.05;
      // Pick a natural-sounding online English voice from the preloaded list
      const voices = voicesRef.current.length
        ? voicesRef.current
        : window.speechSynthesis.getVoices();
      const preferred =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            !v.localService &&
            (v.name.includes("Google") ||
              v.name.includes("Natural") ||
              v.name.includes("Neural") ||
              v.name.includes("Samantha"))
        ) || voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utter.voice = preferred;

      let finished = false;
      let watchdog: ReturnType<typeof setInterval> | null = null;
      let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

      const finish = () => {
        if (finished) return;
        finished = true;
        if (watchdog !== null) clearInterval(watchdog);
        if (fallbackTimer !== null) clearTimeout(fallbackTimer);
        resolve();
      };

      utter.onend = finish;
      utter.onerror = finish;

      // Call speak() first, then start the watchdog after 500ms.
      // This prevents a false-positive finish() call: right after cancel(),
      // speechSynthesis.speaking is briefly false before speak() sets it true.
      window.speechSynthesis.speak(utter);

      // iOS Safari: speechSynthesis can silently pause (e.g. on tab switch)
      // and onend sometimes never fires — poll and resume as needed.
      // Delayed 500ms so speaking has time to become true before we check it.
      setTimeout(() => {
        if (finished) return;
        watchdog = setInterval(() => {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          if (!window.speechSynthesis.speaking) finish();
        }, 250);

        // Hard timeout: ~180 wpm at rate 0.88, with 50% buffer (minus startup delay)
        const wordCount = text.split(/\s+/).length;
        const fallbackMs = Math.max((wordCount / (180 * 0.88)) * 60000 * 1.5 - 500, 2500);
        fallbackTimer = setTimeout(finish, fallbackMs);
      }, 500);
    });
  }, []);

  // ── STT: records until user clicks "Done Answering" ─────────────────────
  const listen = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const stream = micStreamRef.current;
      if (!stream) {
        resolve(new Blob([], { type: "audio/webm" }));
        return;
      }

      const chunks: Blob[] = [];
      // iOS Safari only supports audio/mp4; Android/Chrome support audio/webm
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.start(500);

      // AudioContext only for the visual level bar — no auto-stop logic
      // iOS Safari starts AudioContext suspended; resume() unlocks it
      const audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const analyser = audioCtx.createAnalyser();
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 512;
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      const levelInterval = setInterval(() => {
        analyser.getByteFrequencyData(freqData);
        const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
        setAudioLevel(Math.min(100, avg * 2.5));
      }, 80);

      const finish = () => {
        clearInterval(levelInterval);
        audioCtx.close();
        setAudioLevel(0);
        manualStopRef.current = null;
        if (recorder.state !== "inactive") {
          recorder.onstop = () =>
            resolve(new Blob(chunks, { type: "audio/webm" }));
          recorder.stop();
        } else {
          resolve(new Blob(chunks, { type: "audio/webm" }));
        }
      };

      // Only resolves when the button is clicked
      manualStopRef.current = finish;
    });
  }, []);

  // ── Main adaptive interview loop ──────────────────────────────────────────
  const startInterview = useCallback(async () => {
    abortedRef.current = false;
    const allResults: QuestionResult[] = [];

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      if (abortedRef.current) break;

      // 1. Generate adaptive question
      setAgentState("generating");
      setQuestionNum(i);
      setStatusText(
        i === 0
          ? "Preparing your first question..."
          : "Adapting next question to your level..."
      );

      let question = "";
      let difficulty = "beginner";
      try {
        const adaptive = await getAdaptiveQuestion(
          skill,
          i + 1,
          allResults.map((r) => ({ question: r.question, score: r.score }))
        );
        question = adaptive.question;
        difficulty = adaptive.difficulty;
      } catch {
        setStatusText("Failed to generate question — ending session.");
        break;
      }

      if (abortedRef.current) break;
      setCurrentQuestion(question);
      setCurrentDifficulty(difficulty);

      // 2. Speak the question
      setAgentState("speaking");
      setStatusText(`Question ${i + 1} of ${TOTAL_QUESTIONS}`);
      const intro =
        i === 0
          ? `Welcome to your adaptive ${skill} voice interview. I'll ask ${TOTAL_QUESTIONS} questions and adjust the difficulty to match your level. Let's begin. Question 1. ${question}`
          : `Question ${i + 1}. ${question}`;
      await speak(intro);

      if (abortedRef.current) break;

      // 3. Listen for answer
      setAgentState("listening");
      setStatusText("Your turn — speak your answer, then click Done Answering.");
      const audioBlob = await listen();

      if (abortedRef.current) break;

      // 4. Evaluate
      setAgentState("processing");
      setStatusText("Analyzing your answer...");

      let result: AnswerResult = {
        transcript: "",
        score: 0,
        feedback: "Could not process your answer.",
      };
      try {
        result = await submitInterviewAnswer(question, audioBlob);
      } catch {
        /* keep fallback */
      }

      const qr: QuestionResult = { ...result, question, difficulty };
      allResults.push(qr);
      setResults([...allResults]);

      if (abortedRef.current) break;

      // 5. Speak brief feedback before next question
      if (i < TOTAL_QUESTIONS - 1) {
        setAgentState("speaking");
        setStatusText(`Score: ${result.score}/10 — speaking feedback`);
        const fb =
          result.score >= 7
            ? `Good answer, ${result.score} out of 10. Moving on.`
            : result.score >= 4
            ? `Decent, ${result.score} out of 10. Let's continue.`
            : `${result.score} out of 10. Let's try a different angle.`;
        await speak(fb);
      }
    }

    if (!abortedRef.current) {
      setAgentState("speaking");
      const finalAvg =
        allResults.length > 0
          ? allResults.reduce((s, r) => s + r.score, 0) / allResults.length
          : 0;
      await speak(
        `Interview complete. Your average score is ${finalAvg.toFixed(
          1
        )} out of 10. Well done!`
      );
    }

    onComplete(allResults);
  }, [skill, speak, listen, onComplete]);

  // Unlock Web Speech API in the user-gesture context BEFORE any await.
  // Chrome blocks speechSynthesis.speak() called after an async gap — a silent
  // warmup utterance spoken synchronously here keeps the permission alive.
  const handleStartClick = useCallback(() => {
    const warmup = new SpeechSynthesisUtterance(" ");
    warmup.volume = 0;
    warmup.rate = 10;
    window.speechSynthesis.speak(warmup);
    startInterview();
  }, [startInterview]);

  const handleEndEarly = () => {
    abortedRef.current = true;
    window.speechSynthesis.cancel();
    manualStopRef.current?.();
    setTimeout(() => onComplete(resultsRef.current), 600);
  };

  // ── Derived display values ────────────────────────────────────────────────
  const answeredCount = results.length;
  const avgScore =
    answeredCount > 0
      ? results.reduce((s, r) => s + r.score, 0) / answeredCount
      : null;

  const proficiencyLabel =
    avgScore === null
      ? "Assessing..."
      : avgScore >= 7.5
      ? "Advanced"
      : avgScore >= 4.5
      ? "Intermediate"
      : "Beginner";

  const proficiencyColor =
    avgScore === null
      ? "text-gray-400"
      : avgScore >= 7.5
      ? "text-red-600"
      : avgScore >= 4.5
      ? "text-yellow-600"
      : "text-green-600";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Left: Camera + agent state overlay ── */}
      <div className="flex flex-col gap-4">
        <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
          {cameraTrack ? (
            <VideoTrack
              trackRef={cameraTrack}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              Camera loading...
            </div>
          )}

          {agentState !== "idle" && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {agentState === "speaking" && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      <span className="text-white text-xs font-medium">
                        Agent Speaking
                      </span>
                    </>
                  )}
                  {agentState === "listening" && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-white text-xs font-medium">
                        Listening
                      </span>
                    </>
                  )}
                  {(agentState === "processing" ||
                    agentState === "generating") && (
                    <>
                      <svg
                        className="w-3 h-3 text-white animate-spin"
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
                      <span className="text-white text-xs font-medium">
                        {agentState === "processing"
                          ? "Analyzing..."
                          : "Thinking..."}
                      </span>
                    </>
                  )}
                </div>
                {avgScore !== null && (
                  <span className={`text-xs font-semibold ${proficiencyColor}`}>
                    {proficiencyLabel}
                  </span>
                )}
              </div>

              {/* Audio level bar */}
              {agentState === "listening" && (
                <div className="w-full bg-white/20 rounded-full h-1.5">
                  <div
                    className="bg-red-400 h-1.5 rounded-full transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Voice waveform panel */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">
              Agent
            </p>
            <AnimatedBars
              active={agentState === "speaking"}
              color="bg-indigo-500"
            />
          </div>
          <div className="w-px h-12 bg-gray-200" />
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">
              You
            </p>
            <AnimatedBars
              active={agentState === "listening"}
              color="bg-red-500"
            />
          </div>
        </div>
      </div>

      {/* ── Right: Question + status + history ── */}
      <div className="flex flex-col gap-4">
        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm text-indigo-600 font-semibold">
              {agentState === "idle"
                ? "Ready"
                : `Question ${questionNum + 1} of ${TOTAL_QUESTIONS}`}
            </span>
            {avgScore !== null && (
              <span className={`text-xs font-semibold ${proficiencyColor}`}>
                {proficiencyLabel} · avg {avgScore.toFixed(1)}/10
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${(answeredCount / TOTAL_QUESTIONS) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Current question */}
        {currentQuestion && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                Current Question
              </span>
              {currentDifficulty && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded border ${difficultyStyle(
                    currentDifficulty
                  )}`}
                >
                  {currentDifficulty}
                </span>
              )}
            </div>
            <p className="text-gray-900 font-medium leading-relaxed">
              {currentQuestion}
            </p>
          </div>
        )}

        {/* Status */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
          <p className="text-sm text-gray-600">{statusText}</p>
        </div>

        {/* Recent answered questions mini-log */}
        {results.length > 0 && (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {results
              .slice()
              .reverse()
              .slice(0, 4)
              .map((r, idx) => {
                const realIdx = results.length - 1 - idx;
                return (
                  <div
                    key={realIdx}
                    className="bg-white border border-gray-100 rounded-lg px-3 py-2 flex items-center gap-3"
                  >
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded border shrink-0 ${difficultyStyle(
                        r.difficulty
                      )}`}
                    >
                      {r.difficulty.slice(0, 3).toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-600 truncate flex-1">
                      Q{realIdx + 1}: {r.question}
                    </p>
                    <span
                      className={`text-xs font-bold tabular-nums shrink-0 ${scoreColor(
                        r.score
                      )}`}
                    >
                      {r.score}/10
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-2 mt-auto">
          {agentState === "idle" && (
            <button
              onClick={handleStartClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Voice Interview
            </button>
          )}

          {agentState === "listening" && (
            <button
              onClick={() => manualStopRef.current?.()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Done Answering
            </button>
          )}

          {agentState !== "idle" && (
            <button
              onClick={handleEndEarly}
              className="w-full px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors"
            >
              End Interview Early
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Difficulty adapts based on your scores · {answeredCount}/
          {TOTAL_QUESTIONS} answered
        </p>
      </div>
    </div>
  );
}

// ─── Root export (manages LiveKit room lifecycle + summary) ───────────────────
export default function VoiceInterviewRoom({
  token,
  wsUrl,
  skill,
  onEnd,
}: {
  token: string;
  wsUrl: string;
  skill: string;
  onEnd: () => void;
}) {
  const [summary, setSummary] = useState<QuestionResult[] | null>(null);

  if (summary) {
    return (
      <SummaryScreen results={summary} skill={skill} onReset={onEnd} />
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      video={true}
      audio={true}
      connect={true}
      data-lk-theme="default"
    >
      <VoiceInterviewUI skill={skill} onComplete={setSummary} />
    </LiveKitRoom>
  );
}
