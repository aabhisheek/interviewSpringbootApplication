Read `.claude/skills/code-review.md` for context on this codebase's error handling patterns.

Spawn the debugger agent with $ARGUMENTS as the symptom. Pass:
- The exact error message or stack trace from $ARGUMENTS
- The component (backend / frontend / agent) if determinable from $ARGUMENTS
- The failing test command if it is a test failure

The debugger will follow its 7-phase protocol and return a root cause analysis and minimal fix.
