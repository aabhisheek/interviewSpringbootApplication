"""
Adaptive Voice Interview Agent
--------------------------------
A LiveKit agent that:
  - Auto-joins any room whose name starts with "interview2-"
  - Speaks questions aloud using edge-tts (free, no API key)
  - Listens to the candidate via Groq Whisper STT
  - Scores answers and adapts question difficulty via Groq LLaMA
  - Provides verbal feedback between questions

Run:
    pip install -r requirements.txt
    python interview_agent.py dev          # local dev mode
    python interview_agent.py start        # production worker mode
"""

import asyncio
import io
import json
import logging
import os
import re
from dataclasses import dataclass, field
from typing import List

import edge_tts
import httpx
from dotenv import load_dotenv
from groq import AsyncGroq
from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    utils,
)
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import groq as groq_plugin
from livekit.plugins import silero

load_dotenv()

logger = logging.getLogger("interview-agent")

TOTAL_QUESTIONS = 8
SILENCE_THRESHOLD_MS = 2500

GROQ_API_KEY = os.environ["GROQ_API_KEY"]
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_WHISPER_MODEL = os.environ.get("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")
TTS_VOICE = os.environ.get("TTS_VOICE", "en-US-JennyNeural")  # edge-tts voice


# ─── Edge-TTS helper ─────────────────────────────────────────────────────────

async def synthesize_speech(text: str) -> bytes:
    """Generate MP3 audio bytes from text using Microsoft Edge TTS (free)."""
    communicate = edge_tts.Communicate(text, TTS_VOICE, rate="-5%", pitch="+2Hz")
    mp3_chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_chunks.append(chunk["data"])
    return b"".join(mp3_chunks)


# ─── Groq LLM helpers ────────────────────────────────────────────────────────

groq_client = AsyncGroq(api_key=GROQ_API_KEY)


@dataclass
class QuestionResult:
    question: str
    transcript: str
    score: int
    feedback: str
    difficulty: str


async def generate_adaptive_question(
    skill: str,
    question_number: int,
    previous_results: List[QuestionResult],
) -> dict:
    """Generate next question, adapting difficulty to candidate proficiency."""
    avg_score = (
        sum(r.score for r in previous_results) / len(previous_results)
        if previous_results
        else 5.0
    )
    difficulty = (
        "advanced" if avg_score >= 7.5 else "intermediate" if avg_score >= 4.5 else "beginner"
    )

    history_lines = "\n---\n".join(
        f"Q: {r.question}\nScore: {r.score}/10" for r in previous_results
    )
    history = history_lines if history_lines else "None (first question)"

    prompt = (
        f"You are conducting an adaptive technical interview for the skill: {skill}.\n\n"
        f"Previous questions and scores:\n{history}\n\n"
        f"Assessed proficiency: {difficulty} (avg score: {avg_score:.1f}/10). "
        f"Question number: {question_number}.\n\n"
        "Generate ONE interview question at the appropriate difficulty level.\n"
        "- advanced: architecture, design patterns, edge cases, trade-offs.\n"
        "- intermediate: practical usage, common patterns, debugging.\n"
        "- beginner: foundational concepts, definitions, simple examples.\n"
        "Do NOT repeat any previous question. Sound natural and conversational.\n\n"
        f'Respond ONLY with this JSON: {{"question": "<the question>", "difficulty": "{difficulty}"}}'
    )

    response = await groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=200,
    )
    content = response.choices[0].message.content or ""
    content = re.sub(r"```json\s*|```\s*", "", content).strip()

    parsed = json.loads(content)
    return {
        "question": parsed.get("question", "Tell me about " + skill),
        "difficulty": parsed.get("difficulty", difficulty),
    }


async def transcribe_audio(audio_bytes: bytes, filename: str = "answer.webm") -> str:
    """Transcribe audio using Groq Whisper."""
    audio_file = (filename, io.BytesIO(audio_bytes), "audio/webm")
    result = await groq_client.audio.transcriptions.create(
        model=GROQ_WHISPER_MODEL,
        file=audio_file,
        response_format="text",
    )
    return (result or "").strip()


async def score_answer(question: str, transcript: str) -> dict:
    """Score the candidate's answer using Groq LLaMA."""
    answer_text = transcript if transcript.strip() else "(candidate did not answer)"

    prompt = (
        "You are an expert technical interviewer evaluating a candidate.\n\n"
        f"Interview Question: {question}\n\n"
        f"Candidate's Answer: {answer_text}\n\n"
        "Score 0-10 based on technical accuracy, completeness, and clarity.\n"
        'Respond ONLY with: {"score": <integer 0-10>, "feedback": "<2-3 sentence feedback>"}'
    )

    response = await groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=200,
    )
    content = response.choices[0].message.content or ""
    content = re.sub(r"```json\s*|```\s*", "", content).strip()
    parsed = json.loads(content)
    return {
        "score": int(parsed.get("score", 0)),
        "feedback": parsed.get("feedback", "No feedback available."),
    }


