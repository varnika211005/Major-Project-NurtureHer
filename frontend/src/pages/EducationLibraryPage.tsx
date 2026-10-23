import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Globe,
  HardDrive,
  Info,
  Languages,
  Layers,
  Pause,
  Play,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  Video,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Page } from "@/components/common/Page";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/useLanguage";
import {
  api,
  EducationalResource,
} from "@/lib/api";
import {
  downloadVideoForOffline,
  formatBytes,
  formatDuration,
  getAllOfflineRecords,
  getStorageQuota,
  OfflineResourceRecord,
  removeOfflineResource,
  saveArticleForOffline,
} from "@/lib/offlineLibraryStore";

export interface LibraryLanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LIBRARY_LANGUAGES: LibraryLanguageOption[] = [
  { code: "all", name: "All Languages", nativeName: "All" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
];

export function getLanguageDisplay(langCode?: string | null): { code: string; label: string; verified: boolean } {
  if (!langCode || !langCode.trim()) {
    return { code: "unknown", label: "Unknown Language", verified: false };
  }
  const code = langCode.toLowerCase().trim();
  const map: Record<string, string> = {
    en: "English",
    hi: "Hindi (हिन्दी)",
    kn: "Kannada (ಕನ್ನಡ)",
    ta: "Tamil (தமிழ்)",
    te: "Telugu (తెలుగు)",
    ml: "Malayalam (മലയാളം)",
  };
  if (map[code]) {
    return { code, label: map[code], verified: true };
  }
  return { code, label: langCode.toUpperCase(), verified: false };
}

export function EducationLibraryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language: userAppLanguage } = useLanguage();

  const isOfflineRoute = location.pathname.includes("offline-library");
  const initialTab = (isOfflineRoute || searchParams.get("tab") === "offline")
    ? "offline"
    : searchParams.get("tab") === "articles"
    ? "articles"
    : "videos";

  const [activeTab, setActiveTab] = useState<"videos" | "articles" | "offline">(initialTab);

  // Initial language selection: defaults to "all" so all six regional videos are displayed immediately
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [resources, setResources] = useState<EducationalResource[]>([]);
  const [offlineRecords, setOfflineRecords] = useState<OfflineResourceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [offlineFilter, setOfflineFilter] = useState<"all" | "videos" | "articles">("all");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageUsage, setStorageUsage] = useState<{ usedBytes: number; quotaBytes: number; percent: number }>({
    usedBytes: 0,
    quotaBytes: 0,
    percent: 0,
  });

  // Download state tracker: resourceId -> { progress, abortController }
  const [downloadTasks, setDownloadTasks] = useState<Record<string, { progress: number; controller: AbortController }>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});

  // Active viewing modals
  const [playingVideo, setPlayingVideo] = useState<{ resource?: EducationalResource; offlineRecord?: OfflineResourceRecord; blobUrl?: string } | null>(null);
  const [readingArticle, setReadingArticle] = useState<{ resource?: EducationalResource; offlineRecord?: OfflineResourceRecord } | null>(null);

  // Sync tab with URL
  useEffect(() => {
    if (isOfflineRoute) {
      setActiveTab("offline");
      return;
    }
    const tabParam = searchParams.get("tab");
    if (tabParam === "offline" || tabParam === "articles" || tabParam === "videos") {
      setActiveTab(tabParam);
    }
  }, [searchParams, isOfflineRoute]);

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load online resources and offline records
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allRes, savedLocal, quota] = await Promise.all([
        api.educationResources(),
        getAllOfflineRecords().catch(() => []),
        getStorageQuota().catch(() => ({ usedBytes: 0, quotaBytes: 0, percent: 0 })),
      ]);
      setResources(Array.isArray(allRes) ? allRes : []);
      setOfflineRecords(savedLocal);
      setStorageUsage(quota);
    } catch (err: unknown) {
      const savedLocal = await getAllOfflineRecords().catch(() => []);
      setOfflineRecords(savedLocal);
      const quota = await getStorageQuota().catch(() => ({ usedBytes: 0, quotaBytes: 0, percent: 0 }));
      setStorageUsage(quota);
      setError("Unable to load educational library from network. Please check your connection or try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Map of offline completed resource IDs
  const offlineMap = useMemo(() => {
    const map = new Map<string, OfflineResourceRecord>();
    for (const rec of offlineRecords) {
      if (
        rec.download_status === "completed" &&
        (rec.content_type !== "video" || rec.video_blob || (rec.downloaded_bytes && rec.downloaded_bytes > 0))
      ) {
        map.set(rec.id, rec);
      }
    }
    return map;
  }, [offlineRecords]);

  // Filtered online videos by language and search query
  const filteredVideos = useMemo(() => {
    return resources.filter((r) => {
      if (r.content_type !== "video") return false;

      // Language filter:
      // "all" shows all languages.
      // Specific language matches the resource's verified language metadata.
      // Resources without verified language metadata are excluded from specific language filters.
      if (selectedLanguage !== "all") {
        if (!r.language || !r.language.trim()) return false;
        if (r.language.toLowerCase().trim() !== selectedLanguage.toLowerCase().trim()) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.author_publisher && r.author_publisher.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [resources, selectedLanguage, searchQuery]);

  // Filtered online articles by language and search query
  const filteredArticles = useMemo(() => {
    return resources.filter((r) => {
      if (r.content_type !== "article") return false;

      if (selectedLanguage !== "all") {
        if (!r.language || !r.language.trim()) return false;
        if (r.language.toLowerCase().trim() !== selectedLanguage.toLowerCase().trim()) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.author_publisher && r.author_publisher.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [resources, selectedLanguage, searchQuery]);

  // Filtered offline downloads:
  // Shows all stored items regardless of selected online language filter
  const filteredOffline = useMemo(() => {
    return offlineRecords.filter((rec) => {
      if (rec.download_status !== "completed") return false;
      if (offlineFilter === "videos" && rec.content_type !== "video") return false;
      if (offlineFilter === "articles" && rec.content_type !== "article") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.title.toLowerCase().includes(q) ||
          rec.description.toLowerCase().includes(q) ||
          (rec.author_publisher && rec.author_publisher.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [offlineRecords, offlineFilter, searchQuery]);

  // --- ACTIONS ---

  const handleDownloadVideo = async (resource: EducationalResource) => {
    const controller = new AbortController();
    setDownloadTasks((prev) => ({
      ...prev,
      [resource.id]: { progress: 0, controller },
    }));
    setDownloadErrors((prev) => {
      const u = { ...prev };
      delete u[resource.id];
      return u;
    });

    try {
      await downloadVideoForOffline(
        resource,
        (pct) => {
          setDownloadTasks((prev) => {
            if (!prev[resource.id]) return prev;
            return {
              ...prev,
              [resource.id]: { ...prev[resource.id], progress: pct },
            };
          });
        },
        controller.signal,
      );

      const refreshed = await getAllOfflineRecords();
      setOfflineRecords(refreshed);
      const quota = await getStorageQuota();
      setStorageUsage(quota);
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setDownloadErrors((prev) => ({
          ...prev,
          [resource.id]: (err as Error)?.message || "Download Failed",
        }));
      }
    } finally {
      setDownloadTasks((prev) => {
        const updated = { ...prev };
        delete updated[resource.id];
        return updated;
      });
    }
  };

  const handleCancelDownload = (resourceId: string) => {
    const task = downloadTasks[resourceId];
    if (task) {
      task.controller.abort();
    }
  };

  const handleSaveArticle = async (resource: EducationalResource) => {
    try {
      await saveArticleForOffline(resource);
      const refreshed = await getAllOfflineRecords();
      setOfflineRecords(refreshed);
      const quota = await getStorageQuota();
      setStorageUsage(quota);
    } catch {
      // Storage error
    }
  };

  const handleRemoveOffline = async (resourceId: string) => {
    await removeOfflineResource(resourceId);
    const refreshed = await getAllOfflineRecords();
    setOfflineRecords(refreshed);
    const quota = await getStorageQuota();
    setStorageUsage(quota);
  };

  const handlePlayVideo = (resource: EducationalResource) => {
    const offlineRec = offlineMap.get(resource.id);
    if (offlineRec?.video_blob) {
      const blobUrl = URL.createObjectURL(offlineRec.video_blob);
      setPlayingVideo({ resource, offlineRecord: offlineRec, blobUrl });
    } else {
      setPlayingVideo({ resource });
    }
  };

  const handlePlayOfflineVideo = (record: OfflineResourceRecord) => {
    if (record.video_blob) {
      const blobUrl = URL.createObjectURL(record.video_blob);
      setPlayingVideo({ offlineRecord: record, blobUrl });
    }
  };

  const handleReadArticle = (resource: EducationalResource) => {
    const offlineRec = offlineMap.get(resource.id);
    setReadingArticle({ resource, offlineRecord: offlineRec });
  };

  const handleReadOfflineArticle = (record: OfflineResourceRecord) => {
    setReadingArticle({ offlineRecord: record });
  };

  const closeVideoPlayer = () => {
    if (playingVideo?.blobUrl) {
      URL.revokeObjectURL(playingVideo.blobUrl);
    }
    setPlayingVideo(null);
  };

  const closeArticleReader = () => {
    setReadingArticle(null);
  };

  const isOffline = isOfflineRoute || activeTab === "offline";
  const pageTitle = isOffline ? "My Offline Library" : "Educational Video Library";
  const pageSubtitle = isOffline
    ? "Access saved video demonstrations and clinical care articles stored locally on this device without internet."
    : "Discover maternal health educational videos and clinical care guides across six regional languages. Save resources to access anytime offline.";

  return (
    <Page
      title={pageTitle}
      subtitle={pageSubtitle}
    >
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blush/80 via-white to-sand/60 p-6 shadow-sm border border-border/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 dark:border-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <BookOpen className="h-3.5 w-3.5" />
                Maternal Health Knowledge Hub
              </span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Wifi className="h-3 w-3" /> Live Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <WifiOff className="h-3 w-3" /> Offline Mode
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-ink dark:text-white sm:text-2xl">
              {pageTitle}
            </h2>
            <p className="text-sm text-muted max-w-2xl leading-relaxed">
              {isOffline
                ? "Every saved video and article on this device is listed below. You can play videos and read guides completely offline."
                : "Explore clinical demonstrations and maternal health articles available in six regional languages. Save resources to your offline library for instant playback and reading anywhere without mobile data."}
            </p>
          </div>

          {/* Quick Storage Status Widget */}
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm border border-border/50 dark:bg-slate-900/90 dark:border-slate-800 min-w-[220px]">
            <div className="flex items-center justify-between text-xs font-medium text-ink dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-primary" /> Offline Storage
              </span>
              <span className="font-semibold text-primary">{formatBytes(storageUsage.usedBytes)}</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sand dark:bg-slate-800">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.max(4, storageUsage.percent)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
              <span>{offlineRecords.length} Saved Items</span>
              <button
                type="button"
                onClick={() => {
                  navigate("/offline-library");
                  setActiveTab("offline");
                }}
                className="font-semibold text-primary hover:underline"
              >
                View Offline Library →
              </button>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/40 pt-4 dark:border-slate-800">
          <Button
            variant={activeTab === "videos" ? "primary" : "secondary"}
            size="sm"
            onClick={() => {
              navigate("/library?tab=videos");
              setActiveTab("videos");
            }}
            className="gap-2"
          >
            <Video className="h-4 w-4" />
            Watch Videos ({loading ? "..." : error ? "-" : filteredVideos.length})
          </Button>
          <Button
            variant={activeTab === "articles" ? "primary" : "secondary"}
            size="sm"
            onClick={() => {
              navigate("/library?tab=articles");
              setActiveTab("articles");
            }}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Read Articles ({loading ? "..." : error ? "-" : filteredArticles.length})
          </Button>
          <Button
            variant={activeTab === "offline" ? "primary" : "secondary"}
            size="sm"
            onClick={() => {
              navigate("/offline-library");
              setActiveTab("offline");
            }}
            className="gap-2 relative"
          >
            <Download className="h-4 w-4" />
            My Offline Library ({offlineRecords.length})
            {offlineRecords.length > 0 && (
              <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                {offlineRecords.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* LANGUAGE SELECTOR BAR */}
      {activeTab !== "offline" && (
        <div className="mt-6 rounded-2xl border border-border/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:bg-slate-900/80 dark:border-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Languages className="h-4 w-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-ink dark:text-white uppercase tracking-wider">
                  Resource Language
                </span>
                <p className="text-[11px] text-muted">
                  Filter verified audio and written health guides by language
                </p>
              </div>
            </div>

            {/* Mobile Select View */}
            <div className="sm:hidden w-full">
              <select
                aria-label="Select Resource Language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:text-white"
              >
                {SUPPORTED_LIBRARY_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} {lang.nativeName !== lang.name ? `(${lang.nativeName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Pill Group */}
            <div className="hidden sm:flex flex-wrap items-center gap-1.5" role="group" aria-label="Language selection">
              {SUPPORTED_LIBRARY_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.code)}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                        : "bg-surface text-ink hover:bg-sand/80 dark:bg-slate-800 dark:text-slate-200 border border-border/40"
                    }`}
                  >
                    <span>{lang.name}</span>
                    {lang.code !== "all" && lang.nativeName !== lang.name && (
                      <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-muted"}`}>
                        ({lang.nativeName})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SEARCH AND OFFLINE FILTER BAR */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab === "offline" ? "offline downloads" : activeTab}...`}
            className="pl-10 text-sm"
          />
        </div>

        {activeTab === "offline" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted">Offline Filter:</span>
            {(["all", "videos", "articles"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setOfflineFilter(mode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                  offlineFilter === mode
                    ? "bg-primary text-white"
                    : "bg-surface text-muted hover:bg-sand/60 dark:bg-slate-800"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ERROR STATE */}
      {error && activeTab === "offline" && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={() => void loadData()}>
            Retry
          </Button>
        </div>
      )}

      {/* CONTENT VIEWS */}
      {loading ? (
        <div className="mt-8">
          <LoadingSkeleton />
        </div>
      ) : error && activeTab !== "offline" ? (
        <div className="mt-8 space-y-4">
          <ErrorState
            title="Unable to Load Educational Library"
            text={error}
          />
          <div className="flex justify-center">
            <Button size="sm" variant="primary" onClick={() => void loadData()}>
              Retry
            </Button>
          </div>
        </div>
      ) : activeTab === "videos" ? (
        /* --- VIDEOS TAB --- */
        <div className="mt-6">
          {filteredVideos.length === 0 ? (
            <EmptyState
              title="No Videos Found"
              text={
                selectedLanguage !== "all"
                  ? `No educational videos matched the selected language (${SUPPORTED_LIBRARY_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage}). Try selecting 'All Languages' or modifying your search.`
                  : "No educational videos matched your current search query."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVideos.map((video) => {
                const isOfflineSaved = offlineMap.has(video.id);
                const activeTask = downloadTasks[video.id];
                const langInfo = getLanguageDisplay(video.language);

                return (
                  <Card
                    key={video.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-white transition-all hover:shadow-md dark:bg-slate-900 dark:border-slate-800"
                  >
                    {/* Video Thumbnail Header */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={video.thumbnail_url || "/nurtureher-logo.png"}
                        alt={video.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Duration & Size Badges */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-semibold text-white">
                        <span className="inline-flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 backdrop-blur-sm">
                          <Clock className="h-3 w-3" />
                          {formatDuration(video.duration_seconds)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 backdrop-blur-sm">
                          {formatBytes(video.file_size_bytes)}
                        </span>
                      </div>

                      {/* Play Overlay Button */}
                      <button
                        type="button"
                        onClick={() => handlePlayVideo(video)}
                        className="absolute inset-0 flex items-center justify-center transition-transform hover:scale-110"
                        title="Watch Video"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-white shadow-lg backdrop-blur-sm">
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </div>
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col p-4">
                      {/* Series, Language, Verification, & Offline Readiness Badges */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {video.series_name && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                              Series: {video.series_name}
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              langInfo.verified
                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 dark:bg-purple-900/30"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-900/30"
                            }`}
                          >
                            <Languages className="h-3 w-3" />
                            {langInfo.label}
                          </span>

                          {!video.is_verified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-300/50">
                              <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              Unverified Content
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Verified
                            </span>
                          )}
                        </div>

                        {isOfflineSaved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Saved Offline
                          </span>
                        ) : activeTask ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            Downloading {activeTask.progress}%
                          </span>
                        ) : downloadErrors[video.id] ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                            <AlertCircle className="h-3 w-3" /> Download Failed
                          </span>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                            <Wifi className="h-3 w-3" /> Available Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-500">
                            Requires Internet
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 text-base font-bold text-ink dark:text-white line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted line-clamp-2 leading-relaxed flex-1">
                        {video.description}
                      </p>

                      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted dark:border-slate-800">
                        <span>{video.author_publisher || "Clinical Advisory"}</span>
                        <span>{video.review_date}</span>
                      </div>

                      {/* Download Progress Bar */}
                      {activeTask && (
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                            <span>Downloading for offline...</span>
                            <span>{activeTask.progress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-sand dark:bg-slate-800">
                            <div
                              className="h-full bg-primary transition-all duration-200"
                              style={{ width: `${activeTask.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Card Action Footer */}
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handlePlayVideo(video)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          {isOfflineSaved ? "Play Offline" : "Watch Online"}
                        </Button>

                        {isOfflineSaved ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-red-500 hover:text-red-600 dark:hover:bg-red-950/30"
                            onClick={() => handleRemoveOffline(video.id)}
                            title="Delete downloaded video from device"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : activeTask ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCancelDownload(video.id)}
                            title="Cancel download"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleDownloadVideo(video)}
                            disabled={!isOnline}
                            title={!isOnline ? "Connect to internet to download" : "Download video for offline viewing"}
                          >
                            <Download className="h-3.5 w-3.5" />
                            {downloadErrors[video.id] ? "Retry Download" : "Download for Offline Use"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "articles" ? (
        /* --- ARTICLES TAB --- */
        <div className="mt-6">
          {filteredArticles.length === 0 ? (
            <EmptyState
              title="No Articles Found"
              text={
                selectedLanguage !== "all"
                  ? `No educational articles matched the selected language (${SUPPORTED_LIBRARY_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage}). Try selecting 'All Languages' or modifying your search.`
                  : "No educational articles matched your current search query."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((article) => {
                const isOfflineSaved = offlineMap.has(article.id);
                const langInfo = getLanguageDisplay(article.language);

                return (
                  <Card
                    key={article.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-white p-5 transition-all hover:shadow-md dark:bg-slate-900 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          langInfo.verified
                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 dark:bg-purple-900/30"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-900/30"
                        }`}
                      >
                        <Languages className="h-3 w-3" />
                        {langInfo.label}
                      </span>

                      {isOfflineSaved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Saved Offline
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                          <Wifi className="h-3 w-3" /> Online
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-base font-bold text-ink dark:text-white line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted line-clamp-3 leading-relaxed flex-1">
                      {article.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted dark:border-slate-800">
                      <span className="truncate max-w-[180px]">{article.author_publisher}</span>
                      <span>{article.review_date}</span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => handleReadArticle(article)}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Read Article
                      </Button>

                      {isOfflineSaved ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleRemoveOffline(article.id)}
                          title="Remove saved article from offline library"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleSaveArticle(article)}
                          title="Save article text and references for offline reading"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Save Offline
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* --- MY OFFLINE LIBRARY TAB --- */
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigate("/library?tab=videos");
                setActiveTab("videos");
              }}
              className="gap-1.5 text-xs font-semibold text-primary"
            >
              ← Back to Educational Video Library
            </Button>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 dark:bg-emerald-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-ink dark:text-white">
                    Offline Resources Ready on This Device
                  </h4>
                  <p className="text-xs text-muted">
                    These downloaded videos and saved articles load directly from local browser storage without requiring an internet connection.
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                {offlineRecords.length} Saved Items · {formatBytes(storageUsage.usedBytes)} Used
              </div>
            </div>
          </div>

          {filteredOffline.length === 0 ? (
            <EmptyState
              title="No Offline Resources Saved"
              text="You haven't saved any videos or articles yet. When you are online, click 'Download' on any video or 'Save Offline' on any article to keep them accessible without internet."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOffline.map((record) => {
                const langInfo = getLanguageDisplay(record.language);

                return (
                  <Card
                    key={record.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary capitalize">
                          {record.content_type === "video" ? <Video className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                          {record.content_type}
                        </span>

                        {record.series_name && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                            {record.series_name}
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            langInfo.verified
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 dark:bg-purple-900/30"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-900/30"
                          }`}
                        >
                          <Languages className="h-3 w-3" />
                          {langInfo.label}
                        </span>

                        {record.is_verified === false && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                            Unverified
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-ink dark:text-white line-clamp-2">
                      {record.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted line-clamp-2 leading-relaxed flex-1">
                      {record.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted dark:border-slate-800">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Saved on Device
                      </span>
                      <span>{formatBytes(record.file_size_bytes)}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {record.content_type === "video" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handlePlayOfflineVideo(record)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Play Offline
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handleReadOfflineArticle(record)}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Read Offline
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleRemoveOffline(record.id)}
                        title="Remove from offline library"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- VIDEO PLAYER MODAL --- */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-border/40 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <PlayCircle className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-ink dark:text-white truncate max-w-sm">
                  {playingVideo.resource?.title || playingVideo.offlineRecord?.title}
                </span>
              </div>
              <button
                type="button"
                onClick={closeVideoPlayer}
                className="rounded-lg p-1.5 text-muted hover:bg-sand/60 hover:text-ink dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video w-full bg-black">
              <video
                controls
                autoPlay
                playsInline
                src={playingVideo.blobUrl || playingVideo.resource?.video_url || ""}
                className="h-full w-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Metadata Footer */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="font-semibold text-primary">
                  Language: {getLanguageDisplay(playingVideo.resource?.language || playingVideo.offlineRecord?.language).label}
                </span>
                {playingVideo.blobUrl ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Playing from Local Offline Storage
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted">
                    <Wifi className="h-3.5 w-3.5" /> Streaming Online
                  </span>
                )}
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {playingVideo.resource?.description || playingVideo.offlineRecord?.description}
              </p>
              <div className="rounded-xl bg-sand/60 p-2.5 text-[11px] text-muted dark:bg-slate-800/60 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Clinical Advisory:</strong> This video provides general educational guidance only. It is not personal medical advice. For active symptoms or obstetric emergencies, contact your healthcare provider or dial 108 immediately.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ARTICLE READER MODAL --- */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-border/40 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 px-6 py-4 dark:border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Language: {getLanguageDisplay(readingArticle.resource?.language || readingArticle.offlineRecord?.language).label}
                </span>
                <h2 className="text-base font-bold text-ink dark:text-white line-clamp-1">
                  {readingArticle.resource?.title || readingArticle.offlineRecord?.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeArticleReader}
                className="rounded-lg p-1.5 text-muted hover:bg-sand/60 hover:text-ink dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Article Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-sand/60 px-3.5 py-2 text-xs text-muted dark:bg-slate-800/60">
                <span>
                  By: <strong>{readingArticle.resource?.author_publisher || readingArticle.offlineRecord?.author_publisher}</strong>
                </span>
                <span>Reviewed: {readingArticle.resource?.review_date || readingArticle.offlineRecord?.review_date}</span>
              </div>

              {/* Render formatted markdown/content */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-ink dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed text-sm">
                {readingArticle.resource?.article_content || readingArticle.offlineRecord?.article_content}
              </div>

              {/* Sources */}
              {((readingArticle.resource?.sources_json || readingArticle.offlineRecord?.sources_json)) && (
                <div className="mt-6 rounded-2xl border border-border/60 bg-sand/40 p-4 text-xs dark:bg-slate-800/40 dark:border-slate-800">
                  <h4 className="font-bold text-ink dark:text-white flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-primary" /> Medical References & Review Standards
                  </h4>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-muted text-[11px]">
                    {(() => {
                      try {
                        const raw = readingArticle.resource?.sources_json || readingArticle.offlineRecord?.sources_json;
                        const parsed = JSON.parse(raw || "[]");
                        return parsed.map((src: string, idx: number) => <li key={idx}>{src}</li>);
                      } catch {
                        return <li>Clinical Practice Standards</li>;
                      }
                    })()}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border/40 px-6 py-3.5 text-xs text-muted dark:border-slate-800 bg-surface dark:bg-slate-900/50">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Medically Reviewed Guide
              </span>
              <Button size="sm" variant="primary" onClick={closeArticleReader}>
                Done Reading
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
