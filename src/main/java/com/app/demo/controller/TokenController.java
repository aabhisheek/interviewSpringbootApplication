package com.app.demo.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

public class TokenController {
// TokenController.java
package com.example.api;

import io.livekit.server.*;
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

        @Value("${livekit.api.key}")
        private String apiKey;

        @Value("${livekit.api.secret}")
        private String apiSecret;

        @Value("${livekit.url}")
        private String serverUrl;

        @PostMapping("/token")
        public ResponseEntity<?> getToken(@RequestBody TokenRequest request) {
            try {
                // TODO: Add your authentication here
                // @PreAuthorize("isAuthenticated()")
                // Authentication auth = SecurityContextHolder.getContext().getAuthentication();

                String roomName = request.getRoomName() != null
                        ? request.getRoomName()
                        : "room-" + Instant.now().getEpochSecond();

                String participantIdentity = request.getParticipantIdentity() != null
                        ? request.getParticipantIdentity()
                        : "user-" + Instant.now().getEpochSecond();

                String participantName = request.getParticipantName() != null
                        ? request.getParticipantName()
                        : "User";

                AccessToken token = new AccessToken(apiKey, apiSecret);
                token.setIdentity(participantIdentity);
                token.setName(participantName);

                if (request.getParticipantMetadata() != null) {
                    token.setMetadata(request.getParticipantMetadata());
                }
                if (request.getParticipantAttributes() != null) {
                    token.setAttributes(request.getParticipantAttributes());
                }

                VideoGrant videoGrant = new VideoGrant();
                videoGrant.setRoomJoin(true);
                videoGrant.setRoom(roomName);
                videoGrant.setCanPublish(true);
                videoGrant.setCanSubscribe(true);
                token.addGrant(videoGrant);

                // If room_config is provided, pass it directly to the token builder.
                // The client SDKs automatically package agent dispatch information into room_config.
                if (request.getRoomConfig() != null) {
                    token.setRoomConfig(request.getRoomConfig());
                }

                String participantToken = token.toJwt();

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
