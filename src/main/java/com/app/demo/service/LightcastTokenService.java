package com.app.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@Slf4j
public class LightcastTokenService {

    private final String clientId;
    private final String clientSecret;
    private final String tokenUrl;
    private final long tokenExpiryDuration;
    private final RestTemplate restTemplate;

    private String cachedToken;
    private long tokenExpiryTime;

    public LightcastTokenService(@Value("${lightcast.client-id}") String clientId,
                                  @Value("${lightcast.client-secret}") String clientSecret,
                                  @Value("${lightcast.token-url}") String tokenUrl,
                                  @Value("${lightcast.token-expiry-duration}") long tokenExpiryDuration) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.tokenUrl = tokenUrl;
        this.tokenExpiryDuration = tokenExpiryDuration;
        this.restTemplate = new RestTemplate();
    }

    public synchronized String getAccessToken() {
        if (cachedToken != null && System.currentTimeMillis() < tokenExpiryTime) {
            return cachedToken;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("grant_type", "client_credentials");
        body.add("scope", "emsi_open");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(tokenUrl, request, Map.class);

        if (response != null && response.containsKey("access_token")) {
            cachedToken = (String) response.get("access_token");
            tokenExpiryTime = System.currentTimeMillis() + tokenExpiryDuration - 60000; // Refresh 1 min early
            log.info("Lightcast token refreshed successfully");
        } else {
            throw new RuntimeException("Failed to obtain Lightcast access token");
        }

        return cachedToken;
    }
}