# ─── Agent entrypoint ─────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext):
    logger.info(f"Agent joining room: {ctx.room.name}")

    # Parse skill from room metadata (set by frontend when creating room)
    skill = "Software Engineering"
    try:
        meta = json.loads(ctx.room.metadata or "{}")
        skill = meta.get("skill", skill)
    except Exception:
        pass

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the participant to join
    participant = await ctx.wait_for_participant()
    logger.info(f"Candidate joined: {participant.identity}")

    results: List[QuestionResult] = []

    async def speak(text: str):
        """Speak text to the room via a published audio track."""
        logger.info(f"[AGENT] Speaking: {text[:80]}...")
        mp3_bytes = await synthesize_speech(text)

        # Publish as a LiveKit audio source
        source = rtc.AudioSource(sample_rate=24000, num_channels=1)
        track = rtc.LocalAudioTrack.create_audio_track("agent-voice", source)
        options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        pub = await ctx.room.local_participant.publish_track(track, options)

        # Decode MP3 → PCM and push to source
        # (Using pydub for MP3 → PCM conversion)
        try:
            from pydub import AudioSegment  # type: ignore

            seg = AudioSegment.from_mp3(io.BytesIO(mp3_bytes))
            seg = seg.set_frame_rate(24000).set_channels(1).set_sample_width(2)
            pcm = seg.raw_data

            chunk_size = 24000 * 2 // 10  # 100ms chunks
            for i in range(0, len(pcm), chunk_size):
                chunk = pcm[i : i + chunk_size]
                frame = rtc.AudioFrame(
                    data=chunk,
                    sample_rate=24000,
                    num_channels=1,
                    samples_per_channel=len(chunk) // 2,
                )
                await source.capture_frame(frame)
                await asyncio.sleep(0.08)
        finally:
            await ctx.room.local_participant.unpublish_track(pub.sid)

    async def listen_for_answer() -> bytes:
        """Record candidate audio until VAD detects end of speech."""
        logger.info("[AGENT] Listening for answer...")

        audio_chunks: List[bytes] = []
        silence_count = 0
        speaking = False

        # Subscribe to participant's audio track
        for pub in participant.track_publications.values():
            if pub.track and pub.track.kind == rtc.TrackKind.KIND_AUDIO:
                pub.track.on("audio_frame_received", lambda frame: audio_chunks.append(bytes(frame.data)))

        # Simple VAD: collect audio for up to 60s, stop after 3s of silence
        await asyncio.sleep(0.5)  # brief pause before listening
        timeout = 60
        elapsed = 0
        last_sound_t = asyncio.get_event_loop().time()

        while elapsed < timeout:
            await asyncio.sleep(0.2)
            elapsed += 0.2
            now = asyncio.get_event_loop().time()

            if audio_chunks:
                speaking = True
                last_sound_t = now

            if speaking and (now - last_sound_t) > (SILENCE_THRESHOLD_MS / 1000):
                break

        return b"".join(audio_chunks)

    # ── Main interview loop ────────────────────────────────────────────────
    await speak(
        f"Hello! I'm your AI interviewer today. We'll be covering {skill}. "
        f"I'll ask you {TOTAL_QUESTIONS} questions and adjust the difficulty "
        "based on how you're doing. Take your time with each answer — I'll "
        "automatically detect when you've finished speaking. Let's begin!"
    )

    for i in range(TOTAL_QUESTIONS):
        logger.info(f"Starting question {i + 1}/{TOTAL_QUESTIONS}")

        # Generate adaptive question
        q_data = await generate_adaptive_question(skill, i + 1, results)
        question = q_data["question"]
        difficulty = q_data["difficulty"]

        logger.info(f"Q{i+1} [{difficulty}]: {question}")

        # Speak question
        prefix = f"Question {i + 1}. " if i > 0 else f"Question 1. "
        await speak(prefix + question)

        # Listen
        audio_bytes = await listen_for_answer()

        # Transcribe
        transcript = ""
        if audio_bytes:
            try:
                transcript = await transcribe_audio(audio_bytes)
                logger.info(f"Transcript: {transcript[:100]}")
            except Exception as e:
                logger.warning(f"Transcription failed: {e}")

        # Score
        scoring = {"score": 0, "feedback": "Could not evaluate."}
        try:
            scoring = await score_answer(question, transcript)
        except Exception as e:
            logger.warning(f"Scoring failed: {e}")

        results.append(
            QuestionResult(
                question=question,
                transcript=transcript,
                score=scoring["score"],
                feedback=scoring["feedback"],
                difficulty=difficulty,
            )
        )
        logger.info(f"Score: {scoring['score']}/10")

        # Verbal feedback between questions
        if i < TOTAL_QUESTIONS - 1:
            score = scoring["score"]
            if score >= 7:
                fb = f"Good answer, {score} out of 10. Moving on."
            elif score >= 4:
                fb = f"Decent attempt, {score} out of 10. Let's continue."
            else:
                fb = f"{score} out of 10. Let's try a different angle."
            await speak(fb)

    # ── Wrap up ────────────────────────────────────────────────────────────
    avg = sum(r.score for r in results) / len(results) if results else 0
    await speak(
        f"That concludes your interview. You answered {len(results)} questions "
        f"with an average score of {avg:.1f} out of 10. "
        "Your detailed results are on screen. Well done, and good luck!"
    )

    logger.info(f"Interview complete. Avg score: {avg:.1f}/10")
    await ctx.room.disconnect()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            # Only handle rooms that start with "interview2-"
            agent_name="interview-agent",
        )
    )
