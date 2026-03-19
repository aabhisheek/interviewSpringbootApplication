# Conventions

Naming conventions, file organisation, and process conventions for this Spring Boot / Next.js / Python project.

---

## Java (Spring Boot — Primary Language)

### Naming
| Construct | Convention | Example |
|---|---|---|
| Class | PascalCase noun | `InterviewService`, `JwtTokenProvider` |
| Interface | PascalCase noun (no `I` prefix) | `UserDetails` not `IUserDetails` |
| Method | camelCase verbNoun | `evaluateAnswer`, `generateToken`, `getAdaptiveQuestion` |
| Variable | camelCase noun describing content | `interviewToken`, `groqResponseBody`, `avgScore` |
| Constant | UPPER_SNAKE_CASE | `TOTAL_QUESTIONS`, `TOKEN_TTL_MS` |
| Package | lowercase.dots | `com.app.demo.service` |
| Test class | TestedClass + `Test` | `InterviewServiceTest`, `JwtTokenProviderTest` |
| Test method | `method_scenario_expectedResult` | `evaluateAnswer_blankTranscript_usesFallbackText` |

### Annotations (in order)
```java
@RestController          // type-level
@RequestMapping("/api/interview")
@RequiredArgsConstructor // Lombok — always use over @Autowired field injection
@Slf4j                   // Lombok logger — on every class that logs
public class InterviewController {
```

### Method Length
- Target: under 40 lines
- Hard limit: 80 lines — if you hit this, split responsibilities
- `InterviewService.evaluateAnswer()` is 4 lines — the private methods do the work
- `InterviewService.getAdaptiveQuestion()` is ~50 lines and is near the limit — candidate for extraction

### Constructor Injection Pattern
```java
// CORRECT — all @Value fields + injected beans via constructor
public InterviewService(
        LiveKitTokenService liveKitTokenService,
        @Value("${livekit.ws-url}") String wsUrl,
        @Value("${groq.api-key}") String groqApiKey) {
    this.liveKitTokenService = liveKitTokenService;
    this.wsUrl = wsUrl;
    this.groqApiKey = groqApiKey;
}

// WRONG — do not use
@Autowired
private InterviewService interviewService;
```

### Error Handling Pattern
```java
// Controller layer — catch, log, return structured response
try {
    return ResponseEntity.ok(service.doWork());
} catch (HttpClientErrorException e) {
    return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getResponseBodyAsString()));
} catch (Exception e) {
    log.error("Failed to do work: {}", e.getMessage(), e);
    return ResponseEntity.internalServerError().body(Map.of("error", "..."));
}

// Service layer — let exceptions propagate (controller catches them)
// OR wrap with specific message:
throw new RuntimeException("Transcription failed", e);
```

### Import Order
1. `java.*` — stdlib
2. `jakarta.*` — Jakarta EE
3. `org.springframework.*` — Spring
4. `io.jsonwebtoken.*`, `software.amazon.*`, `com.fasterxml.*` — third-party
5. `com.app.demo.*` — internal (blank line separating each group)

### Properties Naming
Keys follow `{component}.{sub-component}.{property}`:
- `groq.api-key`, `groq.api-url`, `groq.model`, `groq.temperature`, `groq.max-tokens`
- `livekit.api.key`, `livekit.api.secret`, `livekit.ws-url`
- `lightcast.client-id`, `lightcast.client-secret`, `lightcast.base-url`
- `jwt.secret`, `jwt.expiration`
- `cors.allowed-origins`

---

## TypeScript (Next.js Frontend — Secondary Language)

### Naming
| Construct | Convention | Example |
|---|---|---|
| Component | PascalCase | `InterviewRoom`, `DetailedExplanationPanel` |
| Hook | camelCase with `use` prefix | `useAuth`, `useInterview` |
| API function | camelCase verbNoun | `getAdaptiveQuestion`, `submitInterviewAnswer` |
| Interface | PascalCase noun | `AdaptiveQuestion`, `AnswerResult` |
| Type alias | PascalCase noun | `Difficulty`, `AuthState` |
| File (page) | kebab-case or directory with `page.tsx` | `interview/page.tsx` |
| File (component) | PascalCase.tsx | `InterviewRoom.tsx` |
| Env variable | `NEXT_PUBLIC_` prefix for client-side | `NEXT_PUBLIC_API_BASE` |

