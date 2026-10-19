const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type UserRole = "mother" | "caregiver" | "doctor" | "admin";

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  preferred_language: string;
  is_verified: boolean;
  is_active: boolean;
};

export type TokenPair = { access_token: string; refresh_token: string; token_type: string };
export type Mood = { id: string; mood: "happy" | "sad" | "anxious" | "tired" | "angry"; note: string | null; created_at: string };
export type Symptom = { id: string; fatigue: boolean; headache: boolean; sleep_issue: boolean; anxiety: boolean; cramps: boolean; created_at: string };
export type Journal = { id: string; title: string; content: string; created_at: string };
export type Cycle = { id: string; last_period_date: string; cycle_length: number; next_period_prediction: string; created_at: string };
export type CyclePrediction = Cycle & { ovulation_prediction: string; fertility_window_start: string; fertility_window_end: string };
export type PCOSPrediction = { id: string; risk_level: string; probability: number; recommendations: string; created_at: string };
export type PCOSPredictPayload = {
  age: number;
  bmi: number;
  cycle: 2 | 4;
  cycle_length: number;
  weight_gain: boolean;
  hair_growth: boolean;
  skin_darkening: boolean;
  hair_loss: boolean;
  pimples: boolean;
};
export type PPDAssessment = { id: string; epds_score: number; sentiment: string; risk_level: string; created_at: string };
export type ChatMessage = { id: string; message: string; response: string; language: string; created_at: string };
export type CaregiverContent = { id: string; title: string; description: string; video_url: string | null; category: string; created_at: string };
export type Alert = { id: string; user_id: string; message: string; sent_status: string; sent_at: string | null };
export type DashboardStats = { today_mood: Mood | null; symptoms: Symptom | null; cycle_prediction: string | null; pcos_risk: string | null; ppd_status: string | null };
export type WellnessInsight = { category: string; severity: string; message: string };

export type Profile = {
  id: string;
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  preferred_language?: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  blood_group: string | null;
  pregnancy_status: string | null;
  delivery_date: string | null;
  emergency_contact: string | null;
  district: string | null;
  village: string | null;
  created_at?: string;
};

export type ReportItem = {
  id: string;
  type: string;
  title: string;
  date: string;
  iso_date: string;
  risk_level: string;
  score: string;
  recommendations?: string;
  sentiment?: string;
  status: string;
};

export type NutritionPlanItem = {
  category: string;
  phase: string;
  meal_type: string;
  title: string;
  description: string;
  local_foods: string;
  key_nutrients: string;
  is_affordable_local: boolean;
};

export type NutritionSuggestion = {
  key: string;
  name: string;
  meal_type: string;
  portion: string;
  reason: string;
  ingredients: string[];
  preparation_instructions: string[];
  preparation_minutes: number;
  substitutions: string[];
  contexts: string[];
};

export type NutritionMeal = {
  name: string;
  meal_type: string;
  ingredients: string[];
  serving_size: string | null;
  preparation_instructions: string[];
  preparation_minutes: number | null;
  substitutions: string[];
  nutrition_facts: string[];
  nutrition_source: string | null;
};

export type NutritionDraftPayload = {
  title: string;
  applicable_context: string[];
  meals: NutritionMeal[];
  preparation_guidance?: string | null;
  clinician_note?: string | null;
};

export type NutritionPreferences = {
  dietary_preferences: string[];
  dietary_restrictions: string[];
  allergies: string[];
  breastfeeding: boolean | null;
};

export type NutritionContext = {
  pregnancy_stage: string | null;
  postpartum: boolean;
  breastfeeding: boolean | null;
  pcos_screening_recorded: boolean;
  ppd_screening_recorded: boolean;
};

export type NutritionCarePlan = {
  id: string;
  title: string;
  applicable_context: string[];
  meals: NutritionMeal[];
  preparation_guidance: string | null;
  clinician_note: string | null;
  source: "general" | "ai_generated" | "doctor_authored" | "doctor_reviewed";
  status: "draft" | "active" | "archived";
  version: number;
  created_at?: string | null;
  reviewed_at: string | null;
  archived_at?: string | null;
};

export type MotherNutritionData = {
  context: NutritionContext;
  context_guidance: string[];
  preferences: NutritionPreferences;
  suggestions: NutritionSuggestion[];
  interactions: Record<string, { completed: boolean; saved: boolean }>;
  active_plan: NutritionCarePlan | null;
  disclaimer: string;
};

