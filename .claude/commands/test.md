Run the test suite for this project.

If $ARGUMENTS names a specific class (e.g. `InterviewServiceTest`), run:
`./gradlew test --tests "com.app.demo.$ARGUMENTS" --info`

If $ARGUMENTS is a path in `lightcast-frontend/`, run:
`cd lightcast-frontend && npm run build` (no test runner configured; build verifies TypeScript).

If no argument, run the full backend suite: `./gradlew test`

Report: pass count, fail count, duration. On failure: show test class name, assertion message, and first 20 lines of stack trace pointing into `com.app.demo`.
