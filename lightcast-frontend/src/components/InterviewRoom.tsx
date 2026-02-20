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
import { submitInterviewAnswer, AnswerResult } from "@/lib/api";

interface InterviewRoomProps {
  token: string;
  wsUrl: string;
  questions: string[];
  skill: string;
  onEnd: () => void;
}

type RecordingState = "idle" | "recording" | "processing" | "done";

function scoreColor(score: number) {
  if (score >= 7) return "text-emerald-600";
  if (score >= 4) return "text-amber-600";
  return "text-rose-600";
}
function scoreBgColor(score: number) {
  if (score >= 7) return "bg-emerald-500";
  if (score >= 4) return "bg-amber-500";
  return "bg-rose-500";
}
function scoreLabel(score: number) {
  if (score >= 8) return "Excellent";
  if (score >= 7) return "Good";
  if (score >= 5) return "Fair";
  if (score >= 3) return "Needs Work";
  return "Poor";
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`${scoreBgColor(score)} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <div className="flex items-baseline gap-1 shrink-0">
        <span className={`text-lg font-bold tabular-nums ${scoreColor(score)}`}>{score}</span>
        <span className="text-xs text-slate-400">/10</span>
        <span className={`text-xs font-medium ml-1 ${scoreColor(score)}`}>· {scoreLabel(score)}</span>
      </div>
    </div>
  );
}

function SummaryScreen({
  questions,
  answers,
  skill,
  onReset,
}: {
  questions: string[];
  answers: Record<number, AnswerResult>;
  skill: string;
  onReset: () => void;
}) {
  const scores = Object.values(answers).map((a) => a.score);
  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const rounded = Math.round(average);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Summary header */}
      <div className="bg-slate-900 rounded-2xl p-8 text-center mb-6">
        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-1">Interview Complete</p>
        <h2 className="text-white text-2xl font-bold mb-1">{skill}</h2>
        <p className="text-slate-400 text-sm mb-6">{scores.length} of {questions.length} questions answered</p>
        <div className="inline-flex flex-col items-center">
          <div className={`text-7xl font-bold tabular-nums ${scoreColor(rounded)}`}>
            {average.toFixed(1)}
          </div>
          <div className="text-slate-400 text-base mt-1">Average Score / 10</div>
          <div className="mt-4 w-48">
            <ScoreBar score={rounded} />
          </div>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        {questions.map((q, i) => {
          const answer = answers[i];
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-start gap-4 p-5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-slate-600">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-medium text-sm leading-relaxed">{q}</p>
                  {answer ? (
                    <div className="mt-4 space-y-3">
                      <ScoreBar score={answer.score} />
                      {answer.transcript && (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Your Answer</p>
                          <p className="text-sm text-slate-600 italic leading-relaxed">&ldquo;{answer.transcript}&rdquo;</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Feedback</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{answer.feedback}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400 italic">Not answered</p>
                  )}
                </div>
                {answer && (
                  <span className={`shrink-0 text-2xl font-bold tabular-nums ${scoreColor(answer.score)}`}>
                    {answer.score}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={onReset}
          className="px-8 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
        >
          Start New Interview
        </button>
      </div>
    </div>
  );
}

function InterviewUI({
  questions,
  skill,
  onComplete,
  onEnd,
}: {
  questions: string[];
  skill: string;
  onComplete: (results: Record<number, AnswerResult>) => void;
  onEnd: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [answers, setAnswers] = useState<Record<number, AnswerResult>>({});

  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const cameraTrack = tracks.find(
    (t) => t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera
  );

  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => { micStreamRef.current = stream; })
      .catch((err) => { console.error("Microphone access denied:", err); });
    return () => { micStreamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const startRecording = useCallback(() => {
    if (!micStreamRef.current) return;
    audioChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    const recorder = new MediaRecorder(micStreamRef.current, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    recorder.start(500);
    mediaRecorderRef.current = recorder;
    setRecordingState("recording");
  }, []);

  const stopAndEvaluate = useCallback(async (questionIndex: number) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") { setRecordingState("done"); return; }
    setRecordingState("processing");
    const audioBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
      recorder.stop();
    });
    try {
      const result = await submitInterviewAnswer(questions[questionIndex], audioBlob);
      setAnswers((prev) => ({ ...prev, [questionIndex]: result }));
    } catch (err) {
      console.error("Evaluation failed:", err);
      setAnswers((prev) => ({
        ...prev,
        [questionIndex]: { transcript: "", score: 0, feedback: "Failed to process your answer." },
      }));
    }
    setRecordingState("done");
  }, [questions]);

  const goNext = () => { setCurrentIndex((i) => i + 1); setRecordingState("idle"); };
  const isLastQuestion = currentIndex >= questions.length - 1;
  const currentAnswer = answers[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div className="flex flex-col">
      {/* Header bar */}
      <div className="bg-slate-900 rounded-t-2xl px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            {skill}
          </span>
          <span className="text-slate-400 text-xs">
            Question <span className="text-white font-semibold">{currentIndex + 1}</span> of <span className="text-white font-semibold">{questions.length}</span>
          </span>
        </div>
        {/* Progress bar */}
        <div className="flex-1 max-w-xs">
          <div className="w-full bg-slate-700 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={onEnd}
          className="text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          End Session
        </button>
      </div>

      {/* Main panel */}
      <div className="bg-white border border-slate-200 border-t-0 rounded-b-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left: Camera */}
          <div className="relative bg-slate-950 aspect-video lg:aspect-auto lg:min-h-80">
            {cameraTrack ? (
              <VideoTrack trackRef={cameraTrack} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">Camera initializing...</p>
              </div>
            )}

            {/* Recording overlay */}
            {recordingState === "recording" && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-rose-600/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                RECORDING
              </div>
            )}
            {recordingState === "processing" && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analyzing...
              </div>
            )}

            {/* Question number bottom overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/80 to-transparent px-4 py-3">
              <p className="text-slate-300 text-xs font-medium">Q{currentIndex + 1} · {Object.keys(answers).length} answered</p>
            </div>
          </div>

          {/* Right: Question + controls */}
          <div className="flex flex-col p-6 gap-5 border-l border-slate-100">
            {/* Question card */}
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Question {currentIndex + 1}</p>
              <p className="text-slate-900 font-semibold text-lg leading-relaxed">
                {questions[currentIndex]}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Result card */}
            {currentAnswer && recordingState === "done" && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Score</span>
                </div>
                <ScoreBar score={currentAnswer.score} />
                {currentAnswer.transcript && (
                  <div className="pt-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Transcript</p>
                    <p className="text-sm text-slate-600 italic leading-relaxed">&ldquo;{currentAnswer.transcript}&rdquo;</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Feedback</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{currentAnswer.feedback}</p>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-col gap-2 mt-auto">
              {recordingState === "idle" && (
                <>
                  <button
                    onClick={startRecording}
                    className="flex items-center justify-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 active:bg-rose-800 transition-colors shadow-sm"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white" />
                    Start Recording
                  </button>
                  {!isLastQuestion && (
                    <button
                      onClick={goNext}
                      className="text-xs text-slate-400 hover:text-slate-600 text-center py-2 transition-colors"
                    >
                      Skip this question →
                    </button>
                  )}
                </>
              )}

              {recordingState === "recording" && (
                <button
                  onClick={() => stopAndEvaluate(currentIndex)}
                  className="flex items-center justify-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors shadow-sm ring-2 ring-rose-400 ring-offset-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  Stop &amp; Submit Answer
                </button>
              )}

              {recordingState === "processing" && (
                <button disabled className="w-full px-4 py-3 text-sm font-semibold text-slate-400 bg-slate-100 rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analyzing your answer...
                </button>
              )}

              {recordingState === "done" && (
                isLastQuestion ? (
                  <button
                    onClick={() => onComplete(answers)}
                    className="w-full px-4 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm"
                  >
                    Finish &amp; See Results
                  </button>
                ) : (
                  <button
                    onClick={goNext}
                    className="w-full px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
                  >
                    Next Question →
                  </button>
                )
              )}
            </div>

            <p className="text-xs text-slate-400 text-center">
              {recordingState === "idle" && "Click to begin recording your answer"}
              {recordingState === "recording" && "Recording in progress — speak clearly"}
              {recordingState === "processing" && "Transcribing & scoring with AI..."}
              {recordingState === "done" && (isLastQuestion ? "All questions answered" : "Review your feedback, then continue")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewRoom({ token, wsUrl, questions, skill, onEnd }: InterviewRoomProps) {
  const [summary, setSummary] = useState<Record<number, AnswerResult> | null>(null);

  if (summary) {
    return <SummaryScreen questions={questions} answers={summary} skill={skill} onReset={onEnd} />;
  }

  return (
    <LiveKitRoom token={token} serverUrl={wsUrl} video={true} audio={true} connect={true} data-lk-theme="default">
      <InterviewUI questions={questions} skill={skill} onComplete={setSummary} onEnd={onEnd} />
    </LiveKitRoom>
  );
}
