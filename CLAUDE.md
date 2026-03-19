# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered adaptive technical interview platform. Candidates log in, pick a skill topic, and conduct a full spoken interview with an AI. The system generates questions of increasing or decreasing difficulty based on rolling answer scores, transcribes audio via Groq Whisper, scores answers via Groq LLaMA, and returns detailed model answers with code examples. A separate Python voice agent joins LiveKit rooms to conduct fully voice-driven interviews using Microsoft Edge TTS for speech synthesis.

The platform has three independently deployable components that must work together: a Spring Boot REST API backend, a Next.js frontend, and a Python LiveKit voice agent.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend language | Java | 17 |
| Backend framework | Spring Boot | 3.2.5 |
| Build tool | Gradle | wrapper (gradlew) |
| Database | PostgreSQL via Supabase | - |
| ORM | Spring Data JPA + Hibernate | Spring Boot managed |
| Auth | Spring Security + JWT (jjwt) | 0.12.5 |
| OAuth2 | Spring OAuth2 Client (Google) | Spring Boot managed |
| AI / LLM | Groq API — llama-3.3-70b-versatile | - |
| AI / STT | Groq Whisper — whisper-large-v3-turbo | - |
| Voice / WebRTC | LiveKit (cloud or self-hosted) | - |
| Email | AWS SES SDK v2 | 2.25.27 |
| Skills data | Lightcast API | - |
| Boilerplate | Lombok | - |
| Frontend language | TypeScript | ^5 |
| Frontend framework | Next.js (App Router) | 16.1.6 |
| Frontend UI | React | 19.2.3 |
| CSS | TailwindCSS | ^4 |
| LiveKit UI | @livekit/components-react | 2.9.19 |
| Frontend lint | ESLint + eslint-config-next | 9 / 16.1.6 |
| Voice agent | Python | 3.x |
| Agent framework | livekit-agents | >=0.11.0 |
| Agent LLM client | groq (Python SDK) | >=0.9.0 |
| Agent TTS | edge-tts (Microsoft, free) | >=6.1.9 |
| Agent VAD | livekit-plugins-silero | >=0.6.0 |

## Build & Run Commands

### Backend (Spring Boot)
```bash
# Install / resolve dependencies
./gradlew dependencies

# Build everything + run tests
./gradlew build

# Build without tests
./gradlew build -x test

# Run the application (port 8080)
./gradlew bootRun

# Run all tests
./gradlew test

# Run a single test class
./gradlew test --tests "com.app.demo.SomeTest"

# Run with verbose test output
./gradlew test --info
```
On Windows use `gradlew.bat` in place of `./gradlew`.

### Frontend (Next.js — lightcast-frontend/)
```bash
cd lightcast-frontend
npm install
npm run dev       # http://localhost:3000
npm run build
npm run start     # production server
npm run lint
```

### Python Voice Agent (agent/)
```bash
cd agent
pip install -r requirements.txt
cp .env.example .env   # fill in credentials
python interview_agent.py dev    # local/dev mode
python interview_agent.py start  # production worker
```

## Multi-Agent System

| Agent | Model | File | When to use |
|---|---|---|---|
| `coordinator` | claude-opus-4-6 | `.claude/agents/coordinator.md` | Multi-step tasks needing 2+ agents |
| `architect` | claude-opus-4-6 | `.claude/agents/architect.md` | New feature design before coding |
| `reviewer` | claude-sonnet-4-6 | `.claude/agents/reviewer.md` | Code review of diffs, PRs, files |
| `debugger` | claude-sonnet-4-6 | `.claude/agents/debugger.md` | Any failure: compile, test, runtime |
| `test-writer` | claude-sonnet-4-6 | `.claude/agents/test-writer.md` | Generate JUnit 5 tests |
| `security-analyst` | claude-opus-4-6 | `.claude/agents/security-analyst.md` | OWASP scan + secrets detection |
| `performance-analyst` | claude-sonnet-4-6 | `.claude/agents/performance-analyst.md` | Hot-path and N+1 analysis |
| `refactorer` | claude-sonnet-4-6 | `.claude/agents/refactorer.md` | Safe refactors with caller verification |
| `migrator` | claude-haiku-4-5 | `.claude/agents/migrator.md` | Bulk deprecated-API migrations |

