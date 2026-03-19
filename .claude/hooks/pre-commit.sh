#!/usr/bin/env bash
set -euo pipefail

# Read JSON from stdin and extract the bash command
INPUT=$(cat)

# Detect python for JSON parsing
if command -v python3 2>/dev/null; then
    PY=python3
elif command -v python 2>/dev/null; then
    PY=python
else
    # No Python available — allow commit
    echo "=== ALLOWED (no python available for hook) ==="
    exit 0
fi

# Extract the bash command from the hook input JSON
BASH_CMD=$($PY -c "
import sys, json
try:
    data = json.loads('''$INPUT''')
    print(data.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

# Only run on git commit commands
if [[ "$BASH_CMD" != *"git commit"* ]]; then
    exit 0
fi

echo "=== pre-commit: running tests before commit ==="

# Get staged files
STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")

# Determine project root (where this script's grandparent is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Detect test command from project files
TEST_CMD=""

if [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
    if [ -f "gradlew" ]; then
        TEST_CMD="./gradlew test -x :lightcast-frontend:*"
    elif [ -f "gradlew.bat" ]; then
        TEST_CMD="gradlew.bat test"
    fi
elif [ -f "pom.xml" ]; then
    TEST_CMD="mvn test -q"
elif [ -f "package.json" ]; then
    if $PY -c "import json; d=json.load(open('package.json')); exit(0 if 'test' in d.get('scripts',{}) else 1)" 2>/dev/null; then
        TEST_CMD="npm test --if-present"
    fi
elif [ -f "pyproject.toml" ] || [ -f "pytest.ini" ] || [ -f "setup.cfg" ]; then
    TEST_CMD="$PY -m pytest"
elif [ -f "go.mod" ]; then
    TEST_CMD="go test ./..."
elif [ -f "Cargo.toml" ]; then
    TEST_CMD="cargo test"
fi

if [ -z "$TEST_CMD" ]; then
    echo "=== ALLOWED (no test command detected) ==="
    exit 0
fi

echo "Running: $TEST_CMD"

if eval "$TEST_CMD"; then
    echo "=== ALLOWED ==="
    exit 0
else
    echo ""
    echo "=== BLOCKED: tests failed — fix before committing ==="
    echo "Run '$TEST_CMD' to see failures"
    exit 1
fi
