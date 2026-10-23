import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaregiverPage } from "./CaregiverPage";
import { api, EducationalResource } from "@/lib/api";
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
    vi.spyOn(api, "educationResources").mockResolvedValue([mockVideoResource, mockArticleResource]);
    vi.spyOn(api, "careCircleConnections").mockResolvedValue([]);
    vi.spyOn(offlineStore, "getAllOfflineRecords").mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
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
});
