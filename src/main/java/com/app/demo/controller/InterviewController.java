package com.app.demo.controller;

import com.app.demo.service.InterviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/interview")
@RequiredArgsConstructor
@Slf4j
public class InterviewController {

    private final InterviewService interviewService;

    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> getToken(@RequestBody Map<String, String> request) {
        try {
            String studentProfileId = request.getOrDefault("studentProfileId", "guest-" + System.currentTimeMillis());
            String interviewDisplayId = request.getOrDefault("interviewDisplayId", "interview-" + System.currentTimeMillis());
            String language = request.getOrDefault("language", "english");

            Map<String, Object> tokenResponse = interviewService.getToken(studentProfileId, interviewDisplayId, language);

            Map<String, Object> response = new HashMap<>(tokenResponse);
            response.put("wsUrl", interviewService.getWsUrl());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to get interview token: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get interview token: " + e.getMessage()));
        }
    }

    @PostMapping("/questions")
    public ResponseEntity<Map<String, Object>> getQuestions(@RequestBody Map<String, String> request) {
        try {
            String skill = request.get("skill");
            return ResponseEntity.ok(interviewService.getQuestions(skill));
        } catch (Exception e) {
            log.error("Failed to get interview questions: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to generate questions: " + e.getMessage()));
        }
    }
}
