---
name: code-review
description: Full review protocol for the reviewer agent. Spring Boot + Next.js + Python checklist.
---

# Code Review Skill

## Review Philosophy
Code review is for correctness and shared understanding. Style is the linter's job. A review comment is either a required fix (❌) — something that is incorrect, unsafe, or breaks a contract — or a suggestion (⚠️) — a better approach, worth discussing but not blocking.

## The Checklist

### Correctness
- [ ] Logic matches the stated intent — trace every branch manually
- [ ] Null/empty inputs handled: `audioBase64` could be null, `skill` could be empty, Groq response could be malformed
- [ ] JSON stripping applied before `objectMapper.readTree()` in all Groq response parsing
- [ ] `Base64.getDecoder().decode()` called only once per request (not decoded then re-encoded)
- [ ] `avgScore` computed correctly — empty `previousResults` defaults to 5.0 (intermediate)
- [ ] `LightcastTokenService` token caching does not serve an expired token

### Error Handling
- [ ] Every `catch` block: logs with `log.error("message: {}", e.getMessage(), e)` OR rethrows OR returns structured error response
- [ ] No empty `catch {}` anywhere
- [ ] `HttpClientErrorException` and `HttpServerErrorException` re-thrown (not swallowed) in `InterviewService` — verify pattern maintained in new code
- [ ] Error responses always `{ "error": "descriptive message" }` — never expose stack traces to the client

### Test Coverage
- [ ] New endpoint has a `@WebMvcTest` test
- [ ] New service method has a Mockito unit test
- [ ] No `Thread.sleep()` in tests
- [ ] No hardcoded real credentials in test files

### Naming
- [ ] Controllers: `NounController`, HTTP-action verb methods
- [ ] Services: `NounService`, `verbNoun` methods
- [ ] DTOs: `NounRequest`, `NounResponse` — never raw `Map<String, Object>` as a public API
- [ ] Variables describe what they hold: `interviewToken`, `groqResponseBody`, not `result`, `data`, `tmp`

### API Contracts — CRITICAL for this project
- [ ] `AuthResponse` shape unchanged: `{ token, email, name }` — `api.ts:34`
- [ ] `AdaptiveQuestion` shape unchanged: `{ question, difficulty, proficiency, avgScore }` — `api.ts:121`
- [ ] `AnswerResult` shape unchanged: `{ transcript, score, feedback }` — `api.ts:147`
- [ ] `DetailedExplanation` shape unchanged: `{ detailedAnswer, codeExample, language, bonusTip, relatedQuestion, additionalInfo }` — `api.ts:153`
- [ ] New endpoints added to `SecurityConfig.authorizeHttpRequests()` with correct auth level

### Security
- [ ] No API keys in source — all from `@Value("${property}")`
- [ ] User-supplied strings going into Groq prompts: length-limited and control-char stripped
- [ ] `cors.allowed-origins` not hardcoded — comes from property
- [ ] No new `permitAll()` added without explicit justification

### Performance
- [ ] No new sequential Groq calls that could be parallelised
- [ ] No DB query inside a loop
- [ ] New list endpoints include `Pageable` parameter

### Style
- [ ] `@Slf4j` present on every class that logs
- [ ] `@RequiredArgsConstructor` used (not `@Autowired` field injection)
- [ ] Java: no `System.out.println`
- [ ] TypeScript: no `any` types, no `console.log` left in
- [ ] ESLint passes: `cd lightcast-frontend && npm run lint`

### Documentation
- [ ] New `@Value` properties documented in CLAUDE.md
- [ ] New `agent/.env` keys documented in `agent/.env.example`
- [ ] New npm packages listed in `package.json` with justification in PR description

## Verdict Rubric

**APPROVE**: zero ❌ items. ⚠️ items are noted but do not block.

**REQUEST CHANGES**: one or more ❌ items. Must be resolved before merge.

**NEEDS DISCUSSION**: no correctness bugs, but a design decision (API shape change, new dependency, new external service call) needs human input.

## Response Format
```
### Required (❌)
- src/main/java/.../InterviewService.java:212 — empty catch swallows JsonProcessingException — add log.error() or rethrow

### Suggestions (⚠️)
- src/main/java/.../InterviewService.java:103 — groqHeaders() extracted here would remove duplication in 3 methods

### Passed (✅)
- Correctness: all branches handled
- Error handling: catch blocks all log correctly
- Security: no secrets in source, CORS correct

### Verdict
REQUEST CHANGES
Reason: empty catch at line 212 would silence JSON parse failures silently
```
