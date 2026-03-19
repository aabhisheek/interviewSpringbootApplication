# Engineering Principles

These principles govern every decision made in this codebase. They are not suggestions. They are the accumulated cost of having watched systems fail in production, watched engineers debug code at 3am that they wrote three months earlier, and watched teams slow to a crawl under the weight of complexity they created themselves.

## Hierarchy of Quality: Correct → Clear → Tested → Maintained → Efficient

In that order. Non-negotiable.

A system that is efficient but incorrect ships bugs. A system that is correct but unclear creates a maintenance burden that eventually causes bugs because no one can safely change it. A system that is correct and clear but untested will drift — someone will change it, think they understood it, and introduce a regression. Efficiency is last because in this project, the bottleneck is always Groq API latency — not Java object allocation, not HashMap lookups, not StringBuilder operations.

When you face a tradeoff, ask which level of the hierarchy you are sacrificing for which gain. "This is a bit less clear but it is twice as fast" is almost never the right call when the bottleneck is a 2-second HTTP request.

## SOLID Applied Practically

**Single Responsibility**: `InterviewService` manages all Groq interactions. `LiveKitTokenService` manages LiveKit JWTs. `AuthService` manages user registration and login. They do not cross boundaries. If you find yourself adding a Lightcast call to `InterviewService`, stop — that belongs in `LightcastApiService`. The rule is: you should be able to describe what a class does without the word "and".

**Open/Closed**: Spring beans are already open for extension via interfaces and closed for modification via `final` and encapsulation. Prefer adding a new service over modifying an existing one when requirements diverge. Adding `InterviewService2` is wrong — adding `AdaptiveInterviewStrategy` is right.

**Liskov Substitution**: Every implementation of a `UserDetails` interface must behave consistently — `CustomUserDetailsService` loads users by email; it must not return null or throw for a valid, existing user. Any new implementation must honor that contract.

**Interface Segregation**: Do not create god interfaces. `UserRepository` extends `JpaRepository<User, Long>` — it gets what it needs and nothing else. If a new service only needs `findByEmail`, do not give it the full repository — inject only what it uses.

**Dependency Inversion**: High-level modules (`InterviewService`) depend on abstractions (`RestTemplate`, `ObjectMapper`) not on concrete HTTP implementations. This is already done correctly in this codebase — maintain it.

## YAGNI — You Are Not Going to Need It

The cost of an unused abstraction is never zero. It is cognitive overhead for every engineer who reads the code. It is maintenance burden when the actual requirement arrives and differs from the imagined one. It is dead code that confuses future contributors.

Do not add a `QuestionGenerationStrategy` interface because you might want to swap providers later. Add it when you have a second provider. Do not add a `CacheManager` abstraction because you might want Redis later. Add it when you need Redis. The present requirement is the only requirement that matters. The future requirement will be different from what you imagine anyway.

## DRY — Knowledge, Not Text

DRY is about not duplicating knowledge — not about removing every repeated line of text. The Groq header construction pattern in `InterviewService` appears three times. That is duplication of knowledge — the knowledge of how to authenticate with Groq — and it should be extracted. But three different API endpoints that happen to all return `ResponseEntity<Map<String, Object>>` are not DRY violations — they represent different knowledge.

The test for DRY: would these two pieces of code always change together? If the Groq API key format changes, all three header blocks must change — extract them. If the interview endpoint and the lightcast endpoint both return 500 on errors, they represent different contracts — do not extract a shared error handler that merges their behaviour.

## Fail Fast — Validate at Boundaries, Reject Early

The entry point for every user action is a controller. The controller receives untrusted input. That is where validation happens. A null `question` field in `evaluateAnswer` should be caught at the controller with `@Valid` and a clear error message — not as a NullPointerException six layers deep in `InterviewService`.

Fail fast means: check the assumption as early as possible. If `audioData` in the request body is not valid Base64, throw immediately in the controller before decoding, before calling any service, before making any external call. The error message at the boundary is always clearer than the downstream exception.

Spring's `@Valid` + `@NotNull` / `@NotBlank` on DTOs is the mechanism for this. The DTOs in this project (`RegisterRequest`, `LoginRequest`) already use it. New request types should follow the same pattern.

## Principle of Least Surprise

Code does what its name suggests. A method called `getToken()` returns a token — it does not make a database call or send an email. A method called `validateToken()` returns a boolean — it does not throw on invalid input.

The current implementation of `JwtTokenProvider.validateToken()` silently returns false on any `JwtException` — that is correct. It would be surprising if a method named `validate` threw an exception on invalid input. The caller expected a boolean answer.

When naming, ask: if someone reads only this name and its return type, what will they expect this method to do? If the implementation does something different, rename or refactor.

## On Abstractions

Every abstraction has a creation cost, a maintenance cost, and a lifetime. Before creating an abstraction, answer three questions: What is the concrete benefit over the direct implementation? How long will this abstraction remain valid before the underlying requirements change? Who will maintain it?

A `GroqApiClient` class that wraps `RestTemplate` + headers + JSON parsing would be a legitimate abstraction — it encapsulates stable, repeated knowledge. A `QuestionProviderStrategy` interface created speculatively before there is a second provider is a premature abstraction — it adds indirection without benefit.

## On State

Immutability first. Every instance field in a Spring `@Service` singleton that is not `final` is a potential threading bug. Every `Map<String, Object> result = new HashMap<>()` that is mutated after construction is a potential aliasing bug.

Use `Map.of()`, `List.of()`, `final` fields everywhere possible. When mutable state is genuinely necessary, document why it must be mutable, minimise its scope (local > field > class > global), and document thread-safety behaviour explicitly.

`InterviewService` is a singleton. Its fields are all `final` after construction. That is correct and should be maintained.

## On Concurrency

Design to minimise shared state. The current `InterviewService` has no shared mutable state — each request creates its own local variables. This is correct and safe for concurrent requests.

If mutable state must be shared between threads, document it explicitly (`// @GuardedBy("this")`), synchronise correctly, and test under concurrent load. Do not rely on `HashMap` for shared state — use `ConcurrentHashMap`. Do not rely on compound check-then-act being atomic — use `AtomicReference` or explicit synchronisation.

`LightcastTokenService` likely has shared mutable state (the cached token and its expiry) — document and protect it.

## On Databases

The schema is the most expensive thing to change. Every new entity and every schema migration requires a Supabase migration, coordination with production data, and potentially application downtime. Think carefully before adding entities or columns.

Rule: index every column used in a `WHERE` clause or as a sort key. Supabase creates indexes for `PRIMARY KEY` and `UNIQUE` constraints automatically. Everything else is your responsibility. A missing index is a correctness issue that only manifests at scale.

`spring.jpa.hibernate.ddl-auto` must be `validate` or `none` in production. Never `create` or `create-drop` — these will destroy production data.

## On APIs

Public APIs are promises. Every field in `AuthResponse`, `AdaptiveQuestion`, `AnswerResult`, and `DetailedExplanation` is a promise to the frontend — specifically to the TypeScript interfaces in `lightcast-frontend/src/lib/api.ts`. Removing or renaming a field breaks that promise and breaks the frontend silently (TypeScript will catch it at build time, not at runtime).

Version before you need to break. If a field needs to be renamed, add the new name alongside the old name in a transition release. Remove the old name in a subsequent release. Never rename in a single step without coordination with the frontend.