export type CaregiverNutritionData = {
  mother_name: string;
  context: NutritionContext;
  context_guidance: string[];
  preferences: NutritionPreferences;
  general_suggestions: NutritionSuggestion[];
  active_plan: NutritionCarePlan | null;
  disclaimer: string;
};

export type DoctorNutritionData = {
  patient: {
    id: string;
    name: string;
    age: number | null;
    pregnancy_stage: string | null;
    postpartum: boolean;
    breastfeeding: boolean | null;
    pcos_screening: string | null;
    ppd_screening: string | null;
    dietary_preferences: string[];
    dietary_restrictions: string[];
    allergies: string[];
  };
  plans: NutritionCarePlan[];
  disclaimer: string;
};

export type HealthMythItem = {
  id: string;
  category: string;
  myth: string;
  fact: string;
  verification_source: string;
};

export type CareCircleRequestItem = {
  id: string;
  requester_name: string;
  requester_email: string;
  requester_role: string;
  relationship_label: string;
  status: string;
  share_emergency: boolean;
  share_risk_category: boolean;
  share_wellness_summary: boolean;
  share_nutrition: boolean;
  requested_at: string;
  responded_at: string | null;
  revoked_at: string | null;
};

export type CareCircleConnectionItem = {
  access_id: string;
  mother_id: string;
  mother_name: string;
  relationship_label: string;
  permissions: Record<string, boolean> & { nutrition?: boolean };
};

export type DoctorPatientItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  preferred_language: string;
  age: number | null;
  pregnancy_status: string | null;
  delivery_date: string | null;
  blood_group: string | null;
  emergency_contact: string | null;
  latest_pcos_risk: string;
  latest_ppd_risk: string;
  created_at: string | null;
};

export type FacilityItem = {
  id: string;
  name: string;
  facility_type: string;
  address: string;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  contact_number: string | null;
  opening_hours: string | null;
  directions_url: string;
  rating: number | null;
  user_ratings_total: number | null;
  is_emergency: boolean;
};

export type OfficialHelpline = {
  title: string;
  number: string;
  description: string;
  category: string;
};

export type FacilitySearchResponse = {
  is_live_provider: boolean;
  provider_status: string;
  provider_name: string;
  total_found: number;
  query: string | null;
  category: string | null;
  location_searched: string | null;
  external_search_url: string;
  facilities: FacilityItem[];
  official_helplines: OfficialHelpline[];
};

export type ConcernRecommendation = {
  concern_key: string;
  concern_title: string;
  detected_assessment_basis: string | null;
  suggested_facility_types: string[];
  recommended_category: string;
  clinical_safety_notice: string;
};

export type HerReachRecommendationsResponse = {
  user_role: string;
  has_pcos_data: boolean;
  has_ppd_data: boolean;
  has_pregnancy_data: boolean;
  clinical_disclaimer: string;
  recommendations: ConcernRecommendation[];
  available_categories: string[];
};

let accessToken = sessionStorage.getItem("nurtureher_access_token");
let refreshToken = sessionStorage.getItem("nurtureher_refresh_token");

