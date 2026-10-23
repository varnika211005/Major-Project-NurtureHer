import { AlertTriangle, Baby, BookOpen, CheckCircle2, Clock, Compass, Download, ExternalLink, HardDrive, Heart, Info, LocateFixed, Lock, MapPin, Navigation, Phone, PhoneCall, Play, PlayCircle, QrCode, RefreshCw, Search, ShieldAlert, Trash2, UserCheck, Video, Wifi, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CareCircleConnect } from "@/components/CareCircleConnect";
import { api, CaregiverContent, ChatMessage, EducationalResource, FacilityItem, OfficialHelpline } from "@/lib/api";
import {
  OfflineResourceRecord,
  downloadVideoForOffline,
  getAllOfflineRecords,
  removeOfflineResource,
  saveArticleForOffline,
} from "@/lib/offlineLibraryStore";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/States";
import { useContext } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LanguageContext, LANGUAGE_STORAGE_KEY } from "@/context/language-context";

const OBSOLETE_VIDEO_URLS = [
  "maternal_warning_signs.mp4",
  "newborn_latch_basics.mp4",
  "prenatal_breathing_exercise.mp4",
  "trimester1_care_guide.mp4",
];

function isObsoleteVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return OBSOLETE_VIDEO_URLS.some((obs) => url.includes(obs));
}

function useCurrentLanguageSafe(): string {
  const context = useContext(LanguageContext);
  if (context?.language) return context.language;
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) || localStorage.getItem("app_language");
    if (saved) return saved;
  }
  return "en";
}

type CaregiverConnection = {
  access_id: string;
  mother_id: string;
  mother_name: string;
  relationship_label: string;
  permissions: Record<string, boolean>;
};

