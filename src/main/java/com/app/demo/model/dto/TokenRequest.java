package com.app.demo.model.dto;

import java.util.Map;

public class TokenRequest {
    private String roomName;
    private String participantIdentity;
    private String participantName;
    private String participantMetadata;
    private Map<String, String> participantAttributes;

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public String getParticipantIdentity() { return participantIdentity; }
    public void setParticipantIdentity(String participantIdentity) {
        this.participantIdentity = participantIdentity;
    }

    public String getParticipantName() { return participantName; }
    public void setParticipantName(String participantName) {
        this.participantName = participantName;
    }

    public String getParticipantMetadata() { return participantMetadata; }
    public void setParticipantMetadata(String participantMetadata) {
        this.participantMetadata = participantMetadata;
    }

    public Map<String, String> getParticipantAttributes() { return participantAttributes; }
    public void setParticipantAttributes(Map<String, String> participantAttributes) {
        this.participantAttributes = participantAttributes;
    }
}
