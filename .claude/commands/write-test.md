Read `.claude/skills/write-test.md` for the test plan template and JUnit 5 idioms.

Generate tests for $ARGUMENTS (a class name, method name, or file path in this project).

Steps:
1. Read the full source file for $ARGUMENTS
2. Produce the 6-category test plan table
3. Write JUnit 5 tests in `src/test/java/com/app/demo/{layer}/`
4. Run `./gradlew test` and report results
