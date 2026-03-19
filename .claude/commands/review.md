Spawn the reviewer agent.

If $ARGUMENTS is a PR number: review that PR using `gh pr diff $ARGUMENTS`.
If $ARGUMENTS is a file path: review that specific file.
If $ARGUMENTS is a git range (e.g. `main..HEAD`): review that diff with `git diff $ARGUMENTS`.
If no argument: review `git diff main..HEAD`.

The reviewer will apply the full checklist from `.claude/agents/reviewer.md` and return Required Changes (❌), Suggestions (⚠️), and a APPROVE / REQUEST CHANGES verdict.
