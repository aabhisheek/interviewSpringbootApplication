const API_BASE = "http://localhost:8080";
const LIGHTCAST_BASE = `${API_BASE}/api/lightcast`;
const AUTH_BASE = `${API_BASE}/api/auth`;
const INTERVIEW_BASE = `${API_BASE}/api/interview`;

// --- Token helpers ---

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// --- Auth API ---

export interface AuthResponse {
  token: string;
  email: string;
  name: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Login failed");
  }
  return res.json();
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Registration failed");
  }
  return res.json();
}

// --- Lightcast API (authenticated) ---

export async function searchSkills(query: string, limit: number = 10) {
  const res = await fetch(`${LIGHTCAST_BASE}/skills?q=${encodeURIComponent(query)}&limit=${limit}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch skills");
  return res.json();
}

export async function getSkillById(id: string) {
  const res = await fetch(`${LIGHTCAST_BASE}/skills/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch skill details");
  return res.json();
}

export async function searchOccupations(query: string, limit: number = 10) {
  const res = await fetch(`${LIGHTCAST_BASE}/occupations?q=${encodeURIComponent(query)}&limit=${limit}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch occupations");
  return res.json();
}

export async function getOccupationById(id: string) {
  const res = await fetch(`${LIGHTCAST_BASE}/occupations/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch occupation details");
  return res.json();
}

// --- Interview API (authenticated) ---

export async function getInterviewToken(studentProfileId: string, interviewDisplayId: string, language: string = "english") {
  const res = await fetch(`${INTERVIEW_BASE}/token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ studentProfileId, interviewDisplayId, language }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to get interview token");
  }
  return res.json();
}

export async function getInterviewQuestions(skill: string) {
  const res = await fetch(`${INTERVIEW_BASE}/questions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ skill }),
  });
  if (!res.ok) throw new Error("Failed to get interview questions");
  return res.json();
}

export interface AdaptiveQuestion {
  question: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  proficiency: string;
  avgScore: number;
}

export interface PreviousResult {
  question: string;
  score: number;
}

export async function getAdaptiveQuestion(
  skill: string,
  questionNumber: number,
  previousResults: PreviousResult[]
): Promise<AdaptiveQuestion> {
  const res = await fetch(`${INTERVIEW_BASE}/adaptive-question`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ skill, questionNumber, previousResults }),
  });
  if (!res.ok) throw new Error("Failed to get adaptive question");
  return res.json();
}

export interface AnswerResult {
  transcript: string;
  score: number;
  feedback: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data-URL prefix (e.g. "data:audio/webm;base64,")
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function submitInterviewAnswer(
  question: string,
  audioBlob: Blob
): Promise<AnswerResult> {
  const audioData = await blobToBase64(audioBlob);

  const res = await fetch(`${INTERVIEW_BASE}/answer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ question, audioData }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to evaluate answer");
  }
  return res.json();
}
