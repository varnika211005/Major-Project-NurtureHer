import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EducationLibraryPage } from "./EducationLibraryPage";
import { api, EducationalResource } from "@/lib/api";
import * as offlineStore from "@/lib/offlineLibraryStore";
import { LanguageProvider } from "@/context/LanguageContext";

const mockVideos: EducationalResource[] = [
  {
    id: "video-1",
    title: "First Trimester Care and Nutrition",
    description: "Guidance on vitamins, scans, and morning sickness.",
    content_type: "video",
    language: "en",
    series_name: "NurtureHer English",
    is_verified: false,
    category: "Pregnancy care and trimester-wise guidance",
    video_url: "/media/videos/NurtureHer-English.mp4",
    thumbnail_url: "/nurtureher-logo.png",
    duration_seconds: 300,
    file_size_bytes: 788493,
    author_publisher: "Clinical Advisory",
    review_date: "October 2026",
    sources_json: '["ACOG Guidelines"]',
    is_downloadable: true,
    is_published: true,
    created_at: "2026-10-23T00:00:00Z",
  },
  {
    id: "video-2",
    title: "Safe Prenatal Breathing Exercises",
    description: "Gentle diaphragmatic breathing techniques in Hindi.",
    content_type: "video",
    language: "hi",
    series_name: "NurtureHer Hindi",
    is_verified: false,
    category: "Exercise and safe physical activity during pregnancy",
    video_url: "/media/videos/NurtureHer-Hindi.mp4",
    thumbnail_url: "/nurtureher-icon.png",
    duration_seconds: 240,
    file_size_bytes: 788493,
    author_publisher: "Physical Therapy Board",
    review_date: "September 2026",
    sources_json: '["RCOG"]',
    is_downloadable: true,
    is_published: true,
    created_at: "2026-10-23T00:00:00Z",
  },
  {
    id: "video-3",
    title: "Kannada Lactation Guidance",
    description: "Breastfeeding cues and latch techniques in Kannada.",
    content_type: "video",
    language: "kn",
    series_name: "NurtureHer Kannada",
    is_verified: false,
    category: "Maternal Health Educational Series",
    video_url: "/media/videos/NurtureHer-Kannada.mp4",
    thumbnail_url: "/favicon-48x48.png",
    duration_seconds: 704,
    file_size_bytes: 104174878,
    author_publisher: "Lactation Science Foundation",
    review_date: "October 2026",
    sources_json: '["UNICEF"]',
    is_downloadable: true,
    is_published: true,
    created_at: "2026-10-23T00:00:00Z",
  },
];

const mockArticles: EducationalResource[] = [
  {
    id: "article-1",
    title: "Postpartum Recovery Protocol",
    description: "Fourth trimester physical healing and rest recommendations.",
    content_type: "article",
    language: "en",
    category: "Postpartum recovery",
    thumbnail_url: "/nurtureher-logo.png",
    article_content: "# Postpartum Recovery Protocol\n\nDetailed guidance on lochia, wound healing, and rest.",
    author_publisher: "Maternal Health Collaborative",
    review_date: "October 2026",
    sources_json: '["ACOG 2024"]',
    is_downloadable: true,
    is_published: true,
    created_at: "2026-10-23T00:00:00Z",
  },
  {
    id: "article-2",
    title: "Maternal Nutrition Roadmap Hindi",
    description: "Dietary guidelines and iron intake in Hindi.",
    content_type: "article",
    language: "hi",
    category: "Nutrition and hydration",
    thumbnail_url: "/nurtureher-icon.png",
    article_content: "# Maternal Nutrition Roadmap\n\nIron, folate, and calcium dietary advice.",
    author_publisher: "NIN India",
    review_date: "October 2026",
    sources_json: '["ICMR-NIN"]',
    is_downloadable: true,
    is_published: true,
    created_at: "2026-10-23T00:00:00Z",
  },
];

