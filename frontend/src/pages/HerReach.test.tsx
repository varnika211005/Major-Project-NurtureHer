import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/context/auth-context";
import { LanguageProvider } from "@/context/LanguageContext";
import { api, FacilitySearchResponse, HerReachRecommendationsResponse } from "@/lib/api";
import { HerReachPage } from "./HerReach";

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    api: {
      ...original.api,
      herreachFacilities: vi.fn(),
      herreachRecommendations: vi.fn(),
      herreachHelplines: vi.fn(),
    },
  };
});

const mockedFacilities = vi.mocked(api.herreachFacilities);
const mockedRecommendations = vi.mocked(api.herreachRecommendations);

const mockFacilityResponse: FacilitySearchResponse = {
  is_live_provider: true,
  provider_status: "Live Google Places API search successful.",
  provider_name: "Google Maps Places API",
  total_found: 2,
  query: "Apollo",
  category: "gynaecology",
  location_searched: "Indiranagar",
  external_search_url: "https://www.google.com/maps/search/?api=1&query=Apollo",
  facilities: [
    {
      id: "fac-1",
      name: "Apollo Cradle & Children's Hospital",
      facility_type: "Gynaecologists & Women's Health Clinics",
      address: "100 Feet Rd, Indiranagar, Bengaluru",
      lat: 12.9716,
      lng: 77.5946,
      distance_km: 1.8,
      contact_number: "+91 80 4668 8888",
      opening_hours: "Open now",
      directions_url: "https://maps.google.com/?q=Apollo+Cradle",
      rating: 4.6,
      user_ratings_total: 420,
      is_emergency: true,
    },
    {
      id: "fac-2",
      name: "Fortis La Femme Speciality Hospital",
      facility_type: "Gynaecologists & Women's Health Clinics",
      address: "Richmond Rd, Bengaluru",
      lat: 12.965,
      lng: 77.601,
      distance_km: 3.2,
      contact_number: "+91 80 6621 4444",
      opening_hours: "Open now",
      directions_url: "https://maps.google.com/?q=Fortis+La+Femme",
      rating: 4.4,
      user_ratings_total: 280,
      is_emergency: false,
    },
  ],
  official_helplines: [
    {
      title: "National Emergency Number",
      number: "112",
      description: "Immediate emergency response",
      category: "urgent",
    },
    {
      title: "Emergency Medical Ambulance",
      number: "108",
      description: "Free medical ambulance",
      category: "urgent",
    },
  ],
};

const mockFallbackResponse: FacilitySearchResponse = {
  is_live_provider: false,
  provider_status: "Google Maps Places API key is not configured in the backend environment (GOOGLE_MAPS_API_KEY).",
  provider_name: "Google Maps Places API",
  total_found: 0,
  query: "",
  category: "gynaecology",
  location_searched: null,
  external_search_url: "https://www.google.com/maps/search/?api=1&query=gynaecologist",
  facilities: [],
  official_helplines: [
    {
      title: "National Emergency Number",
      number: "112",
      description: "Immediate emergency response",
      category: "urgent",
    },
    {
      title: "Tele-MANAS Mental Health Helpline",
      number: "14416",
      description: "Free counseling",
      category: "mental_health",
    },
  ],
};

const mockMotherRecs: HerReachRecommendationsResponse = {
  user_role: "mother",
  has_pcos_data: true,
  has_ppd_data: false,
  has_pregnancy_data: true,
  clinical_disclaimer: "Screening results and suggestions in HerReach are not medical diagnoses.",
  recommendations: [
    {
      concern_key: "pcos",
      concern_title: "PCOS & Hormonal Health Exploration",
      detected_assessment_basis: "Recorded screening risk level: Moderate",
      suggested_facility_types: ["Gynaecologists", "Reproductive Endocrinology Clinics"],
      recommended_category: "gynaecology",
      clinical_safety_notice: "Facilities that may be relevant to your concern. Screening results are not confirmed medical diagnoses.",
    },
    {
      concern_key: "urgent",
      concern_title: "Urgent & Emergency Medical Care",
      detected_assessment_basis: "General Safety Guidance",
      suggested_facility_types: ["24x7 Emergency Rooms & Casualty Wards"],
      recommended_category: "emergency",
      clinical_safety_notice: "CRITICAL: Never delay seeking emergency hospital care.",
    },
  ],
  available_categories: ["gynaecology", "mental_health", "maternity", "hospital"],
};

