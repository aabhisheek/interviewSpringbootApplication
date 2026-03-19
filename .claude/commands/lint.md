Run linters for this project.

If $ARGUMENTS is "fix" or targets a frontend file:
`cd lightcast-frontend && npm run lint` (ESLint 9 with eslint-config-next)

If $ARGUMENTS is "fix": add `--fix` flag to the ESLint invocation.

For Java: no Checkstyle or Spotless is configured. Check for style issues manually:
- Grep for `System.out.println` in `src/main/java/` — must be zero
- Grep for missing `@Slf4j` on service/controller classes that log
- Verify all `catch` blocks have `log.error()` calls

Report every ESLint violation with file:line, rule name, and message.
