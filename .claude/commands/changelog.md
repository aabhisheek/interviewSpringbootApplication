Read `.claude/skills/changelog.md` for format rules.

Generate a CHANGELOG entry from `git diff main..HEAD`.

Sections to include (only if applicable):
- Breaking Changes (any `AuthResponse`, `AdaptiveQuestion`, `AnswerResult`, or `DetailedExplanation` shape changes)
- Features (new endpoints, new UI pages, new agent capabilities)
- Bug Fixes (defects corrected)
- Performance (latency improvements, caching additions)
- Dependencies (version bumps in build.gradle, package.json, requirements.txt)

Exclude: internal refactors with no user-visible effect, test-only changes, comment updates.
