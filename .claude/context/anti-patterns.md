# Anti-Patterns

Twenty anti-patterns, each with a name, what it is, why engineers reach for it, how to recognise it, and the correct alternative.

---

## 1 — God Object
**What it is:** A single class that knows too much or does too much. It accumulates responsibilities over time until it becomes the de facto centre of the universe.
**Why it happens:** It starts small. You add one method. Then another. Then a "this is related enough" shortcut. Six months later the class has 800 lines and 20 dependencies.
**How to recognise it:** A service with more than 5-6 injected dependencies. A class whose name ends in `Manager`, `Handler`, or `Processor` and has more than 300 lines.
**Correct alternative:** Apply Single Responsibility. `InterviewService` manages Groq API calls. `LightcastApiService` manages Lightcast API calls. They do not cross.

---

## 2 — Shotgun Surgery
**What it is:** A single logical change requires modifying many unrelated files simultaneously.
**Why it happens:** Duplication of knowledge. The same logic lives in three places and must be updated in all three.
**How to recognise it:** Changing the Groq API base URL requires editing 4 files. Changing the JWT expiry requires editing the service, the filter, and two tests.
**Correct alternative:** DRY on knowledge. Centralise: `groq.api-url` in `application.properties`, `jwt.expiration` in `application.properties`. One place to change.

---

## 3 — Primitive Obsession
**What it is:** Using primitive types (`String`, `int`, `long`) to represent domain concepts that have their own behaviour and constraints.
**Why it happens:** It seems simpler. A `String` is universal. Why create a class?
**How to recognise it:** `String skill`, `String question`, `String audioData` passed through 4 method calls. A method signature with 5+ primitive parameters in a row.
**Correct alternative:** `record InterviewRequest(String skill, int questionNumber, List<PreviousResult> history)`. Types enforce contracts at compile time.

---

## 4 — Feature Envy
**What it is:** A method that is more interested in the data of another class than its own.
**Why it happens:** Lazy placement. It was easier to call `groqApiKey` from here than to move the method.
**How to recognise it:** A method in `InterviewController` that accesses multiple fields from `InterviewService` to compute something. The computation belongs in `InterviewService`.
**Correct alternative:** Move the method to the class whose data it uses. Controllers call services; they do not replicate service logic.

---

## 5 — Anemic Domain Model
**What it is:** Entity classes that are pure data bags with no behaviour — all logic lives in service classes instead.
**Why it happens:** Spring's layered architecture encourages it. JPA entities are mapped to DB rows, services contain logic.
**How to recognise it:** `User` has only getters/setters. All `User`-related logic is in `AuthService` or scattered across controllers.
**Correct alternative:** Entities can have behaviour that operates on their own data. `user.isLocalAuth()`, `user.hasRole(Role.ADMIN)`. Do not overload entities with persistence complexity, but do not starve them of their own logic.

---

## 6 — Magic Numbers and Strings
**What it is:** Numeric or string literals embedded directly in code with no explanation.
**Why it happens:** Fast. You know what 3600000 means right now. Future-you does not.
**How to recognise it:** `new Date(nowMs + 6 * 60 * 60 * 1000)` in `LiveKitTokenService`. `if (score >= 7.5)` without a named constant.
**Correct alternative:** `private static final long TOKEN_TTL_MS = TimeUnit.HOURS.toMillis(6);`. `private static final double ADVANCED_THRESHOLD = 7.5;`. The name is the documentation.

---

## 7 — Stringly Typed
**What it is:** Using `String` to represent values that have a finite, known set of valid options.
**Why it happens:** Easy to serialise. JSON loves strings. You do not want to deal with enum serialisation.
**How to recognise it:** `String difficulty = "advanced"` compared with `.equals("advanced")` in multiple places. `String role = "USER"` checked in multiple places.
**Correct alternative:** `enum Difficulty { BEGINNER, INTERMEDIATE, ADVANCED }`. Jackson serialises/deserialises Java enums to/from JSON strings automatically. `User.Role` already uses this pattern correctly.

---

## 8 — Boolean Parameters
**What it is:** A method that takes a boolean parameter to switch between two behaviours.
**Why it happens:** Seemed like an easy way to add a variant without duplicating a method.
**How to recognise it:** `generateToken(String name, boolean includeMetadata)`. The caller reads as `generateToken("alice", true)` — what does `true` mean?
**Correct alternative:** Two named methods: `generateToken(String name)` and `generateTokenWithMetadata(String name, Map<String, String> metadata)`. Or an options object.

---

## 9 — Callback Hell (Promise Hell in TypeScript)
**What it is:** Deeply nested callbacks or `.then().then().then()` chains where error handling is scattered and flow is hard to follow.
**Why it happens:** Building async code incrementally without refactoring.
**How to recognise it:** In `lightcast-frontend/src/lib/api.ts`, if fetch calls nest inside other fetch callbacks. In the Python agent, if coroutines nest without `await`.
**Correct alternative:** `async/await` with explicit `try/catch` at the appropriate level. `await fetch()` then `await res.json()` then handle errors once at the top.

---

## 10 — Premature Abstraction
**What it is:** Creating an interface, base class, or framework before you have two concrete use cases that validate the abstraction.
**Why it happens:** Engineers want to be clever and forward-thinking. Abstractions feel like good design.
**How to recognise it:** An interface with one implementation. A base class with one subclass. A factory that creates one type.
**Correct alternative:** Write the concrete implementation. When the second use case arrives, extract the abstraction then. The abstraction will be correct because it is driven by two real cases.