export function setTokens(tokens: TokenPair | null) {
  accessToken = tokens?.access_token ?? null;
  refreshToken = tokens?.refresh_token ?? null;
  if (tokens) {
    sessionStorage.setItem("nurtureher_access_token", tokens.access_token);
    sessionStorage.setItem("nurtureher_refresh_token", tokens.refresh_token);
  } else {
    sessionStorage.removeItem("nurtureher_access_token");
    sessionStorage.removeItem("nurtureher_refresh_token");
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 401 && retry && refreshToken) {
    try {
      const tokens = await request<TokenPair>("/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }, false);
      setTokens(tokens);
      return request<T>(path, init, false);
    } catch {
      setTokens(null);
    }
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(detail.detail ?? "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) => request<TokenPair>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (payload: { email: string; name: string; password: string; phone?: string; role?: string; preferred_language?: string }) => request<User>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request<User>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }),

  // Wellness & Health Profile
  dashboard: () => request<DashboardStats>("/wellness/dashboard"),
  analytics: () => request<Record<string, unknown>>("/wellness/analytics"),
  insights: () => request<{ insights: WellnessInsight[] }>("/wellness/insights"),
  profile: () => request<Profile>("/wellness/profile"),
  updateProfile: (payload: Partial<Profile>) => request<Profile>("/wellness/profile", { method: "PUT", body: JSON.stringify(payload) }),
  reports: () => request<{ count: number; reports: ReportItem[]; disclaimer: string }>("/wellness/reports"),

  // Moods & Symptoms & Journal
  moods: () => request<Mood[]>("/wellness/mood"),
  createMood: (mood: Mood["mood"], note: string | null) => request<Mood>("/wellness/mood", { method: "POST", body: JSON.stringify({ mood, note }) }),
  symptoms: () => request<Symptom[]>("/wellness/symptoms"),
  createSymptoms: (payload: Omit<Symptom, "id" | "created_at">) => request<Symptom>("/wellness/symptoms", { method: "POST", body: JSON.stringify(payload) }),
  journals: () => request<Journal[]>("/wellness/journal"),
  createJournal: (title: string, content: string) => request<Journal>("/wellness/journal", { method: "POST", body: JSON.stringify({ title, content }) }),

  // Cycles
  cycles: () => request<Cycle[]>("/cycle"),
  cyclePrediction: () => request<CyclePrediction | null>("/cycle/prediction"),
  createCycle: (last_period_date: string, cycle_length: number) => request<Cycle>("/cycle", { method: "POST", body: JSON.stringify({ last_period_date, cycle_length }) }),

  // Screenings
  pcosHistory: () => request<PCOSPrediction[]>("/pcos/history"),
  predictPCOS: (payload: PCOSPredictPayload) => request<PCOSPrediction>("/pcos/predict", { method: "POST", body: JSON.stringify(payload) }),
  ppdHistory: () => request<PPDAssessment[]>("/ppd/history"),
  assessPPD: (answers: number[], journal_text: string | null) => request<PPDAssessment>("/ppd/assessment", { method: "POST", body: JSON.stringify({ answers, journal_text }) }),

  // Chat & AI Coach
  chatHistory: () => request<ChatMessage[]>("/chat/history"),
  sendChat: (message: string, language: string) => request<ChatMessage>("/chat/message", { method: "POST", body: JSON.stringify({ message, language }) }),

  // Nutrition Guide & Hydration & Myths
  myNutrition: () => request<MotherNutritionData>("/nutrition/me"),
  updateNutritionPreferences: (preferences: {
    dietary_preferences: string[];
    dietary_restrictions: string[];
    allergies: string[];
    breastfeeding: boolean | null;
  }) => request<typeof preferences>("/nutrition/preferences", { method: "PUT", body: JSON.stringify(preferences) }),
  updateNutritionInteraction: (key: string, completed: boolean, saved: boolean) =>
    request<{ recommendation_key: string; completed: boolean; saved: boolean }>(
      `/nutrition/interactions/${encodeURIComponent(key)}?completed=${completed}&saved=${saved}`,
      { method: "PUT" },
    ),
  caregiverNutrition: (accessId: string) =>
    request<CaregiverNutritionData>(`/nutrition/caregiver/connections/${accessId}`),
  doctorNutritionPatients: () => request<{ id: string; name: string }[]>("/nutrition/doctor/patients"),
  doctorPatientNutrition: (patientId: string) =>
    request<DoctorNutritionData>(`/nutrition/doctor/patients/${patientId}`),
  createDoctorNutritionDraft: (patientId: string, payload: NutritionDraftPayload) =>
    request<NutritionCarePlan>(`/nutrition/doctor/patients/${patientId}/plans`, { method: "POST", body: JSON.stringify(payload) }),
  updateDoctorNutritionDraft: (patientId: string, planId: string, payload: NutritionDraftPayload) =>
    request<NutritionCarePlan>(`/nutrition/doctor/patients/${patientId}/plans/${planId}`, { method: "PUT", body: JSON.stringify(payload) }),
  publishDoctorNutritionPlan: (patientId: string, planId: string) =>
    request<NutritionCarePlan>(`/nutrition/doctor/patients/${patientId}/plans/${planId}/publish`, { method: "POST" }),
  discontinueDoctorNutritionPlan: (patientId: string, planId: string) =>
    request<{ id: string; status: string }>(`/nutrition/doctor/patients/${patientId}/plans/${planId}/discontinue`, { method: "POST" }),
  nutritionPlans: (category?: string) => request<{ count: number; plans: NutritionPlanItem[]; disclaimer: string }>(category ? `/nutrition/plans?category=${encodeURIComponent(category)}` : "/nutrition/plans"),
  hydration: () => request<{ cups: number; target_cups: number; percent: number; date: string }>("/nutrition/hydration"),
  updateHydration: (cups: number, target_cups = 8) => request<{ cups: number; target_cups: number; percent: number }>("/nutrition/hydration", { method: "POST", body: JSON.stringify({ cups, target_cups }) }),
  healthMyths: () => request<HealthMythItem[]>("/nutrition/myths"),

  // Caregiver Companion
  caregiver: (category: "videos" | "tips" | "articles") => request<CaregiverContent[]>(`/caregiver/${category}`),

  // CareCircle QR TrustVault
  getCareCircleQR: () => request<{ token: string; qr_payload: string; expires_at: string }>("/carecircle/qr"),
  generateCareCircleQR: () => request<{ token: string; qr_payload: string; expires_at: string; message: string }>("/carecircle/qr/generate", { method: "POST" }),
  requestCareCircleAccess: (token: string, relationship_label = "Caregiver") => request<{ id: string; status: string; message: string }>("/carecircle/request-access", { method: "POST", body: JSON.stringify({ token, relationship_label }) }),
  careCircleRequestStatus: (requestId: string) => request<{ id: string; status: string }>(`/carecircle/requests/${requestId}/status`),
  careCircleRequests: () => request<CareCircleRequestItem[]>("/carecircle/requests"),
  respondCareCircleRequest: (requestId: string, action: "approve" | "reject", scopes?: { share_emergency?: boolean; share_risk_category?: boolean; share_wellness_summary?: boolean; share_nutrition?: boolean; share_chat_history?: boolean }) => request<{ id: string; status: string; message: string }>(`/carecircle/requests/${requestId}/respond`, { method: "POST", body: JSON.stringify({ action, ...(scopes || {}) }) }),
  revokeCareCircleAccess: (requestId: string) => request<{ id: string; status: string; message: string }>(`/carecircle/requests/${requestId}/revoke`, { method: "POST" }),
  careCircleConnections: () => request<CareCircleConnectionItem[]>("/carecircle/connections"),
  careCircleSharedSummary: (accessId: string) => request<Record<string, unknown>>(`/carecircle/shared-summary/${accessId}`),
  careCircleChatHistory: (accessId: string) => request<ChatMessage[]>(`/carecircle/chat-history/${accessId}`),

  // Doctor Portal
  doctorPatients: () => request<DoctorPatientItem[]>("/doctor/patients"),
  doctorPatientTimeline: (patientId: string) => request<Record<string, unknown>>(`/doctor/patients/${patientId}/timeline`),
  doctorPatientChatHistory: (patientId: string) => request<ChatMessage[]>(`/doctor/patients/${patientId}/chat-history`),
  doctorEscalations: () => request<{ case_id: string; mother_id: string; mother_name: string; severity: string; risk_type: string; status: string; created_at: string }[]>("/doctor/escalations"),
  doctorAddNote: (patientId: string, payload: { clinical_observations: string; follow_up_recommendation?: string; prescribed_advice?: string }) => request<Record<string, unknown>>(`/doctor/patients/${patientId}/notes`, { method: "POST", body: JSON.stringify(payload) }),

  // Admin
  adminUsers: () => request<User[]>("/admin/users"),
  adminAuditLogs: () => request<Record<string, unknown>[]>("/admin/audit-logs"),
  adminDashboard: () => request<Record<string, unknown>>("/admin/dashboard"),

  // HerReach Healthcare Discovery
  herreachFacilities: (params: { query?: string; category?: string; lat?: number; lng?: number; area?: string; radius?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("query", params.query);
    if (params.category) searchParams.set("category", params.category);
    if (params.lat !== undefined && params.lat !== null) searchParams.set("lat", String(params.lat));
    if (params.lng !== undefined && params.lng !== null) searchParams.set("lng", String(params.lng));
    if (params.area) searchParams.set("area", params.area);
    if (params.radius) searchParams.set("radius", String(params.radius));
    const qs = searchParams.toString();
    return request<FacilitySearchResponse>(qs ? `/herreach/facilities?${qs}` : "/herreach/facilities");
  },
  herreachRecommendations: () => request<HerReachRecommendationsResponse>("/herreach/recommendations"),
  herreachHelplines: () => request<OfficialHelpline[]>("/herreach/helplines"),

  // Notifications
  notifications: () => request<Alert[]>("/notifications"),
};

export async function uploadVoice(file: File, language: string) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE}/chat/voice?language=${encodeURIComponent(language)}`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: form,
  });
  if (!response.ok) throw new Error("Voice message failed");
  return response.json() as Promise<ChatMessage>;
}
