Read `.claude/skills/perf-check.md` for the hot-path checklist.

Scan $ARGUMENTS for performance issues. If no argument, scan `src/main/java/com/app/demo/service/InterviewService.java` (the primary hot path in this project).

Focus on: sequential Groq API calls, Lightcast token caching, N+1 DB query patterns, missing pagination, and unbounded state accumulation.

Output: [HIGH/MEDIUM/LOW] file:line — issue — fix — how to measure.
