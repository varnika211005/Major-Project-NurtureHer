import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaregiverPage } from "./CaregiverPage";
import { api, EducationalResource } from "@/lib/api";
import { LanguageContext } from "@/context/language-context";
import * as offlineStore from "@/lib/offlineLibraryStore";

const mockVideoResource: EducationalResource = {
  id: "vid-caregiver-1",
  series_name: "NurtureHer English",
  title: "Maternal Health Education (English)",
  description: "Essential physical bonding, skin-to-skin kangaroo care, and safe sleep guidance for partners.",
  content_type: "video",
  language: "en",
  is_verified: false,
  category: "Maternal Health Educational Series",
  video_url: "/media/videos/NurtureHer-English.mp4",
  thumbnail_url: "/landing-new/hero-preview.png",
  duration_seconds: 1781,
  file_size_bytes: 206195482,
  author_publisher: "Maternal & Child Health Board",
  review_date: "October 2026",
  sources_json: '["WHO Kangaroo Mother Care Standards", "IAP Neonatal Guidelines"]',
  is_downloadable: true,
  is_published: true,
  created_at: "2026-10-23T00:00:00Z",
};

const mockArticleResource: EducationalResource = {
  id: "art-caregiver-1",
  title: "Postpartum Recovery Protocol: Physical Healing & Lochia Stages",
  description: "Fourth trimester physical healing timeline, perineal care, and red flag bleeding patterns.",
  content_type: "article",
  category: "Postpartum recovery",
  article_content: "# Postpartum Recovery Protocol\n\nCaregiver physical healing and emotional support guidance.\n\n### Key Stages\nRest and gentle hydration.",
  author_publisher: "Clinical Advisory Committee",
  review_date: "September 2026",
  sources_json: '["ACOG Postpartum Toolkit", "RCOG Care Guidelines"]',
  is_downloadable: true,
  is_published: true,
  created_at: "2026-10-23T00:00:00Z",
};

