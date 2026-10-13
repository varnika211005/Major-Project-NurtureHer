import { AlertTriangle, Baby, CheckCircle2, Compass, ExternalLink, Heart, HelpCircle, LifeBuoy, LocateFixed, Lock, MapPin, Navigation, Phone, PhoneCall, RefreshCw, Search, ShieldAlert, Sparkles, UserCheck, Video, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, CaregiverContent, FacilityItem, OfficialHelpline } from "@/lib/api";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/useLanguage";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CaregiverPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<CaregiverContent[]>([]);
  const [connections, setConnections] = useState<Array<{ access_id: string; mother_name: string; relationship_label: string; permissions: Record<string, boolean> }>>([]);
  const [sharedSummary, setSharedSummary] = useState<Record<string, unknown> | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"education" | "warning-signs" | "support-checklist" | "shared-status" | "herreach">("education");
  const [loading, setLoading] = useState(true);

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
        const [videoGroup, tipGroup, articleGroup, conns] = await Promise.all([
          api.caregiver("videos").catch(() => []),
          api.caregiver("tips").catch(() => []),
          api.caregiver("articles").catch(() => []),
          api.careCircleConnections().catch(() => []),
        ]);
        setItems([...videoGroup, ...tipGroup, ...articleGroup]);
        setConnections(conns);
        if (conns.length > 0) {
          setSelectedConnection(conns[0].access_id);
          const summary = await api.careCircleSharedSummary(conns[0].access_id).catch(() => null);
          setSharedSummary(summary);
        }
      } finally {
        setLoading(false);
      }
    }
    void loadCaregiverData();
  }, []);

  async function handleSelectConnection(accessId: string) {
    setSelectedConnection(accessId);
    try {
      const summary = await api.careCircleSharedSummary(accessId);
      setSharedSummary(summary);
    } catch {
      setSharedSummary(null);
    }
  }

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

              {/* Educational Cards */}
              <div className="grid gap-5 md:grid-cols-3">
                {items.map((item) => (
                  <Card key={item.id} className="relative overflow-hidden">
                    <Badge className="mb-2">{item.category.toUpperCase()}</Badge>
                    <h3 className="text-base font-black text-ink dark:text-white">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted dark:text-white/60">{item.description}</p>
                    {item.video_url && (
                      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-primary">
                        <Video className="h-4 w-4" /> Video Resource Included
                      </div>
                    )}
                  </Card>
                ))}
              </div>
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
                    <Card>
                      <SectionHeader
                        title={`Shared Health Status: ${String(sharedSummary.mother_name ?? "Mother")}`}
                        subtitle="Filtered by the mother's explicit consent preferences"
                      />

                      <div className="grid gap-5 md:grid-cols-3">
                        {Boolean(sharedSummary.emergency) && (
                          <div className="rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                            <Badge className="mb-2">EMERGENCY SOS</Badge>
                            <p className="text-xs font-bold text-muted">Emergency Contact:</p>
                            <p className="text-sm font-black text-ink dark:text-white">
                              {String((sharedSummary.emergency as Record<string, string>).emergency_contact)}
                            </p>
                            <p className="mt-2 text-xs font-bold text-muted">Blood Group:</p>
                            <p className="text-sm font-black text-ink dark:text-white">
                              {String((sharedSummary.emergency as Record<string, string>).blood_group)}
                            </p>
                          </div>
                        )}

                        {Boolean(sharedSummary.screenings) && (
                          <div className="rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                            <Badge className="mb-2">CLINICAL SCREENING</Badge>
                            <p className="text-xs font-bold text-muted">PCOS Risk Level:</p>
                            <p className="text-sm font-black text-ink dark:text-white">
                              {String((sharedSummary.screenings as Record<string, string>).pcos_risk)}
                            </p>
                            <p className="mt-2 text-xs font-bold text-muted">PPD Risk Level:</p>
                            <p className="text-sm font-black text-ink dark:text-white">
                              {String((sharedSummary.screenings as Record<string, string>).ppd_risk)}
                            </p>
                          </div>
                        )}

                        {Boolean(sharedSummary.wellness) && (
                          <div className="rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                            <Badge className="mb-2">WELLNESS & ENERGY</Badge>
                            <p className="text-xs font-bold text-muted">Today's Mood:</p>
                            <p className="text-sm font-black capitalize text-ink dark:text-white">
                              {String((sharedSummary.wellness as Record<string, string>).today_mood)}
                            </p>
                            <p className="mt-2 text-xs font-bold text-muted">Recent Fatigue:</p>
                            <p className="text-sm font-black text-ink dark:text-white">
                              {(sharedSummary.wellness as Record<string, boolean>).recent_fatigue ? "Fatigue reported" : "Normal energy"}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <LoadingSkeleton />
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: HERREACH SIMPLE HEALTHCARE FACILITY SEARCH */}
          {activeTab === "herreach" && <CaregiverHerReachView />}
        </>
      )}
    </Page>
  );
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
