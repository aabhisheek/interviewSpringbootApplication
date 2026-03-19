---
name: refactor
description: Safe refactoring protocol with 5 types for Spring Boot Java and Next.js TypeScript.
  Read before touching, find all callers, one goal, no behaviour change, run tests after.
---

# Refactor Skill

## Protocol (mandatory sequence)
1. Read the full target file — do not start until you have read every line
2. Grep for every caller: `Grep pattern="ClassName|methodName" path="src/"` — collect every call site
3. State one goal from the 5 types below — commit to it before touching any file
4. Apply the minimal change that achieves that one goal
5. Run `./gradlew test` — green = done; red = revert and re-examine

**If the change would alter what any caller observes: stop. That is not a refactor.**

## Type 1 — Extract Method
When a method does more than one thing, extract the second concern.

Before (Java):
```java
public Map<String, Object> evaluateAnswer(String question, byte[] audioBytes) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.setBearerAuth(groqApiKey);
    // ... 15 more lines of transcription ...
    HttpHeaders headers2 = new HttpHeaders();
    headers2.setContentType(MediaType.APPLICATION_JSON);
    headers2.setBearerAuth(groqApiKey);
    // ... 15 more lines of scoring ...
}
```
After:
```java
public Map<String, Object> evaluateAnswer(String question, byte[] audioBytes) {
    String transcript = transcribeAudio(audioBytes);
    return scoreAnswer(question, transcript);
}
private String transcribeAudio(byte[] audioBytes) { ... }
private Map<String, Object> scoreAnswer(String question, String transcript) { ... }
```

Before (TypeScript):
```typescript
async function handleSubmit(audioBlob: Blob) {
  const reader = new FileReader();
  // ... base64 conversion ...
  const res = await fetch(url, { ... });
  const data = await res.json();
  setScore(data.score);
}
```
After:
```typescript
async function blobToBase64(blob: Blob): Promise<string> { ... }
async function handleSubmit(audioBlob: Blob) {
  const audioData = await blobToBase64(audioBlob);
  const result = await submitInterviewAnswer(question, audioBlob);
  setScore(result.score);
}
```

## Type 2 — Rename for Clarity
Rename when the name does not match what the thing does or holds.

Java naming rules for this project:
- Services: `verbNoun` → `evaluateAnswer`, `generateToken`, `searchSkills`
- Controllers: HTTP-action verbs matching endpoint intent
- DTOs: `NounRequest`, `NounResponse`
- Local variables: what they hold, not their type → `interviewToken` not `result`

TypeScript naming rules:
- Functions: camelCase verb-noun → `getAdaptiveQuestion`, `submitInterviewAnswer`
- Interfaces: PascalCase noun → `AdaptiveQuestion`, `AnswerResult`
- State variables: describe their content → `currentQuestion`, not `data`

After renaming: grep every usage, update all callers, run tests.

## Type 3 — Remove Duplication
When the same pattern appears in 3+ places, extract it.

Example — Groq HTTP headers appear in `transcribeAudio`, `scoreAnswer`, and `getAdaptiveQuestion`:
```java
// Before (duplicated in 3 private methods)
HttpHeaders headers = new HttpHeaders();
headers.setContentType(MediaType.APPLICATION_JSON);
headers.setBearerAuth(groqApiKey);

// After (extracted once)
private HttpHeaders groqJsonHeaders() {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.setBearerAuth(groqApiKey);
    return headers;
}
```
All three call sites become `groqJsonHeaders()`. Callers of the public methods see no difference.

## Type 4 — Simplify Control Flow
Replace nested ternary chains or multi-branch if/else with named methods.

Before:
```java
String difficulty = avgScore >= 7.5 ? "advanced" : avgScore >= 4.5 ? "intermediate" : "beginner";
```
After:
```java
private static String toDifficulty(double avgScore) {
    if (avgScore >= 7.5) return "advanced";
    if (avgScore >= 4.5) return "intermediate";
    return "beginner";
}
// call site: String difficulty = toDifficulty(avgScore);
```
The method name makes the intent clear. The ternary chain required re-reading each time.

## Type 5 — Improve Immutability
Replace mutable `HashMap` construction with `Map.of()` when the map is never mutated.

Before:
```java
Map<String, Object> result = new HashMap<>();
result.put("token", participantToken);
result.put("wsUrl", wsUrl);
return result;
```
After:
```java
return Map.of("token", participantToken, "wsUrl", wsUrl);
```
Verify: no caller mutates the returned map (controllers pass it directly to `ResponseEntity.ok()`).

## Verification Step
```bash
./gradlew test
```
All green = refactor complete. Any red = revert the specific change, re-read the callers, identify what assumption was wrong.
