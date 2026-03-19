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

# Extract command and exit code
BASH_CMD=$($PY -c "
import sys, json
try:
    data = json.loads('''$INPUT''')
    print(data.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

EXIT_CODE=$($PY -c "
import sys, json
try:
    data = json.loads('''$INPUT''')
    print(data.get('tool_response', {}).get('exit_code', '0'))
except Exception:
    print('0')
" 2>/dev/null || echo "0")

# PR creation success — print review checklist
if [[ "$BASH_CMD" == *"gh pr create"* ]] && [ "$EXIT_CODE" = "0" ]; then
    echo ""
    echo "┌─────────────────────────────────────────┐"
    echo "│           PR Review Checklist           │"
    echo "├─────────────────────────────────────────┤"
    echo "│ ✓ ./gradlew test passes                 │"
    echo "│ ✓ npm run build passes (frontend)       │"
    echo "│ ✓ No secrets in source                  │"
    echo "│ ✓ AuthResponse / AnswerResult unchanged │"
    echo "│ ✓ New @Value props in CLAUDE.md          │"
    echo "│ ✓ Run /security on changed files        │"
    echo "│ ✓ CHANGELOG updated if user-facing      │"
    echo "│ ✓ Reviewer assigned                     │"
    echo "└─────────────────────────────────────────┘"
    exit 0
fi

# Command failed — print ecosystem-specific debug hints
if [ "$EXIT_CODE" != "0" ]; then
    echo ""
    echo "=== Command failed (exit $EXIT_CODE) — debug hints: ==="

    if [[ "$BASH_CMD" == *"gradlew"* ]] || [[ "$BASH_CMD" == *"gradle"* ]]; then
        echo "  Java/Gradle failure:"
        echo "  • Check JAVA_HOME — must be Java 17+"
        echo "  • Run: ./gradlew dependencies to resolve deps"
        echo "  • Check @Value properties exist in application.properties"
        echo "  • Full output: ./gradlew test --info"
        echo "  • Single test: ./gradlew test --tests 'com.app.demo.XxxTest' --info"

    elif [[ "$BASH_CMD" == *"npm"* ]] || [[ "$BASH_CMD" == *"next"* ]]; then
        echo "  Node/Next.js failure:"
        echo "  • Run: cd lightcast-frontend && npm install"
        echo "  • TypeScript error? Run: npm run build for full diagnostics"
        echo "  • ESLint? Run: npm run lint"
        echo "  • Check NEXT_PUBLIC_API_BASE env var is set"

    elif [[ "$BASH_CMD" == *"python"* ]] || [[ "$BASH_CMD" == *"pytest"* ]] || [[ "$BASH_CMD" == *"pip"* ]]; then
        echo "  Python failure:"
        echo "  • Activate venv: source agent/.venv/bin/activate (or agent\\.venv\\Scripts\\activate on Windows)"
        echo "  • Run: pip install -r agent/requirements.txt"
        echo "  • Check agent/.env exists and has GROQ_API_KEY, LIVEKIT_URL"
        echo "  • Import error? Check livekit-agents version >= 0.11.0"

    elif [[ "$BASH_CMD" == *"git"* ]]; then
        echo "  Git failure:"
        echo "  • Check git status for uncommitted changes or merge conflicts"
        echo "  • If push rejected: pull first, resolve conflicts"
        echo "  • Never force-push to main"

    elif [[ "$BASH_CMD" == *"docker"* ]]; then
        echo "  Docker failure:"
        echo "  • Check Docker daemon is running"
        echo "  • Check for port conflicts: netstat -an | grep 8080"
        echo "  • Check image build logs for missing env vars"

    else
        echo "  • Examine the error output above"
        echo "  • Run /debug with the error message for structured analysis"
    fi
    echo ""
fi