function renderHerReach(role: "mother" | "caregiver" | "doctor" = "mother") {
  return render(
    <LanguageProvider>
      <AuthContext.Provider
        value={{
          user: {
            id: "u-1",
            email: `${role}@example.com`,
            name: `Test ${role}`,
            phone: "+91 9999999999",
            role: role,
            preferred_language: "en",
            is_verified: true,
            is_active: true,
          },
          loading: false,
          signIn: async () => undefined,
          signUp: async () => undefined,
          signOut: async () => undefined,
        }}
      >
        <HerReachPage defaultRoleOverride={role} />
      </AuthContext.Provider>
    </LanguageProvider>
  );
}

describe("HerReach Healthcare Discovery Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders clinical decision support safety notice and non-diagnostic disclaimer", async () => {
    mockedFacilities.mockResolvedValueOnce(mockFallbackResponse);
    mockedRecommendations.mockResolvedValueOnce(mockMotherRecs);

    renderHerReach("mother");

    expect(screen.getByText(/Clinical Decision Support Notice & Safety Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/Never delay emergency care/i)).toBeInTheDocument();
  });

  it("Mother view displays concern-based recommendations from genuine assessments", async () => {
    mockedFacilities.mockResolvedValueOnce(mockFallbackResponse);
    mockedRecommendations.mockResolvedValueOnce(mockMotherRecs);

    renderHerReach("mother");

    await waitFor(() => {
      expect(screen.getByText(/PCOS & Hormonal Health Exploration/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Recorded screening risk level: Moderate/i)).toBeInTheDocument();
  });

  it("renders discovered facilities with name, distance, and direction actions when live provider is active", async () => {
    mockedFacilities.mockResolvedValueOnce(mockFacilityResponse);
    mockedRecommendations.mockResolvedValueOnce(mockMotherRecs);

    renderHerReach("mother");

    await waitFor(() => {
      expect(screen.getByText("Apollo Cradle & Children's Hospital")).toBeInTheDocument();
    });

    expect(screen.getByText("1.8 km away")).toBeInTheDocument();
    expect(screen.getByText("Fortis La Femme Speciality Hospital")).toBeInTheDocument();
    expect(screen.getByText("3.2 km away")).toBeInTheDocument();
  });

  it("renders graceful fallback with provider status and external Google Maps search link when unconfigured", async () => {
    mockedFacilities.mockResolvedValueOnce(mockFallbackResponse);
    mockedRecommendations.mockResolvedValueOnce(mockMotherRecs);

    renderHerReach("mother");

    await waitFor(() => {
      expect(screen.getByText(/Live Maps Provider Status/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/GOOGLE_MAPS_API_KEY/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Direct Google Maps Search/i })).toBeInTheDocument();
    // Verifies official 24x7 helplines
    expect(screen.getByText("National Emergency Number")).toBeInTheDocument();
    expect(screen.getByText("112")).toBeInTheDocument();
  });

  it("Caregiver experience provides simple healthcare facility search without requiring assessments", async () => {
    mockedFacilities.mockResolvedValueOnce(mockFacilityResponse);

    renderHerReach("caregiver");

    expect(screen.getByText(/HerReach — Family Healthcare Facility Finder/i)).toBeInTheDocument();
    // Caregiver doesn't call mother recommendations
    expect(mockedRecommendations).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText("Apollo Cradle & Children's Hospital")).toBeInTheDocument();
    });
  });

  it("Doctor experience provides professional resource finder for patient guidance", async () => {
    mockedFacilities.mockResolvedValueOnce(mockFacilityResponse);

    renderHerReach("doctor");

    expect(screen.getByText(/HerReach — Clinical Healthcare Resource Finder/i)).toBeInTheDocument();
    expect(mockedRecommendations).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText("Apollo Cradle & Children's Hospital")).toBeInTheDocument();
    });
  });

  it("submits manual search when user types query and clicks Search", async () => {
    const user = userEvent.setup();
    mockedFacilities.mockResolvedValueOnce(mockFallbackResponse);
    mockedRecommendations.mockResolvedValueOnce(mockMotherRecs);

    renderHerReach("mother");

    await waitFor(() => {
      expect(mockedFacilities).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByPlaceholderText(/Search healthcare facility or specialist/i);
    await user.type(searchInput, "Manipal Hospital");

    mockedFacilities.mockResolvedValueOnce(mockFacilityResponse);
    const searchBtn = screen.getByRole("button", { name: /^Search$/i });
    await user.click(searchBtn);

    await waitFor(() => {
      expect(mockedFacilities).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "Manipal Hospital",
        })
      );
    });
  });
});
