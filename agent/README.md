# Interview Voice Agent

A LiveKit-based AI agent that conducts adaptive voice interviews.

## How it works

1. The agent watches for LiveKit rooms named `interview2-*`
2. When a candidate starts a Voice Interview on the frontend, the room name begins with `interview2-`
3. The agent automatically joins that room and takes over as interviewer:
   - Speaks questions aloud using **Microsoft Edge TTS** (free, no API key)
   - Listens to the candidate using **Groq Whisper** (STT)
   - Adapts question difficulty based on scores using **Groq LLaMA 3.3**
   - Gives verbal feedback between questions

## Setup

```bash
cd agent

# Copy env file and fill in credentials
cp .env.example .env

# Install dependencies (requires Python 3.10+)
pip install -r requirements.txt

# FFmpeg is required by pydub for MP3 decoding
# Windows: winget install Gyan.FFmpeg
# macOS:   brew install ffmpeg
# Linux:   apt install ffmpeg
```

## Run

```bash
# Development mode (connects to LiveKit cloud, prints logs)
python interview_agent.py dev

# Keep running in background
python interview_agent.py start
```

## Without the agent

The frontend (`/interview2`) works fully without the Python agent:
- Browser `SpeechSynthesis` speaks questions
- `MediaRecorder` + Groq Whisper handle answer capture
- The Python agent enhances this with a richer voice (Edge TTS) via LiveKit's audio track

## TTS Voices

List all available voices:
```bash
edge-tts --list-voices | grep en-
```

Set your preferred voice in `.env`:
```
TTS_VOICE=en-US-GuyNeural
```