export function CaregiverPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const language = useCurrentLanguageSafe();
  const [items, setItems] = useState<CaregiverContent[]>([]);
  const [availableVideos, setAvailableVideos] = useState<EducationalResource[]>([]);
  const [educationalVideo, setEducationalVideo] = useState<EducationalResource | null>(null);
  const [educationalArticle, setEducationalArticle] = useState<EducationalResource | null>(null);
  const [offlineRecords, setOfflineRecords] = useState<OfflineResourceRecord[]>([]);
  const [downloadTasks, setDownloadTasks] = useState<Record<string, { progress: number; controller: AbortController }>>({});
  const [playingVideo, setPlayingVideo] = useState<{
    resource?: EducationalResource;
    offlineRecord?: OfflineResourceRecord;
    blobUrl?: string;
  } | null>(null);
  const [readingArticle, setReadingArticle] = useState<{
    resource?: EducationalResource;
    offlineRecord?: OfflineResourceRecord;
  } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  const [connections, setConnections] = useState<CaregiverConnection[]>([]);
  const [sharedSummary, setSharedSummary] = useState<Record<string, unknown> | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[] | null>(null);
  const [chatHistoryDenied, setChatHistoryDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<"education" | "warning-signs" | "support-checklist" | "shared-status" | "connect" | "herreach">(
    searchParams.get("tab") === "connect" ? "connect" : "education",
  );
  const [loading, setLoading] = useState(true);

  const offlineMap = new Map<string, OfflineResourceRecord>(offlineRecords.map((r) => [r.id, r]));

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

  useEffect(() => {
    if (searchParams.get("tab") === "connect") setActiveTab("connect");
  }, [searchParams]);

  // Daily support checklist state
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({
    task1: true,
    task2: false,
    task3: false,
    task4: false,
    task5: false,
  });

  useEffect(() => {
    async function loadCaregiverData() {
      setLoading(true);
      try {
        const [educationalResources, conns, offlineRecs] = await Promise.all([
          api.educationResources().catch(() => [] as EducationalResource[]),
          api.careCircleConnections().catch(() => []),
          getAllOfflineRecords().catch(() => [] as OfflineResourceRecord[]),
        ]);
        setOfflineRecords(offlineRecs);
        setConnections(conns);

        const publishedVideos = educationalResources.filter(
          (r) => r.content_type === "video" && r.is_published,
        );
        const publishedArticles = educationalResources.filter(
          (r) => r.content_type === "article" && r.is_published,
        );
        setAvailableVideos(publishedVideos);

        // Card A: Caregiver Educational Video
        // Default English preference resolves strictly to NurtureHer-English.mp4
        // Regional languages resolve to the corresponding intended multilingual video
        const activeLang = (language || "en").toLowerCase();
        let video =
          publishedVideos.find((v) => v.language && v.language.toLowerCase() === activeLang) ||
          publishedVideos.find((v) => v.video_url?.includes("NurtureHer-English.mp4")) ||
          publishedVideos.find((v) => v.language && v.language.toLowerCase() === "en") ||
          publishedVideos[0] ||
          null;

        // Card B: Caregiver Educational Article
        // Prioritize Postpartum recovery, Newborn care, or Emergency warning signs
        let article =
          publishedArticles.find(
            (a) =>
              a.category.toLowerCase().includes("postpartum") ||
              a.category.toLowerCase().includes("newborn") ||
              a.category.toLowerCase().includes("warning"),
          ) ||
          publishedArticles[0] ||
          null;

        // Offline fallback if network is unavailable
        if (!video && offlineRecs.length > 0) {
          const offlineVid = offlineRecs.find(
            (r) => r.content_type === "video" && !isObsoleteVideoUrl(r.video_url),
          );
          if (offlineVid) video = offlineVid as unknown as EducationalResource;
        }
        if (!article && offlineRecs.length > 0) {
          const offlineArt = offlineRecs.find((r) => r.content_type === "article");
          if (offlineArt) article = offlineArt as unknown as EducationalResource;
        }

        setEducationalVideo(video);
        setEducationalArticle(article);

        if (conns.length > 0) {
          setSelectedConnection(conns[0].access_id);
          const summary = await api.careCircleSharedSummary(conns[0].access_id).catch(() => null);
          setSharedSummary(summary);
          await loadSharedChatHistory(conns[0].access_id);
        }
      } finally {
        setLoading(false);
      }
    }
    void loadCaregiverData();
  }, []);

  // Update educational video dynamically when application language preference changes
  useEffect(() => {
    if (availableVideos.length === 0) return;
    const activeLang = (language || "en").toLowerCase();
    const matched =
      availableVideos.find((v) => v.language && v.language.toLowerCase() === activeLang) ||
      availableVideos.find((v) => v.video_url?.includes("NurtureHer-English.mp4")) ||
      availableVideos.find((v) => v.language && v.language.toLowerCase() === "en") ||
      availableVideos[0];
    if (matched) {
      setEducationalVideo(matched);
    }
  }, [language, availableVideos]);

  const handleDownloadVideo = async (resource: EducationalResource) => {
    const controller = new AbortController();
    setDownloadTasks((prev) => ({
      ...prev,
      [resource.id]: { progress: 0, controller },
    }));

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
    } catch {
      // Abort or error handled in store
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
    } catch {
      // Storage error
    }
  };

  const handleRemoveOffline = async (resourceId: string) => {
    await removeOfflineResource(resourceId);
    const refreshed = await getAllOfflineRecords();
    setOfflineRecords(refreshed);
  };

  const handlePlayVideo = (resource: EducationalResource) => {
    const offlineRec = offlineMap.get(resource.id);
    if (offlineRec?.video_blob && !isObsoleteVideoUrl(offlineRec.video_url)) {
      const blobUrl = URL.createObjectURL(offlineRec.video_blob);
      setPlayingVideo({ resource, offlineRecord: offlineRec, blobUrl });
    } else {
      setPlayingVideo({ resource });
    }
  };

  const closeVideoPlayer = () => {
    if (playingVideo?.blobUrl) {
      URL.revokeObjectURL(playingVideo.blobUrl);
    }
    setPlayingVideo(null);
  };

  const handleReadArticle = (resource: EducationalResource) => {
    const offlineRec = offlineMap.get(resource.id);
    setReadingArticle({ resource, offlineRecord: offlineRec });
  };

  const closeArticleReader = () => {
    setReadingArticle(null);
  };

  async function loadSharedChatHistory(accessId: string) {
    setChatHistory(null);
    setChatHistoryDenied(false);
    try {
      const history = await api.careCircleChatHistory(accessId);
      setChatHistory(history);
    } catch {
      // Missing consent yields 403: show the consent notice instead of history.
      setChatHistoryDenied(true);
    }
  }

  async function handleSelectConnection(accessId: string) {
    setSelectedConnection(accessId);
    try {
      const summary = await api.careCircleSharedSummary(accessId);
      setSharedSummary(summary);
    } catch {
      setSharedSummary(null);
    }
    await loadSharedChatHistory(accessId);
  }

  async function handleConnectionApproved(accessId: string) {
    const refreshedConnections = await api.careCircleConnections();
    setConnections(refreshedConnections);
    const connection = refreshedConnections.find((item) => item.access_id === accessId);
    if (!connection) return;
    setSelectedConnection(accessId);
    setSharedSummary(await api.careCircleSharedSummary(accessId));
    await loadSharedChatHistory(accessId);
  }

  const activeConnection = connections.find((connection) => connection.access_id === selectedConnection);

  const toggleTask = (taskId: string) => {
    setCheckedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const WARNING_SIGNS = [
    {
      level: "EMERGENCY — IMMEDIATE CARE (CALL 112)",
      color: "border-rose-300 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200",
      signs: [
        "Heavy vaginal bleeding soaking more than 1 sanitary pad per hour",
        "Severe, persistent headache with blurred vision or seeing spots (Preeclampsia sign)",
        "Sudden chest pain, difficulty breathing, or coughing up blood",
        "Severe abdominal pain that does not subside",
        "Expressed thoughts of harming oneself or the baby",
      ],
    },
    {
      level: "CLINICAL FOLLOW-UP WITHIN 24 HOURS",
      color: "border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200",
      signs: [
        "High fever (above 100.4°F / 38°C) or foul-smelling lochia discharge",
        "Red, painful, swollen, or hot area on the breast (Mastitis sign)",
        "Redness, swelling, or warm tender calves in legs (DVT sign)",
        "Persistent feelings of detachment, severe anxiety, or inability to sleep even when baby sleeps",
      ],
    },
  ];

  const SUPPORT_CHECKLIST = [
    { id: "task1", label: "Ensure she drinks at least 8 glasses of clean water today", category: "Hydration" },
    { id: "task2", label: "Take over baby soothing so she gets 2-3 hours of uninterrupted sleep", category: "Rest & Sleep" },
    { id: "task3", label: "Provide warm, nutritious iron-rich meals without asking her to cook", category: "Nutrition" },
    { id: "task4", label: "Gently ask how she feels emotionally and listen without giving unsolicited advice", category: "Emotional Care" },
    { id: "task5", label: "Check on diaper, laundry, and household chores before she needs to request them", category: "Household Support" },
  ];

  const COMMUNICATION_TIPS = [
    { doText: "Ask: 'I am here with you. What is one small thing I can take off your shoulders right now?'", dontText: "Don't say: 'You should be happy now that the baby is here.'" },
    { doText: "Validate: 'It is completely normal to feel exhausted and overwhelmed. You are doing a wonderful job.'", dontText: "Don't say: 'Other mothers manage fine without complaining.'" },
    { doText: "Action: 'I will watch the baby while you take a warm bath or rest quietly.'", dontText: "Don't say: 'Just tell me if you need help with anything.'" },
  ];

  return (
    <Page
      title="Caregiver Companion"
      subtitle="Empowering husbands and family caregivers with education, warning signs, and support guides"
    >
      {/* Navigation tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-lavender-200 pb-3 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab("education")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "education"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <Baby className="h-4 w-4" /> Caregiver Guides & Videos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("warning-signs")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "warning-signs"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-rose-500" /> Postpartum Warning Signs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("support-checklist")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "support-checklist"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Daily Support Checklist
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("shared-status")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "shared-status"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <UserCheck className="h-4 w-4 text-primary" /> Mother's Permitted Status ({connections.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("connect")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "connect"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <QrCode className="h-4 w-4 text-primary" /> Connect to Mother
        </button>
        <button
          id="caregiver-herreach-tab"
          type="button"
          onClick={() => setActiveTab("herreach")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "herreach"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <Compass className="h-4 w-4 text-primary" /> HerReach Facility Finder
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* TAB 1: CAREGIVER EDUCATION */}
          {activeTab === "education" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-lavender-200/80 bg-lavender-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  <h3 className="font-black text-ink dark:text-white">The Partner & Family Caregiver Role</h3>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Maternal recovery requires an active care team. Studies confirm that proactive caregiver support dramatically reduces postpartum depression severity and promotes maternal healing.
                </p>
              </div>

              {/* Communication Do's and Don'ts */}
              <Card>
                <SectionHeader
                  title="Supportive Communication Guide"
                  subtitle="Phrases that reassure vs phrases that unintentionally increase emotional distress"
                />
                <div className="grid gap-4 md:grid-cols-3">
                  {COMMUNICATION_TIPS.map((tip, idx) => (
                    <div key={idx} className="rounded-2xl border border-lavender-200/80 p-4 dark:border-white/10">
                      <div className="rounded-xl bg-emerald-50 p-3 text-xs dark:bg-emerald-950/20">
                        <p className="font-black text-emerald-800 dark:text-emerald-200">✅ WHAT TO SAY</p>
                        <p className="mt-1 font-semibold text-emerald-900 dark:text-emerald-100">{tip.doText}</p>
                      </div>
                      <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs dark:bg-rose-950/20">
                        <p className="font-black text-rose-800 dark:text-rose-200">❌ WHAT TO AVOID</p>
                        <p className="mt-1 font-semibold text-rose-900 dark:text-rose-100">{tip.dontText}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Educational Resource Header & Explore All Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div>
                  <h3 className="text-lg font-black text-ink dark:text-white flex items-center gap-2">
                    <Baby className="h-5 w-5 text-primary" />
                    Caregiver Guides & Educational Resources
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    Clinically verified video demonstrations and postpartum care articles with offline access for partners and caregivers.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs font-bold"
                    onClick={() => navigate("/offline-library")}
                    title="View all saved resources in My Offline Library"
                  >
                    <HardDrive className="h-3.5 w-3.5 text-primary" />
                    My Offline Library
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-1.5 text-xs font-bold"
                    onClick={() => navigate("/library")}
                    title="Browse complete catalog of maternal videos and articles"
                  >
                    Explore All Educational Resources →
                  </Button>
                </div>
              </div>

              {/* Exactly Two Educational Cards: Card A (Video) & Card B (Article) */}
              {!educationalVideo && !educationalArticle ? (
                <EmptyState
                  title="No Educational Resources Available"
                  text="No published educational guides or videos were found at this time."
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* CARD A — EDUCATIONAL VIDEO */}
                  {educationalVideo && (() => {
                    const isOfflineSaved = offlineMap.has(educationalVideo.id);
                    const activeTask = downloadTasks[educationalVideo.id];

                    return (
                      <Card className="group relative flex flex-col overflow-hidden rounded-2xl border border-lavender-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/5">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                            <Video className="h-3.5 w-3.5" />
                            {educationalVideo.category}
                          </span>
                          {isOfflineSaved ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Stored Locally
                            </span>
                          ) : activeTask ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                              Downloading {activeTask.progress}%
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

                        {/* Title & Description */}
                        <h4 className="mt-3 text-base font-black text-ink dark:text-white line-clamp-2">
                          {educationalVideo.title}
                        </h4>
                        <p className="mt-2 text-xs leading-5 text-muted dark:text-white/60 line-clamp-3 flex-1">
                          {educationalVideo.description}
                        </p>

                        {/* Metadata row: duration, file size, publisher */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-lavender-100 pt-3 text-[11px] text-muted dark:border-white/10">
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            {educationalVideo.author_publisher || "Clinical Advisory"}
                          </span>
                          <div className="flex items-center gap-3">
                            {educationalVideo.duration_seconds && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(educationalVideo.duration_seconds)}
                              </span>
                            )}
                            {educationalVideo.file_size_bytes && (
                              <span className="flex items-center gap-1">
                                <HardDrive className="h-3 w-3" />
                                {formatBytes(educationalVideo.file_size_bytes)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Download Progress Bar */}
                        {activeTask && (
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-[11px] text-muted">
                              <span>Downloading permitted video file...</span>
                              <span className="font-semibold text-primary">{activeTask.progress}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-lavender-100 dark:bg-white/10">
                              <div
                                className="h-full bg-primary transition-all duration-200"
                                style={{ width: `${activeTask.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Card Action Buttons */}
                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => handlePlayVideo(educationalVideo)}
                          >
                            <Play className="h-3.5 w-3.5" />
                            {isOfflineSaved ? "Play Offline" : "Watch Online"}
                          </Button>

                          {isOfflineSaved ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-rose-500 hover:text-rose-600 dark:hover:bg-rose-950/30"
                              onClick={() => handleRemoveOffline(educationalVideo.id)}
                              title="Delete downloaded video from device"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : activeTask ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCancelDownload(educationalVideo.id)}
                              title="Cancel download"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => handleDownloadVideo(educationalVideo)}
                              disabled={!isOnline}
                              title={!isOnline ? "Connect to internet to download" : "Download video for offline viewing"}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })()}

                  {/* CARD B — EDUCATIONAL ARTICLE */}
                  {educationalArticle && (() => {
                    const isOfflineSaved = offlineMap.has(educationalArticle.id);

                    return (
                      <Card className="group relative flex flex-col overflow-hidden rounded-2xl border border-lavender-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/5">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                            <BookOpen className="h-3.5 w-3.5" />
                            {educationalArticle.category}
                          </span>
                          {isOfflineSaved ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Saved Offline
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

                        {/* Title & Description */}
                        <h4 className="mt-3 text-base font-black text-ink dark:text-white line-clamp-2">
                          {educationalArticle.title}
                        </h4>
                        <p className="mt-2 text-xs leading-5 text-muted dark:text-white/60 line-clamp-3 flex-1">
                          {educationalArticle.description}
                        </p>

                        {/* Metadata row: publisher, review date */}
                        <div className="mt-4 flex items-center justify-between border-t border-lavender-100 pt-3 text-[11px] text-muted dark:border-white/10">
                          <span className="truncate max-w-[180px]">
                            {educationalArticle.author_publisher || "Medical Advisory"}
                          </span>
                          <span>{educationalArticle.review_date || "Current Guidance"}</span>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => handleReadArticle(educationalArticle)}
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            Read Article
                          </Button>

                          {isOfflineSaved ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-rose-500 hover:text-rose-600"
                              onClick={() => handleRemoveOffline(educationalArticle.id)}
                              title="Remove saved article from offline storage"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => handleSaveArticle(educationalArticle)}
                              title="Save article for offline reading"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Save Offline
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: POSTPARTUM WARNING SIGNS */}
          {activeTab === "warning-signs" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-black text-sm">Postpartum Clinical Warning Signs (Red Flags)</h3>
                </div>
                <p className="mt-1 text-xs text-rose-900/80 dark:text-rose-200/80">
                  As a family caregiver, you are often the first to notice maternal warning signs. Never hesitate to call emergency services or take the mother to the nearest hospital if any red flags appear.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {WARNING_SIGNS.map((group, idx) => (
                  <div key={idx} className={`rounded-3xl border p-6 ${group.color}`}>
                    <h3 className="text-xs font-black tracking-wider uppercase">{group.level}</h3>
                    <ul className="mt-4 space-y-3">
                      {group.signs.map((sign, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs font-bold leading-5">
                          <span className="shrink-0 mt-0.5 font-black">•</span>
                          <span>{sign}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-r from-rose-50 to-white dark:from-white/10 dark:to-white/5 border border-rose-100">
                <div>
                  <h4 className="font-black text-ink dark:text-white">Immediate Medical Escalation</h4>
                  <p className="text-xs text-muted">Direct national medical emergency dispatch</p>
                </div>
                <a
                  href="tel:112"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-danger px-6 py-3 text-sm font-black text-white shadow-emergency transition hover:bg-rose-700"
                >
                  <PhoneCall className="h-4 w-4" /> Call 112 Ambulance
                </a>
              </Card>
            </div>
          )}

          {/* TAB 3: DAILY SUPPORT CHECKLIST */}
          {activeTab === "support-checklist" && (
            <Card className="max-w-2xl mx-auto p-7">
              <SectionHeader
                title="Daily Caregiver Support Checklist"
                subtitle="Track your daily contributions to mother and newborn care"
              />

              <div className="space-y-3">
                {SUPPORT_CHECKLIST.map((task) => {
                  const isChecked = Boolean(checkedTasks[task.id]);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                        isChecked
                          ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-100"
                          : "border-lavender-200 bg-white text-ink hover:bg-lavender-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      }`}
                    >
                      <div>
                        <Badge className="mb-1">{task.category}</Badge>
                        <p className={`text-sm font-bold ${isChecked ? "line-through opacity-80" : ""}`}>
                          {task.label}
                        </p>
                      </div>
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border ${
                          isChecked
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-lavender-300 bg-white dark:border-white/20 dark:bg-white/10"
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* TAB 4: MOTHER'S PERMITTED STATUS */}
          {activeTab === "shared-status" && (
            <div className="space-y-6">
              {connections.length === 0 ? (
                <Card className="text-center p-8">
                  <Lock className="mx-auto h-12 w-12 text-primary" />
                  <h3 className="mt-3 text-lg font-black text-ink dark:text-white">No Active CareCircle Connections</h3>
                  <p className="mt-1 text-xs text-muted max-w-md mx-auto">
                    Ask the mother to display her CareCircle QR code. Scan or enter her token to request access. Once she explicitly approves your request, her permitted health overview will appear here.
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Connection Selector */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-muted">Connected Mothers:</span>
                    {connections.map((c) => (
                      <button
                        key={c.access_id}
                        type="button"
                        onClick={() => void handleSelectConnection(c.access_id)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          selectedConnection === c.access_id
                            ? "bg-primary text-white shadow-glow"
                            : "bg-lavender-100 text-ink dark:bg-white/10 dark:text-white"
                        }`}
                      >
                        {c.mother_name} ({c.relationship_label})
                      </button>
                    ))}
                  </div>

                  {/* Summary Card */}
                  {sharedSummary ? (
                    <div className="space-y-5">
                      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-lavender-50 to-white dark:from-white/10 dark:to-white/5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-primary">CareCircle connection</p>
                            <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">
                              {String(sharedSummary.mother_name ?? activeConnection?.mother_name ?? "Mother")}
                            </h2>
                            <p className="mt-1 text-sm text-muted dark:text-white/60">
                              {activeConnection?.relationship_label ?? String(sharedSummary.relationship_label ?? "Caregiver")}
                            </p>
                          </div>
                          <Badge className="w-fit bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                            Approved by mother
                          </Badge>
                        </div>
                        <div className="mt-5 border-t border-lavender-200 pt-4 dark:border-white/10">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted dark:text-white/60">Permitted sharing</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {[
                              ["emergency", "Emergency details"],
                              ["risk_category", "Screening categories"],
                              ["wellness_summary", "Wellness summary"],
                            ].map(([key, label]) => {
                              const permitted = Boolean(activeConnection?.permissions[key]);
                              return (
                                <span
                                  key={key}
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${permitted ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-lavender-100 text-muted dark:bg-white/10 dark:text-white/60"}`}
                                >
                                  {label}: {permitted ? "Shared" : "Not shared"}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </Card>

                      <div className="grid gap-4 lg:grid-cols-3">
                        {Boolean(sharedSummary.emergency) && (
                          <Card className="h-full border-rose-200/80 dark:border-rose-900/30">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="h-4 w-4 text-rose-600" />
                              <h3 className="text-sm font-black text-ink dark:text-white">Emergency information</h3>
                            </div>
                            <div className="mt-4 space-y-3">
                              <div>
                                <p className="text-xs font-bold text-muted">Emergency contact</p>
                                <p className="mt-0.5 break-words text-sm font-bold text-ink dark:text-white">
                                  {String((sharedSummary.emergency as Record<string, string>).emergency_contact ?? "Not configured")}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-muted">Blood group</p>
                                <p className="mt-0.5 text-sm font-bold text-ink dark:text-white">
                                  {String((sharedSummary.emergency as Record<string, string>).blood_group ?? "Not recorded")}
                                </p>
                              </div>
                              <a href="tel:112" className="inline-flex items-center gap-1 text-xs font-black text-rose-700 hover:underline dark:text-rose-300">
                                Emergency services: 112
                              </a>
                            </div>
                          </Card>
                        )}

                        {Boolean(sharedSummary.screenings) && (
                          <Card className="h-full">
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="h-4 w-4 text-primary" />
                              <h3 className="text-sm font-black text-ink dark:text-white">Clinical screening categories</h3>
                            </div>
                            <div className="mt-4 space-y-3">
                              {[
                                ["PCOS", (sharedSummary.screenings as Record<string, string>).pcos_risk],
                                ["Postpartum wellbeing", (sharedSummary.screenings as Record<string, string>).ppd_risk],
                              ].map(([label, value]) => (
                                <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-lavender-50 px-3 py-2 dark:bg-white/5">
                                  <span className="text-xs font-bold text-muted">{label}</span>
                                  <span className="text-sm font-black capitalize text-ink dark:text-white">{String(value ?? "Not shared")}</span>
                                </div>
                              ))}
                              <p className="text-[11px] leading-4 text-muted dark:text-white/50">
                                Risk categories are screening information, not a diagnosis.
                              </p>
                            </div>
                          </Card>
                        )}

                        {Boolean(sharedSummary.wellness) && (
                          <Card className="h-full">
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-rose-500" />
                              <h3 className="text-sm font-black text-ink dark:text-white">Wellness and energy</h3>
                            </div>
                            <div className="mt-4 space-y-3">
                              <div>
                                <p className="text-xs font-bold text-muted">Most recent mood</p>
                                <p className="mt-0.5 text-sm font-black capitalize text-ink dark:text-white">
                                  {String((sharedSummary.wellness as Record<string, string>).today_mood ?? "Not logged")}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-muted">Recent indicators</p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {[
                                    ["recent_fatigue", "Fatigue"],
                                    ["recent_sleep_issue", "Sleep difficulty"],
                                    ["recent_anxiety", "Anxiety"],
                                  ].map(([key, label]) => (
                                    <Badge key={key} className={(sharedSummary.wellness as Record<string, boolean>)[key] ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" : ""}>
                                      {label}: {(sharedSummary.wellness as Record<string, boolean>)[key] ? "Reported" : "Not reported"}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Card>
                        )}
                      </div>

                      {Boolean(sharedSummary.wellness) && (
                        <Card className="border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/10">
                          <div className="flex items-start gap-3">
                            <Heart className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                            <div>
                              <h3 className="text-sm font-black text-ink dark:text-white">Everyday support</h3>
                              <p className="mt-1 text-xs leading-5 text-muted dark:text-white/60">
                                Check in gently, offer practical help with meals or baby care, and make space for rest. For urgent concerns or worsening symptoms, contact a qualified healthcare professional.
                              </p>
                            </div>
                          </div>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <LoadingSkeleton />
                  )}

                  {/* Shared Conversation History (consent-gated) */}
                  <Card>
                    <SectionHeader
                      title="Shared Conversation History"
                      subtitle="Visible only when the mother explicitly consents to chat sharing"
                    />
                    {chatHistoryDenied ? (
                      <p className="text-xs text-muted">
                        Conversation history is not shared for this connection. The mother can enable it from her CareCircle QR page.
                      </p>
                    ) : chatHistory === null ? (
                      <LoadingSkeleton />
                    ) : chatHistory.length === 0 ? (
                      <p className="text-xs text-muted">No shared conversations yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {chatHistory.slice(0, 10).map((chat) => (
                          <div key={chat.id} className="rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 text-xs dark:border-white/10 dark:bg-white/5">
                            <p className="font-bold text-ink dark:text-white">Mother: {chat.message}</p>
                            <p className="mt-1 text-muted">{chat.response}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === "connect" && <CareCircleConnect onApproved={handleConnectionApproved} />}

          {/* TAB 5: HERREACH SIMPLE HEALTHCARE FACILITY SEARCH */}
          {activeTab === "herreach" && <CaregiverHerReachView />}
        </>
      )}
      {/* VIDEO PLAYER MODAL */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-border/40 dark:border-slate-800">
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
                className="rounded-lg p-1.5 text-muted hover:bg-lavender-50 hover:text-ink dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary">
                  {playingVideo.resource?.category || playingVideo.offlineRecord?.category}
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
              <div className="rounded-xl bg-lavender-50/60 p-2.5 text-[11px] text-muted dark:bg-white/5 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Caregiver Clinical Advisory:</strong> This video provides supportive guidance for maternal healing and newborn care. For active danger signs or emergencies, immediately call emergency medical services (112 / 108).
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARTICLE READER MODAL */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-border/40 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-border/40 px-6 py-4 dark:border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {readingArticle.resource?.category || readingArticle.offlineRecord?.category}
                </span>
                <h2 className="text-base font-bold text-ink dark:text-white line-clamp-1">
                  {readingArticle.resource?.title || readingArticle.offlineRecord?.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeArticleReader}
                className="rounded-lg p-1.5 text-muted hover:bg-lavender-50 hover:text-ink dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-lavender-50/70 px-3.5 py-2 text-xs text-muted dark:bg-white/5">
                <span>
                  By: <strong>{readingArticle.resource?.author_publisher || readingArticle.offlineRecord?.author_publisher}</strong>
                </span>
                <span>Reviewed: {readingArticle.resource?.review_date || readingArticle.offlineRecord?.review_date}</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-ink dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed text-sm">
                {readingArticle.resource?.article_content || readingArticle.offlineRecord?.article_content}
              </div>
              {((readingArticle.resource?.sources_json || readingArticle.offlineRecord?.sources_json)) && (
                <div className="mt-6 rounded-2xl border border-lavender-200/80 bg-lavender-50/50 p-4 text-xs dark:bg-white/5 dark:border-white/10">
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
            <div className="flex items-center justify-between border-t border-border/40 px-6 py-3.5 text-xs text-muted dark:border-slate-800 bg-surface dark:bg-slate-900/50">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Medically Reviewed Caregiver Guide
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

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const CAREGIVER_FACILITY_CATEGORIES = [
  { key: "hospital", label: "Hospitals" },
  { key: "pharmacy", label: "Pharmacies / Medical Stores" },
  { key: "clinic", label: "Clinics" },
  { key: "maternity", label: "Maternity Centres" },
  { key: "gynaecology", label: "Gynaecology Services" },
  { key: "mental_health", label: "Mental Health Services" },
  { key: "diagnostic_lab", label: "Diagnostic Laboratories" },
  { key: "emergency", label: "Emergency Facilities" },
];

function CaregiverHerReachView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("hospital");
  const [manualArea, setManualArea] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationError, setLocationError] = useState("");

  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [helplines, setHelplines] = useState<OfficialHelpline[]>([]);
  const [isLiveProvider, setIsLiveProvider] = useState(false);
  const [providerStatus, setProviderStatus] = useState("");
  const [externalSearchUrl, setExternalSearchUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSearch = async (overrideCat?: string) => {
    setLoading(true);
    setErrorMsg("");
    const cat = overrideCat || selectedCategory;

    try {
      const res = await api.herreachFacilities({
        query: searchQuery.trim() || undefined,
        category: cat,
        lat: userCoords?.lat,
        lng: userCoords?.lng,
        area: manualArea.trim() || undefined,
      });

      setFacilities(res.facilities || []);
      setHelplines(res.official_helplines || []);
      setIsLiveProvider(res.is_live_provider);
      setProviderStatus(res.provider_status);
      setExternalSearchUrl(res.external_search_url);
      setHasSearched(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Please enter area manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLabel(`Current Location (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`);
        setManualArea("");
      },
      (err) => {
        setLocationError(err.code === err.PERMISSION_DENIED ? "Location access denied. Please enter an area or PIN code." : "Could not determine location.");
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-lavender-100 bg-white/90 p-5 shadow-soft dark:border-white/10 dark:bg-card">
        <SectionHeader
          title="HerReach Facility Finder"
          subtitle="Locate nearby hospitals, medical stores, diagnostic centres, and emergency facilities"
        />

        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="caregiver-search-facility-input"
                type="text"
                placeholder="Search facility name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearch();
                }}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="caregiver-search-area-input"
                type="text"
                placeholder="Area, city, or PIN code (e.g. 560038)"
                value={manualArea}
                onChange={(e) => {
                  setManualArea(e.target.value);
                  setUserCoords(null);
                  setLocationLabel("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearch();
                }}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                id="caregiver-locate-btn"
                type="button"
                variant="secondary"
                className="gap-1.5"
                onClick={handleGetLocation}
              >
                <LocateFixed className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Near Me</span>
              </Button>
              <Button
                id="caregiver-search-submit-btn"
                type="button"
                className="gap-1.5 shadow-soft"
                onClick={() => void handleSearch()}
                disabled={loading}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>Search</span>
              </Button>
            </div>
          </div>

          {locationLabel && (
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <MapPin className="h-3.5 w-3.5" />
              <span>Using: {locationLabel}</span>
              <button
                type="button"
                onClick={() => {
                  setUserCoords(null);
                  setLocationLabel("");
                }}
                className="ml-1 text-muted hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {locationError && <p className="text-xs text-rose-600">{locationError}</p>}

          {/* Searchable categories */}
          <div className="flex flex-wrap gap-2 pt-1">
            {CAREGIVER_FACILITY_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    void handleSearch(cat.key);
                  }}
                  className={`rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-primary text-white shadow-soft"
                      : "border border-lavender-200 bg-white text-ink hover:bg-lavender-50 dark:border-white/10 dark:bg-card dark:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Fallback notice if provider is unconfigured */}
      {!isLiveProvider && hasSearched && (
        <Card className="border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
              <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                Live Maps Provider Status
              </p>
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                {providerStatus || "Live Google Places API is unconfigured. Direct Google Maps navigation links and verified public emergency helplines are available below."}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-card dark:text-amber-100"
                onClick={() => {
                  if (externalSearchUrl) window.open(externalSearchUrl, "_blank", "noopener,noreferrer");
                }}
              >
                <Navigation className="h-3.5 w-3.5 text-primary" />
                <span>Search "{selectedCategory}" on Google Maps</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Facility Results */}
      {loading ? (
        <LoadingSkeleton />
      ) : errorMsg ? (
        <ErrorState title="Healthcare search error" text={errorMsg} />
      ) : facilities.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => (
            <Card
              key={facility.id}
              className="flex flex-col justify-between border-lavender-100 p-5 transition hover:shadow-card dark:border-white/10 dark:bg-card"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant={facility.is_emergency ? "secondary" : "default"} className="text-[10px]">
                    {facility.facility_type}
                  </Badge>
                  {facility.distance_km !== null && facility.distance_km !== undefined && (
                    <span className="rounded-xl bg-lavender-100 px-2 py-0.5 text-[10px] font-black text-primary dark:bg-white/10 dark:text-white">
                      {facility.distance_km} km away
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-black text-ink dark:text-white">{facility.name}</h3>

                <p className="flex items-start gap-1.5 text-xs text-muted dark:text-white/60">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                  <span>{facility.address}</span>
                </p>

                {facility.opening_hours && (
                  <p className="text-[11px] font-bold text-mint">● {facility.opening_hours}</p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-lavender-100 pt-3 dark:border-white/10">
                {facility.contact_number && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                    onClick={() => window.open(`tel:${facility.contact_number}`)}
                  >
                    <Phone className="h-3 w-3 text-mint" />
                    <span>Call</span>
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 gap-1 text-xs"
                  onClick={() => window.open(facility.directions_url, "_blank", "noopener,noreferrer")}
                >
                  <Navigation className="h-3 w-3" />
                  <span>Directions</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : isLiveProvider ? (
        <EmptyState
          title="No facilities found"
          text="Try selecting a different healthcare category or entering a broader area."
        />
      ) : null}

      {/* Verified 24/7 Helplines */}
      {helplines.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            title="Verified 24/7 National Emergency & Health Helplines"
            subtitle="Immediate phone support accessible at all times"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {helplines.map((helpline, idx) => (
              <Card
                key={idx}
                className="border-lavender-100 bg-white/80 p-4 transition hover:shadow-soft dark:border-white/10 dark:bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-black text-ink dark:text-white">{helpline.title}</p>
                  <span className="font-mono text-sm font-black text-primary">{helpline.number}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted dark:text-white/60">{helpline.description}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full gap-2 text-xs"
                  onClick={() => window.open(`tel:${helpline.number}`)}
                >
                  <Phone className="h-3 w-3 text-primary" />
                  <span>Call {helpline.number}</span>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