---

## 11 — Accidental Complexity
**What it is:** Complexity that serves the implementation, not the problem domain. Infrastructure complexity that leaks into business logic.
**Why it happens:** The implementation detail becomes load-bearing and other code builds on it.
**How to recognise it:** `InterviewService` knowing about HTTP headers, multipart form encoding, and JSON parsing. That is all infrastructure. The business logic is: "transcribe audio, score the answer".
**Correct alternative:** Push infrastructure complexity down (a `GroqApiClient`) or up (a `GroqApiGateway`). Business services describe the what; infrastructure handles the how.

---

## 12 — Global Mutable State
**What it is:** State that can be read and written by any part of the system without coordination.
**Why it happens:** It is fast to access. It seems convenient for sharing data between components.
**How to recognise it:** Static fields that are mutated at runtime. Spring beans that store request-specific state in instance fields (data race in a singleton).
**Correct alternative:** Pass state explicitly as method parameters. Use Spring's `SecurityContextHolder` (thread-local) for request context. Make service fields `final`.

---

## 13 — Copy-Paste Inheritance
**What it is:** Duplicating code instead of properly modelling a shared concept.
**Why it happens:** Faster than designing the right abstraction. The code "works" immediately.
**How to recognise it:** `getAdaptiveQuestion()` in `InterviewService` (Java) and `generate_adaptive_question()` in `interview_agent.py` (Python) implement the same difficulty scoring algorithm identically. If the algorithm changes, it must be updated in two places.
**Correct alternative:** Make the algorithm a well-documented specification in CLAUDE.md. The duplication is unavoidable across languages, but both implementations must be kept in sync. Flag it with a comment: `// Algorithm mirrors agent/interview_agent.py:generate_adaptive_question`.

---

## 14 — Dead Code
**What it is:** Code that is never executed and never will be.
**Why it happens:** Requirements changed. A feature was removed. A refactor left an orphan.
**How to recognise it:** Methods with no callers (IDEs flag these). Commented-out code blocks. Imports that are not used.
**Correct alternative:** Delete it. Git preserves history. Dead code creates noise and false confidence.

---

## 15 — Cargo Cult Coding
**What it is:** Copying a pattern without understanding why it works.
**Why it happens:** Stack Overflow answer worked. It solved the problem. The annotation/config is cargo-culted without understanding.
**How to recognise it:** `@SuppressWarnings("unchecked")` without an explanation of why the cast is safe. `csrf.disable()` without understanding why it is correct for a stateless JWT API.
**Correct alternative:** Understand every line you copy. If you cannot explain why `@SuppressWarnings("unchecked")` is safe in a specific location, the suppression is not safe.

---

## 16 — Spaghetti Error Handling
**What it is:** Error handling logic scattered throughout the code with inconsistent strategies — sometimes log, sometimes throw, sometimes return null, sometimes return an error object.
**Why it happens:** Each error case was handled as it was discovered, with no consistent policy.
**How to recognise it:** In `InterviewController`, the pattern is consistent — log + return error map. If a new endpoint wraps exceptions differently (swallowing, rethrowing, returning null), it is spaghetti.
**Correct alternative:** One error-handling strategy per layer. Controllers: catch, log, return structured error response. Services: let exceptions propagate to the controller (they are caught there). The current pattern is correct — maintain it.

---

## 17 — Silent Failures
**What it is:** An operation fails and the system continues as if it succeeded, with no error reported.
**Why it happens:** Empty `catch {}`. Returning null or an empty result on failure. `Optional.ifPresent()` without an else.
**How to recognise it:** The system "works" but produces wrong results. Interviews where every answer gets score 0 with no error logged.
**Correct alternative:** Every failure path produces a signal — an exception, a logged error, or a structured error response. Never return success when an operation failed.

---

## 18 — Security Through Obscurity
**What it is:** Relying on the difficulty of finding something as a security control, rather than on actual cryptographic or authorization mechanisms.
**Why it happens:** It is easy. "No one will guess this endpoint."
**How to recognise it:** An endpoint that is "protected" by not being documented. A room name that is "secret" because it is a UUID. Relying on `cors.allowed-origins` as the only check.
**Correct alternative:** Every protected resource requires explicit authorization — JWT validation in `JwtAuthenticationFilter`, Spring Security's `authorizeHttpRequests()`. Obscurity is additional hardening, not the primary control.

---

## 19 — Optimistic Locking Without Retry
**What it is:** Using optimistic locking (`@Version`) to detect conflicts but not implementing the retry logic that makes it useful.
**Why it happens:** Adding `@Version` is one line. Writing correct retry logic is twenty lines.
**How to recognise it:** `@Version` on an entity, but no `@Retryable` or manual retry loop on the service method.
**Correct alternative:** If you use `@Version`, implement retry with backoff for `ObjectOptimisticLockingFailureException`. If the use case does not need optimistic locking, do not add `@Version`.

---

## 20 — N+1 Queries
**What it is:** Loading a collection of entities (1 query) then loading each entity's associations with a separate query (N queries).
**Why it happens:** JPA lazy loading. You access `user.getSessions()` inside a loop — each access fires a SELECT.
**How to recognise it:** `spring.jpa.show-sql=true` shows many identical SELECTs with different ID parameters in a single request.
**Correct alternative:** `JOIN FETCH` in `@Query`, or `@EntityGraph`, or `findAllById(Collection<ID>)` for batch loading. In this project, currently not an issue (no associations loaded in loops), but it will be the first problem when interview sessions are persisted.
