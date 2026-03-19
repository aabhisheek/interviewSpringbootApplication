---
name: explain
description: 5-layer explanation framework calibrated for this Spring Boot / Next.js interview platform.
---

# Explain Skill

## Depth Calibration
| Target | Depth |
|---|---|
| DTO class, utility method, repository method | L1-L2 |
| Service method, React component, Python helper | L1-L4 |
| Full subsystem (auth flow, interview evaluation pipeline, LiveKit voice flow) | All 5 |

## Layer 1 — One-Sentence Plain-English Summary
What this thing does, in terms a non-engineer could understand.

Example: "`InterviewService.evaluateAnswer()` sends a candidate's audio recording to Groq AI, gets back a text transcript, then sends that transcript to a second AI call that scores the answer from 0 to 10."

## Layer 2 — Purpose and Context
Why this exists. What problem it solves. What would break if it were removed.

Example: "This method exists because the frontend cannot call Groq directly — the API key must stay server-side. The backend acts as a secure proxy: it validates the JWT, decodes the audio, calls Groq Whisper, calls Groq LLaMA, and returns a structured result. Without this, either the API key would be exposed in the browser or the frontend would need to handle multi-step AI orchestration."

## Layer 3 — How It Works Step by Step
With `file:line` references for every meaningful step.

Example for `InterviewService.evaluateAnswer()`:
1. `InterviewController.java:74` — receives `{ question, audioData }` as JSON, decodes `audioData` from Base64 to `byte[]`
2. `InterviewService.java:134` — calls `transcribeAudio(audioBytes)`
3. `InterviewService.java:139` — builds a multipart form request: wraps bytes in `ByteArrayResource` override that provides the filename `"audio.webm"` (required by Groq's API)
4. `InterviewService.java:157` — POSTs to `${groq.api-url}/audio/transcriptions` with Bearer auth
5. `InterviewService.java:163` — returns trimmed response body (plain text transcript)
6. `InterviewService.java:136` — calls `scoreAnswer(question, transcript)`
7. `InterviewService.java:172` — if transcript is blank, substitutes `"(candidate did not provide an answer)"` so the LLM always gets a valid prompt
8. `InterviewService.java:185` — POSTs JSON to `${groq.api-url}/chat/completions` requesting score 0-10 and 2-3 sentence feedback
9. `InterviewService.java:211` — strips markdown code fences (LLM sometimes wraps JSON in ` ```json ``` `) then parses with `objectMapper.readTree()`
10. Returns `{ transcript, score, feedback }`

## Layer 4 — Data Flow Diagram (ASCII)
```
Browser
  │ POST /api/interview/answer
  │ { question: "...", audioData: "<base64>" }
  │ Authorization: Bearer <jwt>
  ▼
JwtAuthenticationFilter
  │ validates JWT → sets SecurityContext
  ▼
InterviewController.evaluateAnswer()
  │ Base64.decode(audioData) → byte[]
  ▼
InterviewService.evaluateAnswer()
  ├─► transcribeAudio(audioBytes)
  │     multipart POST → Groq Whisper API
  │     ◄── "The candidate explained that JPA..."  (plain text)
  │
  └─► scoreAnswer(question, transcript)
        JSON POST → Groq LLaMA API
        ◄── {"score": 7, "feedback": "Good explanation..."}
        strip markdown fences
        parse JSON
        return { transcript, score, feedback }
  ▼
InterviewController
  ResponseEntity.ok({ transcript, score, feedback })
  ▼
Browser
```

## Layer 5 — Gotchas, Thread-Safety, Limitations, Common Misuse
- **Audio format**: Groq Whisper expects the filename extension to match the audio codec. The `ByteArrayResource` override hardcodes `"audio.webm"`. If the browser sends `audio/mp4` (iOS Safari), the filename should be `"audio.mp4"` — mismatch can cause silent transcription failures.
- **RestTemplate is blocking**: Every call parks the HTTP thread for 1-6 seconds. Under high concurrent load, this exhausts the thread pool. Not an issue at current scale; would require `WebClient` to fix.
- **JSON fence stripping**: `replaceAll("```json\\s*", "").replaceAll("```\\s*", "")` — this is brittle. If Groq changes its markdown wrapping format, the regex may not match and `objectMapper.readTree()` will throw.
- **Score range**: The prompt asks for 0-10 but the LLM sometimes returns 0.0 or 10.0 as floats. `scoring.path("score").asInt(0)` truncates floats — a score of `9.8` becomes `9`. This is acceptable but document it.
- **Thread safety**: `InterviewService` is a Spring singleton. `RestTemplate` and `ObjectMapper` are both thread-safe. No shared mutable state — concurrent requests are safe.
