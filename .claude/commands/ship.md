Pre-ship checklist. Run each step in sequence. Stop on first failure and report it.

1. **Tests** — `./gradlew test` — all must pass
2. **Frontend build** — `cd lightcast-frontend && npm run build` — zero TypeScript errors
3. **Lint** — `cd lightcast-frontend && npm run lint` — zero ESLint errors
4. **Security** — spawn security-analyst on changed files — zero CRITICAL or HIGH findings
5. **Performance** — spawn performance-analyst on any changed file in `service/` — flag any new HIGH finding
6. **CHANGELOG** — verify CHANGELOG updated if any user-visible endpoint or UI changed
7. **Secrets grep** — grep `src/ lightcast-frontend/src/ agent/` for `api.key`, `api-key`, `secret`, `password`, `AKIA` literal values — must be zero hits in source files
8. **Debug logs** — grep changed files for `System.out.println`, `console.log` — must be zero in production code
9. **application.properties template** — if new `@Value` properties added, verify documented in CLAUDE.md required properties section

Report: ✅ or ❌ for each step. If all pass: "Ready to ship."