describe("EducationLibraryPage Component", () => {
  beforeEach(() => {
    vi.spyOn(api, "educationResources").mockResolvedValue([...mockVideos, ...mockArticles]);
    vi.spyOn(offlineStore, "getAllOfflineRecords").mockResolvedValue([]);
    vi.spyOn(offlineStore, "getStorageQuota").mockResolvedValue({
      usedBytes: 1500000,
      quotaBytes: 50000000,
      percent: 3,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the educational library with language selector and defaults to English initial selection", async () => {
    render(
      <MemoryRouter initialEntries={["/library?tab=videos"]}>
        <LanguageProvider>
          <EducationLibraryPage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Educational Video Library")[0]).toBeInTheDocument();
    });

    // Language selector pills exist
    expect(screen.getByRole("button", { name: /^All Languages/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^English/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Hindi/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Kannada/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Tamil/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Telugu/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Malayalam/i })).toBeInTheDocument();

    // Default selection is All Languages -> all videos shown in grid
    expect(screen.getByText("First Trimester Care and Nutrition")).toBeInTheDocument();
    expect(screen.getByText("Series: NurtureHer English")).toBeInTheDocument();
    expect(screen.getAllByText("Unverified Content")[0]).toBeInTheDocument();
    expect(screen.getByText("Safe Prenatal Breathing Exercises")).toBeInTheDocument();
    expect(screen.getByText("Kannada Lactation Guidance")).toBeInTheDocument();
  });

  it("filters videos by selecting Hindi in the language selector", async () => {
    render(
      <MemoryRouter initialEntries={["/library?tab=videos"]}>
        <LanguageProvider>
          <EducationLibraryPage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("First Trimester Care and Nutrition")).toBeInTheDocument();
    });

    // Click Hindi
    const hindiButton = screen.getByRole("button", { name: /^Hindi/i });
    fireEvent.click(hindiButton);

    expect(screen.getByText("Safe Prenatal Breathing Exercises")).toBeInTheDocument();
    expect(screen.queryByText("First Trimester Care and Nutrition")).not.toBeInTheDocument();
  });

  it("displays all languages when 'All Languages' is selected", async () => {
    render(
      <MemoryRouter initialEntries={["/library?tab=videos"]}>
        <LanguageProvider>
          <EducationLibraryPage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("First Trimester Care and Nutrition")).toBeInTheDocument();
    });

    const allButton = screen.getByRole("button", { name: /^All Languages/i });
    fireEvent.click(allButton);

    expect(screen.getByText("First Trimester Care and Nutrition")).toBeInTheDocument();
    expect(screen.getByText("Safe Prenatal Breathing Exercises")).toBeInTheDocument();
    expect(screen.getByText("Kannada Lactation Guidance")).toBeInTheDocument();
  });

  it("switches to articles tab and displays language filtered article cards with Save Offline buttons", async () => {
    render(
      <MemoryRouter initialEntries={["/library?tab=articles"]}>
        <LanguageProvider>
          <EducationLibraryPage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Postpartum Recovery Protocol")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: /Save Offline/i })[0]).toBeInTheDocument();

    // Switch to Hindi articles
    const hindiButton = screen.getByRole("button", { name: /^Hindi/i });
    fireEvent.click(hindiButton);

    expect(screen.getByText("Maternal Nutrition Roadmap Hindi")).toBeInTheDocument();
    expect(screen.queryByText("Postpartum Recovery Protocol")).not.toBeInTheDocument();
  });

  it("switches to My Offline Library tab and shows all saved resources regardless of language filter", async () => {
    vi.spyOn(offlineStore, "getAllOfflineRecords").mockResolvedValue([
      {
        id: "video-1",
        title: "First Trimester Care and Nutrition",
        description: "Saved locally.",
        content_type: "video",
        language: "en",
        category: "Pregnancy care and trimester-wise guidance",
        file_size_bytes: 788493,
        download_status: "completed",
        downloaded_at: "2026-10-23T05:00:00Z",
        is_downloadable: true,
      },
      {
        id: "video-2",
        title: "Safe Prenatal Breathing Exercises",
        description: "Saved locally in Hindi.",
        content_type: "video",
        language: "hi",
        category: "Exercise and safe physical activity during pregnancy",
        file_size_bytes: 788493,
        download_status: "completed",
        downloaded_at: "2026-10-23T05:00:00Z",
        is_downloadable: true,
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/offline-library"]}>
        <LanguageProvider>
          <EducationLibraryPage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Offline Resources Ready on This Device")).toBeInTheDocument();
    });

    // Both English and Hindi saved items are visible in offline library
    expect(screen.getByText("First Trimester Care and Nutrition")).toBeInTheDocument();
    expect(screen.getByText("Safe Prenatal Breathing Exercises")).toBeInTheDocument();
    expect(screen.getAllByText("Play Offline").length).toBe(2);
  });

  it("saves an article for offline reading when Save Offline is clicked", async () => {
    const saveSpy = vi.spyOn(offlineStore, "saveArticleForOffline").mockResolvedValue({
      id: "article-1",
      title: "Postpartum Recovery Protocol",
      description: "Fourth trimester physical healing.",
      content_type: "article",
      language: "en",
      category: "Postpartum recovery",
      download_status: "completed",
      is_downloadable: true,
    });

    render(
      <MemoryRouter initialEntries={["/library?tab=articles"]}>
        <LanguageProvider>
          <EducationLibraryPage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Postpartum Recovery Protocol")).toBeInTheDocument();
    });

    const saveBtn = screen.getAllByRole("button", { name: /Save Offline/i })[0];
    fireEvent.click(saveBtn);

    expect(saveSpy).toHaveBeenCalledWith(mockArticles[0]);
  });
});
