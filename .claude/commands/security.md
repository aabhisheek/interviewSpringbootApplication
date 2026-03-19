Spawn the security-analyst agent on $ARGUMENTS.

If no argument, scan: `src/main/java/com/app/demo/`, `lightcast-frontend/src/`, `agent/`.

Priority scans for this project:
1. Groq API key, LiveKit secret, JWT secret, AWS credentials — must not appear in source
2. Prompt injection via user-supplied skill/question/transcript fields in InterviewService
3. CORS misconfiguration in SecurityConfig
4. H2 console exposure (`/h2-console/**` is permitted in SecurityConfig)
5. `npm audit` on lightcast-frontend dependencies

Returns CRITICAL/HIGH/MEDIUM/LOW findings with file:line, CWE, and concrete fix.
