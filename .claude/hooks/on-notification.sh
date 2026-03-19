#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)

# Detect python
if command -v python3 2>/dev/null; then
    PY=python3
elif command -v python 2>/dev/null; then
    PY=python
else
    exit 0
fi

# Extract notification message
MSG=$($PY -c "
import sys, json
try:
    data = json.loads('''$INPUT''')
    msg = data.get('message', '') or data.get('notification', '') or str(data)
    print(msg.lower())
except Exception:
    print('')
" 2>/dev/null || echo "")

# Pattern match and print actionable hints
if [[ "$MSG" == *"permission denied"* ]] || [[ "$MSG" == *"not allowed"* ]] || [[ "$MSG" == *"blocked"* ]]; then
    echo "HINT: Permission denied — check .claude/settings.json permissions section."
    echo "      Add the command pattern to the 'allow' list, or approve it when prompted."

elif [[ "$MSG" == *"tool error"* ]] || [[ "$MSG" == *"tool failed"* ]]; then
    echo "HINT: Tool error — run /debug with the error message for structured diagnosis."

elif [[ "$MSG" == *"context limit"* ]] || [[ "$MSG" == *"too long"* ]] || [[ "$MSG" == *"context window"* ]]; then
    echo "HINT: Context limit approaching — break the task into phases."
    echo "      Use subagents (via Agent tool) for file-heavy research tasks."
    echo "      Focus on one file or one method at a time."

elif [[ "$MSG" == *"rate limit"* ]]; then
    echo "HINT: Rate limit hit — wait 60 seconds, then retry."
    echo "      If persistent, reduce parallel agent invocations."

elif [[ "$MSG" == *"no such file"* ]] || [[ "$MSG" == *"not found"* ]] || [[ "$MSG" == *"enoent"* ]]; then
    echo "HINT: File not found — verify the path with Glob tool."
    echo "      Check .claudeignore — application.properties and .env are excluded intentionally."
    echo "      Source root: src/main/java/com/app/demo/"
    echo "      Frontend root: lightcast-frontend/src/"
    echo "      Agent root: agent/"

elif [[ "$MSG" == *"groq"* ]] && [[ "$MSG" == *"401"* ]]; then
    echo "HINT: Groq 401 — API key invalid or not set."
    echo "      Check groq.api-key in application.properties (backend)"
    echo "      Check GROQ_API_KEY in agent/.env (Python agent)"

elif [[ "$MSG" == *"groq"* ]] && [[ "$MSG" == *"429"* ]]; then
    echo "HINT: Groq 429 rate limit — reduce request frequency."
    echo "      In dev, add delays between test calls."
    echo "      Consider request deduplication or response caching."

elif [[ "$MSG" == *"jwt"* ]] || [[ "$MSG" == *"401"* ]] || [[ "$MSG" == *"unauthorized"* ]]; then
    echo "HINT: Auth failure — check:"
    echo "      1. jwt.secret in application.properties (must be ≥32 chars)"
    echo "      2. jwt.expiration (milliseconds — 86400000 = 24h)"
    echo "      3. Authorization: Bearer <token> header sent by frontend"
    echo "      4. SecurityConfig.authorizeHttpRequests() for endpoint auth level"

elif [[ "$MSG" == *"cors"* ]]; then
    echo "HINT: CORS error — check cors.allowed-origins in application.properties."
    echo "      Must match the exact frontend origin (including port): http://localhost:3000"
    echo "      Do not use * with allowCredentials=true."
fi
