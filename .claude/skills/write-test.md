---
name: write-test
description: Test generation with full 6-category plan template. JUnit 5 + Mockito for Spring Boot backend.
---

# Write Test Skill

## Test Framework
- **Backend**: JUnit 5 (`spring-boot-starter-test`), Mockito, MockMvc
- **Run command**: `./gradlew test`
- **Test location**: `src/test/java/com/app/demo/{layer}/XxxTest.java`
- **Frontend**: no test framework configured — `cd lightcast-frontend && npm run build` verifies TypeScript

## Test Plan Template

| Category | Scenario | Input | Expected | Test Method Name |
|---|---|---|---|---|
| Happy path | Valid audio, valid question | real base64 audio, "What is JPA?" | score 0-10, non-empty feedback | `evaluateAnswer_validInput_returnsScoreAndFeedback` |
| Boundary | Empty audio bytes | `new byte[0]` | handles gracefully | `evaluateAnswer_emptyAudioBytes_handlesGracefully` |
| Boundary | Blank transcript from STT | `""` | uses fallback text in prompt | `scoreAnswer_blankTranscript_usesFallbackText` |
| Invalid input | Null question | null | exception or error response | `evaluateAnswer_nullQuestion_throwsOrReturnsError` |
| External failure | Groq 429 rate limit | mock 429 response | `HttpClientErrorException` propagated | `transcribeAudio_groq429_propagatesException` |
| External failure | LLM returns malformed JSON | `{"broken":` | `RuntimeException` with message | `scoreAnswer_malformedGroqJson_throwsRuntimeException` |

## JUnit 5 Idioms for This Project

### Unit Test with Mockito (preferred for service layer)
```java
@ExtendWith(MockitoExtension.class)
class InterviewServiceTest {

    @Mock
    private LiveKitTokenService liveKitTokenService;

    private InterviewService interviewService;

    @BeforeEach
    void setUp() {
        interviewService = new InterviewService(
            liveKitTokenService,
            "wss://test.livekit.cloud",
            "test-groq-key",
            "http://groq.test",
            "llama-3.3-70b-versatile",
            0.7,
            1000
        );
    }

    @Test
    void getAdaptiveQuestion_noHistory_returnsIntermediateDifficulty() {
        // arrange
        List<Map<String, Object>> noPreviousResults = List.of();

        // Note: this test requires mocking RestTemplate — use constructor injection
        // or spy to intercept the HTTP call.

        // assert difficulty defaults to intermediate (avgScore=5.0)
        // ...
    }
}
```

### MockMvc Test (preferred for controller layer)
```java
@WebMvcTest(InterviewController.class)
@Import(SecurityConfig.class)
class InterviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InterviewService interviewService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService userDetailsService;

    @Test
    @WithMockUser
    void evaluateAnswer_validRequest_returns200WithScoreAndFeedback() throws Exception {
        String validBase64 = Base64.getEncoder().encodeToString("fake-audio".getBytes());
        Map<String, Object> mockResult = Map.of("transcript", "hello", "score", 7, "feedback", "Good.");
        when(interviewService.evaluateAnswer(any(), any())).thenReturn(mockResult);

        mockMvc.perform(post("/api/interview/answer")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"question\":\"What is JPA?\",\"audioData\":\"" + validBase64 + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(7))
                .andExpect(jsonPath("$.feedback").value("Good."));
    }
}
```

### JWT Token Provider Test
```java
@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        // secret must be at least 32 chars for HS256
        provider = new JwtTokenProvider("test-secret-key-minimum-32-chars-long", 3600000L);
    }

    @Test
    void generateToken_thenValidate_returnsTrue() {
        String token = provider.generateToken("user@example.com");
        assertThat(provider.validateToken(token)).isTrue();
    }

    @Test
    void validateToken_withExpiredToken_returnsFalse() {
        JwtTokenProvider shortLived = new JwtTokenProvider("test-secret-key-minimum-32-chars-long", 1L);
        String token = shortLived.generateToken("user@example.com");
        // token expires in 1ms — already expired
        assertThat(shortLived.validateToken(token)).isFalse();
    }
}
```

## Hard Rules
- One logical assertion concept per test — multiple `assertThat` calls are fine if they verify one behaviour
- No `Thread.sleep()` — mock timing with Mockito or test-specific configurations
- No real API keys — use `"test-key"` or `"test-secret-key-minimum-32-chars-long"` in tests
- No `@SpringBootTest` unless you genuinely need the full context — it is 10x slower than `@ExtendWith(MockitoExtension.class)`
- Test names are specifications: `method_scenario_expectedResult`
- After writing: run `./gradlew test` and confirm green
