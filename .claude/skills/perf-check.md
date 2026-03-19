---
name: perf-check
description: Hot-path performance checklist for this Spring Boot / Next.js interview platform.
---

# Performance Check Skill

The dominant latency in this system is Groq API calls (1-6s per request). All other concerns are secondary but real. Scan in this order.

## Checklist

### 1 — Sequential Blocking Groq Calls [HIGH]
**What to look for:** Multiple `restTemplate.exchange()` calls in one method, not parallelised.
**Location in this project:** `InterviewService.evaluateAnswer()` → `transcribeAudio()` → `scoreAnswer()` (sequential, correct for dependent calls). Flag any new code that chains a THIRD independent Groq call.
**Fix:** `CompletableFuture.supplyAsync()` with a shared `ExecutorService` for independent calls.
**Measure:** Log `System.nanoTime()` before/after each exchange call. Total > 8s = needs parallelism.

### 2 — String Concatenation in Loops [MEDIUM]
**What to look for:** `String` += inside a loop, or `StringBuilder.append()` building prompts from collections.
**Location:** `InterviewService.getAdaptiveQuestion()` — the `history` `StringBuilder` grows with each previous result. Acceptable at 8 questions.
**Fix:** If `TOTAL_QUESTIONS` exceeds 20, summarise instead of appending all history verbatim.
**Measure:** Print `prompt.length()` for a full interview session. > 4000 chars = summarise.

### 3 — Allocations in Audio Processing [LOW]
**What to look for:** `byte[]` copy, `Base64` decode, `ByteArrayResource` construction — each per request.
**Status:** Current implementation allocates once per request. No loop. Acceptable.
**Flag if:** Audio bytes are decoded, then re-encoded, or copied multiple times in one request path.
**Measure:** JVM heap allocation profiling in VisualVM — should be < 5MB per request at typical audio size.

### 4 — N+1 Database Queries [MEDIUM — future risk]
**What to look for:** Repository call inside a loop or stream `.forEach()`.
**Current state:** Only `findByEmail()` in the JWT filter — called once per request, correct.
**Future risk:** If interview sessions are persisted and a "list my sessions" endpoint is added without JOIN FETCH.
**Detect:** `Grep pattern="repository\." path="src/main/java/` — look for loop context.
**Fix:** `@Query("SELECT s FROM Session s JOIN FETCH s.user WHERE s.user.id = :userId")`.
**Measure:** `spring.jpa.show-sql=true` + count SQL statements per request in logs.

### 5 — Missing Database Indexes [MEDIUM — future risk]
**Current entities:** `User` with `email @Column(unique=true)` — Supabase creates a unique index automatically.
**Future risk:** Any new entity where `findBy*` repository methods are added without `@Index` on the filter column.
**Fix:** `@Table(indexes = @Index(name = "idx_session_user", columnList = "user_id"))` on new entities.
**Measure:** `EXPLAIN ANALYZE` on the query in Supabase SQL editor — look for `Seq Scan` on large tables.

### 6 — Lightcast Token Refresh per Request [MEDIUM]
**What to look for:** `LightcastTokenService.getAccessToken()` — does it make an HTTP call on every invocation?
**Fix:** Cache token in instance field with expiry timestamp; refresh only when within 60s of expiry.
**Measure:** Add `log.debug("Refreshing Lightcast token")` and count calls in a test session.

### 7 — Blocking I/O on React Render Path [MEDIUM]
**What to look for:** In `lightcast-frontend/src/`: `await fetch()` calls without loading state — user sees frozen UI.
**Location to check:** `InterviewRoom.tsx`, `VoiceInterviewRoom.tsx` — do they show a loading indicator while waiting for Groq (1-6s)?
**Fix:** Set `loading = true` before `submitInterviewAnswer()`, clear after.
**Measure:** Lighthouse performance audit — look for LCP and CLS during answer submission.

### 8 — Unbounded Frontend State [LOW]
**What to look for:** Results array that grows indefinitely across an interview session.
**Location:** `previousResults` state in interview page components.
**Current status:** Bounded by `TOTAL_QUESTIONS = 8` — acceptable.
**Fix if changed:** Cap at `totalQuestions` value; do not keep unlimited history in React state.

### 9 — Missing Pagination [HIGH — future risk]
**What to look for:** Any endpoint returning a list without `Pageable` parameter.
**Current status:** No list endpoints exist for persisted data — `getQuestions()` generates exactly 10 via LLM prompt.
**Fix for future endpoints:** Accept `@RequestParam int page, @RequestParam int size` and use `Pageable`.

## Output Format
```
[HIGH/MEDIUM/LOW] file:line
  Issue: what the problem is
  Fix: concrete change required
  Measure: how to quantify improvement
```
