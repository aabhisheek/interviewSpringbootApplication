# Agent Workflows

Decision tables, workflow patterns, handoff protocols, and anti-patterns for using the multi-agent system in this Spring Boot interview platform.

---

## Decision Table: Situation → Agent

| Situation | Agent(s) to Use |
|---|---|
| New feature that touches 2+ files | `coordinator` to orchestrate: `architect` → `test-writer` → `reviewer` |
| Compile error or test failure | `debugger` with the full error and stack trace |
| Unexpected wrong output (wrong score, bad transcript) | `debugger` — runtime behaviour, not compile error |
| Pre-commit review on your own diff | `reviewer` with `git diff main..HEAD` |
| New endpoint to design | `architect` with the brief |
| Tests needed for existing code | `test-writer` with the class name |
| OWASP scan before merging | `security-analyst` on changed files |
| Groq API latency concern | `performance-analyst` on `InterviewService.java` |
| Deprecated library version | `migrator` with the old and new version |
| Code cleanup (extract method, rename) | `refactorer` with one specific goal |
| Explain how auth works | Direct answer from context — no agent needed |
| Understanding the adaptive algorithm | Direct answer — read `InterviewService.getAdaptiveQuestion()` |
| Multi-step bug fix requiring new test | `coordinator` → `debugger` → `test-writer` |
| Pre-merge for security-sensitive change | `coordinator` → `reviewer` → `security-analyst` |

---

## Workflow Patterns

### Pattern 1 — New Feature (Full Stack)
```
Step 1: architect
  Input: "Add session history — persist interview results to DB and expose via /api/sessions"
  Output: 8-phase design document with entity design, API spec, phased plan

Step 2: [Human approval of design]
  Review: entity schema, API shape, risk register

Step 3: test-writer
  Input: the architect's Phase 5 API surface + Phase 7 implementation plan
  Output: failing JUnit 5 tests for the new endpoints

Step 4: [Human implements]
  Follow the architect's phased plan; make test-writer's tests pass

Step 5: reviewer
  Input: git diff of the implementation
  Output: Required changes (❌), suggestions (⚠️), verdict

Step 6: security-analyst
  Input: changed files only
  Output: CRITICAL/HIGH findings to address before merge
```

### Pattern 2 — Bug Fix
```
Step 1: debugger
  Input: exact error message + stack trace + failing test command
  Output: root cause analysis + minimal fix

Step 2: test-writer
  Input: the bug description + the fix
  Output: regression test that proves the bug is fixed

Step 3: reviewer
  Input: diff of the fix + new regression test
  Output: verdict (should be APPROVE for a minimal, well-tested fix)
```

### Pattern 3 — Pre-Merge Security Review
```
Step 1: reviewer
  Input: git diff main..HEAD
  Output: correctness + contract review

If reviewer APPROVE:
Step 2: security-analyst
  Input: list of changed files (not the whole repo)
  Output: security findings

If security-analyst CRITICAL or HIGH findings: fix them, repeat from Step 1.
If security-analyst MEDIUM or lower: document, merge with follow-up ticket.
```

### Pattern 4 — Safe Refactor
```
Step 1: refactorer
  Input: specific file + specific goal (one of 5 refactor types)
  Output: minimal diff + ./gradlew test green

Step 2: reviewer
  Input: the diff
  Output: verify behaviour unchanged (should be APPROVE if refactorer was correct)

Step 3: test-writer (only if ./gradlew test reveals a coverage gap)
  Input: the refactored code
  Output: tests for previously uncovered paths
```

### Pattern 5 — Library Migration
```
Step 1: migrator
  Input: old dependency + new version + migration guide URL
  Output: automated changes applied + list of manual items

Step 2: test-writer
  Input: migrated files
  Output: tests verifying the migrated code behaves correctly

Step 3: reviewer
  Input: full migration diff
  Output: APPROVE / REQUEST CHANGES
```

---

## Handoff Protocol

### What to Pass to Each Agent

**To debugger:**
- The exact error message — not a paraphrase
- The full stack trace — copy from terminal, not a summary
- The failing test command: `./gradlew test --tests "com.app.demo.XxxTest" --info`
- The component: backend / frontend / Python agent

**To architect:**
- The specific user story or requirement in plain language
- Any hard constraints: "must not change the AuthResponse shape", "must work on iOS Safari"
- Related files to read: "look at how InterviewService handles Groq calls as a reference"

**To reviewer:**
- The diff or PR number — not a description of the changes
- Context for unusual decisions: "CORS is disabled for /h2-console because it is dev-only"

**To test-writer:**
- The specific class or method name: `InterviewService.getAdaptiveQuestion`
- The already-read source (pass the content) for short files
- Any edge cases you know about: "empty previousResults list is a valid first-question scenario"

**To security-analyst:**
- The list of changed files — scope the scan
- Known risk surfaces: "this change touches user input flowing into Groq prompts"

### Reading Agent Output

Read the agent's full output before dispatching the next agent. Do not pipeline blindly. If the reviewer finds ❌ items, fix them before dispatching the security-analyst — do not run security review on code that has correctness bugs.

---

## Model Selection Rationale

| Model | Use for |
|---|---|
| `claude-opus-4-6` | Design decisions, security analysis, coordinator orchestration — tasks requiring deep reasoning and judgment |
| `claude-sonnet-4-6` | Code review, debugging, test writing, refactoring — tasks requiring code comprehension and generation |
| `claude-haiku-4-5` | Bulk migrations — high-volume, mechanical text transformation where speed matters more than deep reasoning |

---

## Anti-Patterns

**Blind chaining**: dispatching Agent B with only "Agent A is done" as context. Always pass Agent A's actual output to Agent B.

**Wrong agent for the job**: using `architect` to fix a bug. Architect designs; debugger fixes. Using `refactorer` to add a feature — refactorer changes structure without changing behaviour; features change behaviour by definition.

**Over-orchestration**: spawning the full `coordinator` workflow for a one-line bug fix. A typo in a property key does not need `architect → test-writer → reviewer → security-analyst`.

**Vague dispatch**: "look at the interview code and fix it". Agents need specificity: which file, which method, which error, which test.

**Skipping the human checkpoint**: chaining more than 3 agents without confirming with the human. After 3 agent steps, pause and verify the direction is still correct before investing more.

**Using security-analyst on the whole repo for routine changes**: scope it to changed files. Running a full OWASP scan every commit is noise; running it on the files you actually changed is signal.
