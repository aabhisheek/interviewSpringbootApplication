Read `.claude/skills/refactor.md` for the full protocol and 5 refactor types.

Apply to $ARGUMENTS (a file path, class name, or method name in this project).

The refactorer will:
1. Read the full target file
2. Grep for all callers in `src/` and `lightcast-frontend/src/`
3. Pick exactly one refactor goal (state it before starting)
4. Apply the minimal change
5. Run `./gradlew test` to verify green