### API Function Pattern (all in `src/lib/api.ts`)
```typescript
export interface XxxResponse {
  field: string;
  count: number;
}

export async function getXxx(param: string): Promise<XxxResponse> {
  const res = await fetch(`${API_BASE}/api/xxx/${encodeURIComponent(param)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to get xxx");
  }
  return res.json();
}
```

### No `any` Types
TypeScript's `any` is as dangerous as Java's raw `Map`. Every API response must have an explicit interface.

### Import Order
1. React and Next.js (`react`, `next/*`)
2. Third-party libraries (`livekit-client`, `@livekit/components-react`)
3. Internal (`../lib/api`, `../context/AuthContext`, `../components/*`)

---

## Python (Voice Agent)

### Naming
| Construct | Convention | Example |
|---|---|---|
| Module | snake_case | `interview_agent.py` |
| Function | snake_case verbNoun | `generate_adaptive_question`, `transcribe_audio` |
| Class | PascalCase | `QuestionResult` |
| Constant | UPPER_SNAKE_CASE | `TOTAL_QUESTIONS`, `SILENCE_THRESHOLD_MS` |
| Variable | snake_case | `avg_score`, `audio_chunks` |

### Typing
Use `dataclass` for structured results:
```python
@dataclass
class QuestionResult:
    question: str
    transcript: str
    score: int
    feedback: str
    difficulty: str
```

---

## File Organisation

### Backend — Group by Feature, Not by Type (aspirational)
Current: `controller/`, `service/`, `model/`, `repository/`, `security/`, `config/`
This is the standard Spring Boot convention — maintain it as long as the project is small enough that this does not cause friction. When interview-related files outnumber auth-related files 3:1, consider grouping by feature: `interview/`, `auth/`, `lightcast/`.

### Test File Placement
```
src/test/java/com/app/demo/
  controller/InterviewControllerTest.java
  service/InterviewServiceTest.java
  security/JwtTokenProviderTest.java
```
Mirror the main source structure.

---

## Git Commit Format

Conventional Commits with project-specific scopes:
```
type(scope): subject

body (optional, wrap at 72 chars)
```

**Types:** `feat`, `fix`, `perf`, `refactor`, `test`, `chore`, `docs`

**Scopes:** `interview`, `auth`, `lightcast`, `agent`, `frontend`, `security`, `config`

**Examples:**
```
feat(interview): add adaptive-question endpoint with difficulty scaling
fix(auth): handle expired JWT tokens with 401 instead of 500
perf(interview): cache Lightcast OAuth2 token to reduce external calls
fix(agent): try audio/mp4 MIME type for iOS Safari recording compatibility
chore(deps): bump @livekit/components-react to 2.9.19
```

## PR Conventions

**Title:** `type(scope): subject` — same as commit format, 72 chars max

**Description template:**
```markdown
## What
[1-2 sentences: what changed]

## Why
[1-2 sentences: what problem this solves or what requirement it meets]

## How
[Key implementation decisions, anything non-obvious]

## Testing
[How to verify this works: test command, manual steps, screenshots]

## Checklist
- [ ] `./gradlew test` passes
- [ ] `cd lightcast-frontend && npm run build` passes
- [ ] No secrets in source
- [ ] New @Value properties documented in CLAUDE.md
```

## Code Review Etiquette

A ❌ comment is a required change — the PR should not merge without addressing it.
A ⚠️ comment is a suggestion — the author decides whether to accept it. No response needed beyond thumbs-up.
Every ❌ comment must cite a specific reason — not "I don't like this", but "this breaks X contract because Y".
Authors respond to every ❌ comment before requesting re-review.
