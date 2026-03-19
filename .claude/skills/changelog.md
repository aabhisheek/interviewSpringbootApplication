---
name: changelog
description: Conventional changelog entry generator for this Spring Boot interview platform.
---

# Changelog Skill

## Format

```markdown
## [Unreleased] — YYYY-MM-DD

### Breaking Changes
- Change the `AuthResponse` to include `userId` field — frontend must update `api.ts:34` interface

### Features
- Add `/api/interview/explain` endpoint returning detailed model answers with code examples (#PR)
- Add voice interview mode via LiveKit Python agent with edge-tts speech synthesis (#PR)
- Add adaptive difficulty: questions adjust based on rolling average score across session (#PR)

### Bug Fixes
- Fix iOS Safari audio recording by trying `audio/mp4` MIME type when `audio/webm` unsupported (#PR)
- Fix Groq response parsing when LLM wraps JSON in markdown code fences (#PR)

### Performance
- Cache Lightcast OAuth2 token; reduce external calls from N to 1 per session (#PR)

### Deprecations
- `GET /api/interview/questions` (static list) deprecated in favour of `/api/interview/adaptive-question`

### Dependencies
- Bump `@livekit/components-react` from 2.8.0 to 2.9.19
- Bump `jjwt-api` from 0.11.5 to 0.12.5
```

## Rules

**Present tense imperative:** "Add", "Fix", "Bump", "Remove" — not "Added", "Fixed".

**One entry per logical change**, not per commit. A feature built across 3 commits = 1 entry.

**PR number as `(#NNN)`** when available from `git log`.

**What to include:**
- New endpoints or changes to existing endpoint request/response shapes
- New UI pages or major component additions
- Bug fixes that had user-visible impact
- Performance improvements with measurable effect
- Dependency version bumps (for security or feature reasons)
- Configuration changes affecting deployment

**What to exclude:**
- Internal refactors with zero user-visible effect (extracting a private method, renaming a variable)
- Test-only changes
- Comment or documentation-only changes (unless they are CLAUDE.md or README changes)
- Build config changes that do not affect runtime

## Source
Generate from `git diff main..HEAD` or `git log main..HEAD --oneline`. Read commit messages and match them to user-visible changes. Do not copy commit messages verbatim — synthesise into human-readable changelog language.

## Breaking Change Identification
A breaking change in this project is:
- Any field removed from or renamed in `AuthResponse`, `AdaptiveQuestion`, `AnswerResult`, or `DetailedExplanation`
- Any endpoint URL changed
- Any required request field added (without a default value)
- `application.properties` key renamed without migration path
- Python agent `requirements.txt` dependency with an incompatible API change
