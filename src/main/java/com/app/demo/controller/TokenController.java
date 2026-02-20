package com.app.demo.controller;

import com.app.demo.model.dto.TokenRequest;
import com.app.demo.service.LiveKitTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TokenController {

    private final LiveKitTokenService liveKitTokenService;

    @Value("${livekit.url}")
    private String serverUrl;

    public TokenController(LiveKitTokenService liveKitTokenService) {
        this.liveKitTokenService = liveKitTokenService;
    }

    @PostMapping("/token")
    public ResponseEntity<?> getToken(@RequestBody TokenRequest request) {
        try {
            String roomName = request.getRoomName() != null
                    ? request.getRoomName()
                    : "room-" + Instant.now().getEpochSecond();

            String participantIdentity = request.getParticipantIdentity() != null
                    ? request.getParticipantIdentity()
                    : "user-" + Instant.now().getEpochSecond();

            String participantName = request.getParticipantName() != null
                    ? request.getParticipantName()
                    : "User";

            String participantToken = liveKitTokenService.generateToken(
                    roomName, participantIdentity, participantName,
                    request.getParticipantMetadata(), request.getParticipantAttributes());

            Map<String, String> response = new HashMap<>();
            response.put("server_url", serverUrl);
            response.put("participant_token", participantToken);

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            System.err.println("Token generation error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate token"));
        }
    }
}