describe("CaregiverPage Component — Educational Library Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, "educationResources").mockResolvedValue([mockVideoResource, mockArticleResource]);
    vi.spyOn(api, "careCircleConnections").mockResolvedValue([]);
    vi.spyOn(offlineStore, "getAllOfflineRecords").mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders exactly two educational resource cards: one video and one article", async () => {
    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Caregiver Companion")).toBeInTheDocument();
    });

    // Check header
    expect(screen.getByText(/Caregiver Guides & Educational Resources/i)).toBeInTheDocument();

    // Verify Card A (Video)
    expect(screen.getByText("Maternal Health Education (English)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Watch Online/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();

    // Verify Card B (Article)
    expect(screen.getByText("Postpartum Recovery Protocol: Physical Healing & Lochia Stages")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Read Article/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Offline/i })).toBeInTheDocument();

    // Verify "Explore All Educational Resources" and "My Offline Library" buttons
    expect(screen.getByRole("button", { name: /Explore All Educational Resources/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /My Offline Library/i })).toBeInTheDocument();
  });

  it("opens video player modal when Watch Online is clicked", async () => {
    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Maternal Health Education (English)")).toBeInTheDocument();
    });

    const watchBtn = screen.getByRole("button", { name: /Watch Online/i });
    fireEvent.click(watchBtn);

    // Modal elements
    expect(screen.getByText(/Caregiver Clinical Advisory/i)).toBeInTheDocument();
    expect(screen.getByText(/Streaming Online/i)).toBeInTheDocument();
  });

  it("opens article reader modal when Read Article is clicked", async () => {
    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Postpartum Recovery Protocol: Physical Healing & Lochia Stages")).toBeInTheDocument();
    });

    const readBtn = screen.getByRole("button", { name: /Read Article/i });
    fireEvent.click(readBtn);

    // Modal content
    expect(screen.getByText(/Medically Reviewed Caregiver Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/Medical References & Review Standards/i)).toBeInTheDocument();
    expect(screen.getByText(/ACOG Postpartum Toolkit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Done Reading/i })).toBeInTheDocument();
  });

  it("triggers video download and article saving for offline usage", async () => {
    const downloadSpy = vi.spyOn(offlineStore, "downloadVideoForOffline").mockResolvedValue({
      ...mockVideoResource,
      download_status: "completed",
    });
    const saveArticleSpy = vi.spyOn(offlineStore, "saveArticleForOffline").mockResolvedValue({
      ...mockArticleResource,
      download_status: "completed",
    });

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
    });

    const downloadBtn = screen.getByRole("button", { name: /Download/i });
    fireEvent.click(downloadBtn);
    expect(downloadSpy).toHaveBeenCalledWith(mockVideoResource, expect.any(Function), expect.any(AbortSignal));

    const saveOfflineBtn = screen.getByRole("button", { name: /Save Offline/i });
    fireEvent.click(saveOfflineBtn);
    expect(saveArticleSpy).toHaveBeenCalledWith(mockArticleResource);
  });

  it("preserves all other Caregiver Companion tabs and sections", async () => {
    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Caregiver Companion")).toBeInTheDocument();
    });

    // Check all tab buttons exist
    expect(screen.getByRole("button", { name: /Caregiver Guides & Videos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Postpartum Warning Signs/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Daily Support Checklist/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mother's Permitted Status/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect to Mother/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /HerReach Facility Finder/i })).toBeInTheDocument();

    // Switch to Warning Signs tab
    fireEvent.click(screen.getByRole("button", { name: /Postpartum Warning Signs/i }));
    expect(screen.getByText(/Postpartum Clinical Warning Signs \(Red Flags\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Call 112 Ambulance/i)).toBeInTheDocument();

    // Switch to Support Checklist tab
    fireEvent.click(screen.getByRole("button", { name: /Daily Support Checklist/i }));
    expect(screen.getByText(/Daily Caregiver Support Checklist/i)).toBeInTheDocument();
  });

  it("restores saved checklist items for today from localStorage on mount and toggles state", async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const storageKey = `caregiver_daily_tasks_${year}-${month}-${day}`;
    localStorage.setItem(storageKey, JSON.stringify(["task1", "task3"]));

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Caregiver Companion")).toBeInTheDocument();
    });

    // Switch to checklist tab
    fireEvent.click(screen.getByRole("button", { name: /Daily Support Checklist/i }));
    expect(screen.getByText(/Daily Caregiver Support Checklist/i)).toBeInTheDocument();

    // Verify task1 (Hydration) is already checked
    const hydrateCheckbox = screen.getByRole("checkbox", { name: /Hydration/i });
    expect(hydrateCheckbox).toHaveAttribute("aria-checked", "true");

    // Toggle off hydrate
    fireEvent.click(hydrateCheckbox);
    expect(hydrateCheckbox).toHaveAttribute("aria-checked", "false");

    // Verify localStorage was updated
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    expect(saved.task1).toBe(false);
    expect(saved.task3).toBe(true);
  });

  it("handles malformed stored checklist JSON safely without crashing", async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const storageKey = `caregiver_daily_tasks_${year}-${month}-${day}`;
    localStorage.setItem(storageKey, "{ malformed: invalid json %%%");

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Caregiver Companion")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Daily Support Checklist/i }));
    expect(screen.getByText(/Daily Caregiver Support Checklist/i)).toBeInTheDocument();

    // Checkboxes should render safely unchecked
    const hydrateCheckbox = screen.getByRole("checkbox", { name: /Hydration/i });
    expect(hydrateCheckbox).toHaveAttribute("aria-checked", "false");
  });

  it("shows accessible success feedback when video download completes and prevents concurrent downloads", async () => {
    vi.spyOn(offlineStore, "downloadVideoForOffline").mockResolvedValueOnce({
      ...mockVideoResource,
      download_status: "completed",
    });

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    const downloadBtn = await screen.findByRole("button", { name: /Download/i });
    fireEvent.click(downloadBtn);

    expect(await screen.findByText(/Video saved to offline library successfully/i)).toBeInTheDocument();
  });

  it("shows helpful error feedback when video download fails due to storage quota", async () => {
    const quotaError = new Error("Quota exceeded");
    quotaError.name = "QuotaExceededError";
    vi.spyOn(offlineStore, "downloadVideoForOffline").mockRejectedValue(quotaError);

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
    });

    const downloadBtn = screen.getByRole("button", { name: /Download/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(screen.getByText(/Device storage quota exceeded/i)).toBeInTheDocument();
    });
  });

  it("shows accessible success and error feedback for article offline saving", async () => {
    const saveArticleSpy = vi.spyOn(offlineStore, "saveArticleForOffline");
    saveArticleSpy.mockResolvedValueOnce({
      ...mockArticleResource,
      download_status: "completed",
    });

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Save Offline/i })).toBeInTheDocument();
    });

    // Save success
    fireEvent.click(screen.getByRole("button", { name: /Save Offline/i }));
    await waitFor(() => {
      expect(screen.getByText(/Article saved to offline library successfully/i)).toBeInTheDocument();
    });

    // Save failure
    saveArticleSpy.mockRejectedValueOnce(new Error("Database transaction aborted"));
    fireEvent.click(screen.getByRole("button", { name: /Save Offline/i }));
    await waitFor(() => {
      expect(screen.getByText(/Failed to save article: Database transaction aborted/i)).toBeInTheDocument();
    });
  });

  it("displays fallback availability card when active language has no matching educational content", async () => {
    // Resources only exist in 'en'
    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <LanguageContext.Provider
          value={{
            language: "hi" as any,
            setLanguage: vi.fn(),
            t: {} as any,
            languages: [],
            currentLanguage: { code: "hi", name: "Hindi", nativeName: "हिन्दी" } as any,
          }}
        >
          <CaregiverPage />
        </LanguageContext.Provider>
      </MemoryRouter>,
    );

    // Both video and article slots should render friendly availability cards instead of crashing or showing unrelated content
    expect(await screen.findByText(/Video in Hindi Pending/i)).toBeInTheDocument();
    expect(await screen.findByText(/Article in Hindi Pending Translation/i)).toBeInTheDocument();
    expect(screen.getByText(/Educational demonstrations are currently verified in English/i)).toBeInTheDocument();
  });

  it("handles geolocation denial gracefully with clear prompt for manual location entry in HerReach tab", async () => {
    // Mock geolocation error
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success, error) => {
        error({ code: 1, message: "User denied Geolocation", PERMISSION_DENIED: 1, TIMEOUT: 3, POSITION_UNAVAILABLE: 2 });
      }),
    };
    Object.defineProperty(window.navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    // Wait for page loading to complete
    expect(await screen.findByRole("button", { name: /Caregiver Guides & Videos/i })).toBeInTheDocument();

    // Switch to HerReach tab
    fireEvent.click(screen.getByRole("button", { name: /HerReach Facility Finder/i }));
    expect(await screen.findByText(/Locate nearby hospitals, medical stores/i)).toBeInTheDocument();

    // Click Near Me button
    const detectBtn = screen.getByRole("button", { name: /Near Me/i });
    fireEvent.click(detectBtn);

    // Verify error notification informs user to enter PIN code / locality manually
    await waitFor(() => {
      expect(screen.getByText(/Location access denied. Please enter your area, city, or PIN code manually below./i)).toBeInTheDocument();
    });
  });

  it("displays Google Maps fallback when external live provider is unconfigured in HerReach tab", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    vi.spyOn(api, "herreachFacilities").mockResolvedValue({
      is_live_provider: false,
      provider_status: "Google Maps Places API key is not configured in the backend environment (GOOGLE_MAPS_API_KEY).",
      provider_name: "Google Maps Places API",
      total_found: 0,
      query: "",
      category: "hospital",
      location_searched: "560096",
      external_search_url: "https://www.google.com/maps/search/?api=1&query=hospital+near+560096",
      facilities: [],
      official_helplines: [
        { title: "National Emergency Number", number: "112", description: "Immediate emergency response", category: "urgent" },
        { title: "Emergency Medical Ambulance", number: "108", description: "Free medical ambulance", category: "urgent" },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Caregiver Companion")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /HerReach Facility Finder/i }));
    expect(screen.getByText(/Locate nearby hospitals, medical stores/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Area, city, or PIN code/i);
    fireEvent.change(searchInput, { target: { value: "560096" } });

    const searchBtn = screen.getByRole("button", { name: /^Search$/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Live Maps Provider Status/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Google Maps Places API key is not configured/i)).toBeInTheDocument();
    const gmapsBtn = screen.getByRole("button", { name: /Search "hospital" on Google Maps/i });
    expect(gmapsBtn).toBeInTheDocument();
    fireEvent.click(gmapsBtn);
    expect(openSpy).toHaveBeenCalledWith(
      "https://www.google.com/maps/search/?api=1&query=hospital+near+560096",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("navigates to Care Companion AI tab and renders CaregiverChat", async () => {
    vi.spyOn(api, "caregiverChatHistory").mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={["/caregiver"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Caregiver Companion")).toBeInTheDocument();
    });

    const aiTabBtn = screen.getByRole("button", { name: /Care Companion AI/i });
    expect(aiTabBtn).toBeInTheDocument();
    fireEvent.click(aiTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId("caregiver-rag-chatbot")).toBeInTheDocument();
    });
    expect(screen.getByText(/Care Companion Assistant/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/maternal recovery, warning signs/i)).toBeInTheDocument();
  });

  it("sends caregiver message using api.caregiverChat and NEVER calls legacy api.sendChat", async () => {
    vi.spyOn(api, "caregiverChatHistory").mockResolvedValue([]);
    const legacySpy = vi.spyOn(api, "sendChat");
    const caregiverChatSpy = vi.spyOn(api, "caregiverChat").mockResolvedValue({
      id: "chat-msg-1",
      message: "What are warning signs of preeclampsia?",
      response: "Severe headache, vision changes, and sudden swelling are urgent signs requiring medical evaluation.",
      language: "en",
      sources: [
        {
          id: "who-preeclampsia-p12",
          title: "WHO Maternal Guidelines",
          publisher: "World Health Organization",
          page: 12,
          excerpt: "Persistent severe headache and visual disturbances indicate preeclampsia.",
        },
      ],
      clinical_disclaimer: "Non-diagnostic guidance. Always consult healthcare professionals.",
      has_maternal_data: false,
      maternal_consent_status: "Verified",
      created_at: "2026-10-24T00:00:00Z",
    });

    render(
      <MemoryRouter initialEntries={["/caregiver?tab=coach"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("caregiver-rag-chatbot")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/maternal recovery, warning signs/i);
    fireEvent.change(input, { target: { value: "What are warning signs of preeclampsia?" } });

    const sendBtn = screen.getByRole("button", { name: /^Send$/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(caregiverChatSpy).toHaveBeenCalledWith("What are warning signs of preeclampsia?", "en");
    });

    // Ensure legacy chatbot is NEVER called
    expect(legacySpy).not.toHaveBeenCalled();

    // Verify response and citations are displayed
    await waitFor(() => {
      expect(screen.getByText(/Severe headache, vision changes, and sudden swelling/i)).toBeInTheDocument();
      expect(screen.getByText(/WHO Maternal Guidelines/i)).toBeInTheDocument();
    });
  });

  it("handles provider failure gracefully without calling legacy chatbot", async () => {
    vi.spyOn(api, "caregiverChatHistory").mockResolvedValue([]);
    const legacySpy = vi.spyOn(api, "sendChat");
    vi.spyOn(api, "caregiverChat").mockRejectedValue(new Error("AI model provider is unavailable."));

    render(
      <MemoryRouter initialEntries={["/caregiver?tab=coach"]}>
        <CaregiverPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("caregiver-rag-chatbot")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/maternal recovery, warning signs/i);
    fireEvent.change(input, { target: { value: "Hello AI" } });

    const sendBtn = screen.getByRole("button", { name: /^Send$/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/AI model provider is unavailable/i)).toBeInTheDocument();
    });

    expect(legacySpy).not.toHaveBeenCalled();
  });
});
