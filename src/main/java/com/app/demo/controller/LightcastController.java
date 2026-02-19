package com.app.demo.controller;

import com.app.demo.service.LightcastApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/lightcast")
@RequiredArgsConstructor
public class LightcastController {

    private final LightcastApiService lightcastApiService;

    @GetMapping("/skills")
    public ResponseEntity<Map<String, Object>> searchSkills(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(lightcastApiService.searchSkills(q, limit));
    }

    @GetMapping("/skills/{id}")
    public ResponseEntity<Map<String, Object>> getSkillById(@PathVariable String id) {
        return ResponseEntity.ok(lightcastApiService.getSkillById(id));
    }

    @GetMapping("/occupations")
    public ResponseEntity<Map<String, Object>> searchOccupations(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(lightcastApiService.searchOccupations(q, limit));
    }

    @GetMapping("/occupations/{id}")
    public ResponseEntity<Map<String, Object>> getOccupationById(@PathVariable String id) {
        return ResponseEntity.ok(lightcastApiService.getOccupationById(id));
    }
}
