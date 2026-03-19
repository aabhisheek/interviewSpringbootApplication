# Architecture Decision Records

## ADR Template

```
## ADR-NNN — [Title]
Date: YYYY-MM-DD
Status: Proposed | Accepted | Deprecated | Superseded by ADR-NNN

### Context
What situation or problem drove this decision?

### Decision
What was decided?

### Alternatives Considered
What else was evaluated and why was it not chosen?

### Consequences
What are the positive and negative outcomes of this decision?
```

---

## ADR-001 — Use Groq API for LLM and STT Instead of OpenAI

Date: 2024-Q4 (inferred from jjwt 0.12.5 and Spring Boot 3.2.5 timeline)
Status: Accepted

### Context
The platform needs two AI capabilities: speech-to-text transcription of candidate audio answers, and LLM-based question generation and answer scoring. Both OpenAI and Groq provide these capabilities. The project uses `groq.api-url` and `groq.model=llama-3.3-70b-versatile` with `whisper-large-v3-turbo` for STT.

### Decision
Use Groq for both STT (Whisper) and LLM (LLaMA 3.3 70B) via the Groq inference API. A single API key covers both capabilities.

### Alternatives Considered
- **OpenAI GPT-4o + Whisper**: more established, but higher cost per call and lower inference speed. Groq's hardware (LPU) provides significantly faster inference for LLaMA models.
- **Self-hosted Whisper**: eliminates API cost but adds infrastructure complexity, cold start latency, and GPU provisioning overhead.
- **AWS Transcribe + Bedrock**: would eliminate the Groq dependency but would require separate AWS credentials, higher latency, and different prompt interfaces.

### Consequences
- **Positive**: single API key, fast inference, free tier available for development, same key used by both Java backend and Python agent
- **Negative**: Groq is a smaller provider than OpenAI with higher outage risk; model availability may change (LLaMA 3.3 may be deprecated in favour of future models); if model names change, both `application.properties` and `agent/.env` must be updated
- **Watch**: `groq.model` and `GROQ_MODEL` are the single points to update when upgrading models. Document in CLAUDE.md when changed.

---

## ADR-002 — Use Supabase PostgreSQL with Spring Data JPA (No Migration Tool)

Date: 2024-Q4
Status: Accepted (migration tool absence is a risk — see Consequences)

### Context
The application needs persistent user storage for registration and authentication. The `User` entity has email, password, name, role, and authProvider. The database is PostgreSQL hosted on Supabase (managed cloud service). Spring Data JPA with Hibernate is used for ORM.

### Decision
Use Supabase PostgreSQL as the database. Use Spring Data JPA with Hibernate for ORM. No migration tool (Flyway or Liquibase) is currently configured — `spring.jpa.hibernate.ddl-auto` manages schema.

### Alternatives Considered
- **Flyway**: would provide versioned, auditable schema migrations, safe for production use. Not added — adds configuration complexity for a project in early stages.
- **Liquibase**: similar to Flyway, XML/YAML based. Same tradeoff.
- **MongoDB**: document store would avoid schema migrations but loses relational integrity guarantees and JPA compatibility.
- **H2 in-memory**: development-only; a `permitAll()` on `/h2-console/**` exists in `SecurityConfig` suggesting H2 was used in dev. Production uses Supabase PostgreSQL.

### Consequences
- **Positive**: Supabase provides managed backups, connection pooling, and a SQL editor for debugging. Spring Data JPA reduces boilerplate for `findByEmail` style queries.
- **Negative**: Without Flyway/Liquibase, schema changes must be applied manually to Supabase. `ddl-auto=update` in development is convenient but dangerous — it does not handle column renames or drops. **If this project grows, add Flyway before adding the second entity.**
- **Risk**: `spring.jpa.hibernate.ddl-auto` must be `validate` or `none` in production. If it is accidentally set to `create-drop`, Supabase data will be destroyed on application restart.
- **Action required**: Add Flyway dependency and initial migration `V1__create_users_table.sql` before any production deployment that could involve schema changes.

---

## ADR-003 — Stateless JWT Authentication with Google OAuth2 Fallback

Date: 2024-Q4
Status: Accepted

### Context
The platform serves a web frontend (Next.js) and potentially mobile clients. Users can register with email/password or authenticate with Google. The backend must be stateless (no server-side sessions) to support horizontal scaling and simplify deployment.

### Decision
Use stateless JWT authentication for all endpoints. JWTs are issued at login (via `/api/auth/login`) and at OAuth2 success (via `OAuth2SuccessHandler`). Every subsequent request carries the JWT in the `Authorization: Bearer` header. `JwtAuthenticationFilter` validates the token on every request, extracts the user email, and loads the `UserDetails` from the database. No sessions, no cookies.

### Alternatives Considered
- **Spring Session + Redis**: provides server-side session management with invalidation capability. More operationally complex (requires Redis). Not needed for current scale.
- **Cookies + CSRF**: simpler for same-origin web apps, but complicates mobile clients. The current `csrf.disable()` is intentional for the stateless JWT approach — with cookies it would need to be re-enabled.
- **Auth0 / Cognito**: managed identity provider would eliminate the auth implementation entirely but adds a third-party dependency and monthly cost.

### Consequences
- **Positive**: truly stateless — no shared session store needed; any backend instance can serve any request; simple for frontend (attach Bearer token to every request)
- **Negative**: JWTs cannot be revoked before expiry without a token blacklist (not currently implemented). If a JWT is stolen, the attacker has access until the token expires. `jwt.expiration` must be set to a reasonable value (not years).
- **The `User.AuthProvider` enum**: distinguishes LOCAL (email/password) from GOOGLE (OAuth2) users. LOCAL users have a hashed password; GOOGLE users have a null password. `AuthService.login()` must not attempt password comparison for GOOGLE users — verify this is handled.
- **`/h2-console/**` is `permitAll()`**: this is safe only if H2 is not enabled in production (`spring.h2.console.enabled=false`). Verify this in `application.properties` before production deployment.
