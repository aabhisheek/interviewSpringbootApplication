package com.app.demo.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class LiveKitTokenService {

    @Value("${livekit.api.key}")
    private String apiKey;

    @Value("${livekit.api.secret}")
    private String apiSecret;

    public String generateToken(String roomName, String participantIdentity, String participantName,
                                String metadata, Map<String, String> attributes) {
        Map<String, Object> videoGrant = new HashMap<>();
        videoGrant.put("roomJoin", true);
        videoGrant.put("room", roomName);
        videoGrant.put("canPublish", true);
        videoGrant.put("canSubscribe", true);

        SecretKey key = Keys.hmacShaKeyFor(apiSecret.getBytes(StandardCharsets.UTF_8));
        long nowMs = System.currentTimeMillis();

        var builder = Jwts.builder()
                .issuer(apiKey)
                .subject(participantIdentity)
                .claim("name", participantName)
                .claim("video", videoGrant)
                .issuedAt(new Date(nowMs))
                .expiration(new Date(nowMs + 6 * 60 * 60 * 1000))
                .signWith(key);

        if (metadata != null) builder.claim("metadata", metadata);
        if (attributes != null) builder.claim("attributes", attributes);

        return builder.compact();
    }
}
