package com.app.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@Slf4j
public class InterviewService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String tokenEndpoint;
    private final String wsUrl;
    private final String groqApiKey;
    private final String groqApiUrl;
    private final String groqModel;
    private final double groqTemperature;
    private final int groqMaxTokens;

    public InterviewService(
            @Value("${livekit.token-endpoint}") String tokenEndpoint,
            @Value("${livekit.ws-url}") String wsUrl,
            @Value("${groq.api-key}") String groqApiKey,
            @Value("${groq.api-url}") String groqApiUrl,
            @Value("${groq.model}") String groqModel,
            @Value("${groq.temperature}") double groqTemperature,
            @Value("${groq.max-tokens}") int groqMaxTokens) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
        this.tokenEndpoint = tokenEndpoint;
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

    @SuppressWarnings("unchecked")
    public Map<String, Object> getToken(String studentProfileId, String interviewDisplayId, String language) {
        String url = tokenEndpoint
                + "?student_profile_id=" + studentProfileId
                + "&interview_display_id=" + interviewDisplayId
                + "&language=" + language;

        HttpHeaders headers = new HttpHeaders();
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, Map.class);
        return response.getBody();
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
