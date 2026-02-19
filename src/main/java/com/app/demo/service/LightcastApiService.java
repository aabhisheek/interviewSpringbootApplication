package com.app.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@Slf4j
public class LightcastApiService {

    private final LightcastTokenService tokenService;
    private final RestTemplate restTemplate;
    private final String baseUrl;

    public LightcastApiService(LightcastTokenService tokenService,
                                @Value("${lightcast.base-url}") String baseUrl) {
        this.tokenService = tokenService;
        this.restTemplate = new RestTemplate();
        this.baseUrl = baseUrl;
    }

    public Map<String, Object> searchSkills(String query, int limit) {
        String url = baseUrl + "/skills/versions/latest/skills?q=" + query + "&limit=" + limit;
        return makeAuthenticatedGet(url);
    }

    public Map<String, Object> getSkillById(String skillId) {
        String url = baseUrl + "/skills/versions/latest/skills/" + skillId;
        return makeAuthenticatedGet(url);
    }

    public Map<String, Object> searchOccupations(String query, int limit) {
        String url = baseUrl + "/titles/versions/latest/titles?q=" + query + "&limit=" + limit;
        return makeAuthenticatedGet(url);
    }

    public Map<String, Object> getOccupationById(String occupationId) {
        String url = baseUrl + "/titles/versions/latest/titles/" + occupationId;
        return makeAuthenticatedGet(url);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> makeAuthenticatedGet(String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(tokenService.getAccessToken());
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        return response.getBody();
    }
}