### Slash Commands
| Command | Purpose |
|---|---|
| `/test` | Run `./gradlew test` (or scope to a class with argument) |
| `/lint` | Run ESLint on frontend; report Java style issues |
| `/debug` | 7-phase structured debugging session |
| `/review` | Full code review with this project's checklist |
| `/refactor` | Safe refactor — reads callers, verifies tests |
| `/explain` | 5-layer code/concept explanation |
| `/write-test` | Full test plan + JUnit 5 output |
| `/architect` | 8-phase design doc for new features |
| `/perf` | Hot-path scan (N+1, allocations in loops, missing indexes) |
| `/security` | OWASP Top 10 + Groq API key exposure scan |
| `/changelog` | Generate CHANGELOG entry from git diff |
| `/ship` | Pre-ship checklist: tests → lint → security → perf → secrets |

## Core Engineering Rules

**Read before touching.** Read the full file before suggesting any change. Spring Boot services have non-obvious dependency injection wiring. `InterviewService` takes all Groq config via constructor injection — don't assume field injection.

**Smallest change that solves the actual problem.** This codebase uses `RestTemplate` synchronously — don't refactor to `WebClient` unless that is explicitly the task. Don't fix adjacent code while fixing the real bug.

**No magic or implicit behaviour.** Every `@Value("${property.key}")` must have a corresponding key in `application.properties`. Never rely on Spring Boot auto-configuration you haven't verified exists.

**Immutability first.** Prefer `final` fields, `Map.of()`, `List.of()`. Only use mutable state when the use case demands it. The Groq request/response maps are already built with `Map.of()` — follow that pattern.

**Fail fast with clear error messages.** Never swallow exceptions with an empty `catch`. Every catch in this codebase either logs and rethrows or logs and returns an error response — maintain that pattern.

**Tests pass before any task is considered done.** Command: `./gradlew test`. The test suite must be green before any commit is considered complete.

**Names are the most important design decision per line of code.** `InterviewService.scoreAnswer()` is clear. `InterviewService.doStuff()` is not. Method names in this project are verb-noun — maintain that convention.

**One function does one thing.** `evaluateAnswer()` delegates: it calls `transcribeAudio()` then `scoreAnswer()`. Those three methods each do exactly one thing. Don't collapse them.

**Every dependency is a liability.** This project has 11 runtime dependencies in `build.gradle`. Before adding another, state what it replaces and why the existing approach is insufficient.

**Measure before optimizing.** `RestTemplate` calls to Groq are the bottleneck, not Java object allocation. Don't optimize Java data structures while HTTP latency dominates.

## What Claude Must NEVER Do

- Never run `rm -rf`, `git clean -f`, or wildcard deletes without explicit approval
- Never `git push --force` to main
- Never commit `.env` files, `application.properties` with real credentials, API keys, or tokens
- Never skip tests with `--no-verify` or `-x test` unless the user explicitly commands it
- Never add a dependency to `build.gradle` or `package.json` without stating the justification and getting approval
- Never break the `AuthResponse` / `AuthController` / `AuthService` contract without flagging it as a breaking change — the frontend's `api.ts` depends on the exact shape
- Never amend a published commit — create a new one
- Never suppress compiler warnings or ESLint errors — fix them
- Never write `catch {}` or `catch (Exception e) { }` — always log with `log.error()` or rethrow
- Never hardcode Groq API keys, LiveKit secrets, JWT secrets, or AWS credentials in source files
- Never add `System.out.println` or `console.log` to production code — use `@Slf4j` / `log.info/error` in Java, structured logging in the agent
