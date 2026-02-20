package com.app.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
@Slf4j
public class InterviewService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final LiveKitTokenService liveKitTokenService;
    private final String wsUrl;
    private final String groqApiKey;
    private final String groqApiUrl;
    private final String groqModel;
    private final double groqTemperature;
    private final int groqMaxTokens;

    public InterviewService(
            LiveKitTokenService liveKitTokenService,
            @Value("${livekit.ws-url}") String wsUrl,
            @Value("${groq.api-key}") String groqApiKey,
            @Value("${groq.api-url}") String groqApiUrl,
            @Value("${groq.model}") String groqModel,
            @Value("${groq.temperature}") double groqTemperature,
            @Value("${groq.max-tokens}") int groqMaxTokens) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
        this.liveKitTokenService = liveKitTokenService;
        this.wsUrl = wsUrl;
        this.groqApiKey = groqApiKey;
        this.groqApiUrl = groqApiUrl;
        this.groqModel = groqModel;
        this.groqTemperature = groqTemperature;
        this.groqMaxTokens = groqMaxTokens;
    }

    public String getWsUrl() {
        return wsUrl;
    }

    public Map<String, Object> getToken(String studentProfileId, String interviewDisplayId, String language) {
        String participantToken = liveKitTokenService.generateToken(
                interviewDisplayId, studentProfileId, studentProfileId, language, null);
        Map<String, Object> result = new HashMap<>();
        result.put("token", participantToken);
        return result;
    }

    public Map<String, Object> evaluateAnswer(String question, MultipartFile audio) {
        String transcript = transcribeAudio(audio);
        return scoreAnswer(question, transcript);
    }

    private String transcribeAudio(MultipartFile audio) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.setBearerAuth(groqApiKey);

            byte[] audioBytes = audio.getBytes();
            ByteArrayResource audioResource = new ByteArrayResource(audioBytes) {
                @Override
                public String getFilename() {
                    return "audio.webm";
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", audioResource);
            body.add("model", "whisper-large-v3-turbo");
            body.add("response_format", "text");

            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    groqApiUrl + "/audio/transcriptions",
                    HttpMethod.POST, entity, String.class);

            return response.getBody() != null ? response.getBody().trim() : "";
        } catch (Exception e) {
            log.error("Transcription failed: {}", e.getMessage(), e);
            return "";
        }
    }

    private Map<String, Object> scoreAnswer(String question, String transcript) {
        String answerText = transcript.isBlank() ? "(candidate did not provide an answer)" : transcript;

        String prompt = String.format(
                "You are an expert technical interviewer evaluating a candidate's verbal answer.\n\n" +
                "Interview Question: %s\n\n" +
                "Candidate's Answer (transcribed from speech): %s\n\n" +
                "Score this answer from 0 to 10 based on:\n" +
                "- Technical accuracy (most important)\n" +
                "- Completeness of the answer\n" +
                "- Clarity of explanation\n\n" +
                "Respond ONLY with a valid JSON object, no other text:\n" +
                "{\"score\": <integer 0-10>, \"feedback\": \"<2-3 sentences of constructive feedback>\"}",
                question, answerText);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        Map<String, Object> message = Map.of("role", "user", "content", prompt);
        Map<String, Object> requestBody = Map.of(
                "model", groqModel,
                "messages", List.of(message),
                "temperature", 0.3,
                "max_tokens", 300);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        Map<String, Object> result = new HashMap<>();
        result.put("transcript", transcript);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    groqApiUrl + "/chat/completions",
                    HttpMethod.POST, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String content = root.path("choices").get(0).path("message").path("content").asText();

            // Strip potential markdown code fences
            content = content.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();

            JsonNode scoring = objectMapper.readTree(content);
            result.put("score", scoring.path("score").asInt(0));
            result.put("feedback", scoring.path("feedback").asText("No feedback available."));
        } catch (Exception e) {
            log.error("Scoring failed: {}", e.getMessage(), e);
            result.put("score", 0);
            result.put("feedback", "Could not evaluate answer automatically.");
        }

        return result;
    }

    public Map<String, Object> getQuestions(String skill) {
        try {
            String prompt = String.format(
                    "Generate 10 technical interview questions for the skill: %s. " +
                    "Return ONLY a JSON object with a single key \"questions\" containing an array of question strings. " +
                    "No explanations, no markdown, just the JSON object. " +
                    "Example format: {\"questions\": [\"Question 1?\", \"Question 2?\"]}", skill);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            Map<String, Object> message = Map.of("role", "user", "content", prompt);
            Map<String, Object> requestBody = Map.of(
                    "model", groqModel,
                    "messages", List.of(message),
                    "temperature", groqTemperature,
                    "max_tokens", groqMaxTokens
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    groqApiUrl + "/chat/completions",
                    HttpMethod.POST, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String content = root.path("choices").get(0).path("message").path("content").asText();

            // Parse the JSON from Groq's response
            JsonNode questionsJson = objectMapper.readTree(content);
            List<String> questions = new ArrayList<>();
            for (JsonNode q : questionsJson.path("questions")) {
                questions.add(q.asText());
            }

            return Map.of("questions", questions);

        } catch (Exception e) {
            log.error("Failed to generate questions via Groq: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate interview questions", e);
        }
    }
}
