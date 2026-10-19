import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CalendarHeart,
  Compass,
  ExternalLink,
  HeartPulse,
  Info,
  LifeBuoy,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { useAuth } from "@/context/useAuth";
import {
  api,
  FacilityItem,
  HerReachRecommendationsResponse,
  OfficialHelpline,
} from "@/lib/api";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Healthcare discovery categories
const CATEGORIES: Array<{ key: string; label: string; icon: typeof HeartPulse; description: string }> = [
  { key: "gynaecology", label: "Gynaecology & Women's Health", icon: HeartPulse, description: "PCOS, hormonal balance & pelvic wellness clinics" },
  { key: "mental_health", label: "Mental Health & Counseling", icon: ShieldAlert, description: "Perinatal depression, emotional wellbeing & therapy" },
  { key: "maternity", label: "Maternity & Obstetricians", icon: CalendarHeart, description: "Birthing centres, antenatal care & delivery hospitals" },
  { key: "hospital", label: "Multi-Specialty Hospitals", icon: Building2, description: "Comprehensive hospitals with emergency care facilities" },
  { key: "pharmacy", label: "Pharmacies & Medical Stores", icon: ShieldCheck, description: "24/7 pharmacies, prescribed medication & essential supplies" },
  { key: "clinic", label: "Primary Care & Clinics", icon: Stethoscope, description: "General practitioners and outpatient health clinics" },
  { key: "diagnostic_lab", label: "Diagnostic Labs & Scans", icon: Compass, description: "Ultrasound centres, blood testing & imaging facilities" },
  { key: "emergency", label: "Emergency & 24x7 Casualty", icon: LifeBuoy, description: "Immediate trauma units & urgent obstetric emergency rooms" },
];

export function HerReachPage({ defaultRoleOverride }: { defaultRoleOverride?: "mother" | "caregiver" | "doctor" }) {
  const { user } = useAuth();
  const currentRole = defaultRoleOverride || user?.role || "mother";

  // Search parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("gynaecology");
  const [manualArea, setManualArea] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [locationError, setLocationError] = useState<string>("");

  // Facility discovery state
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [helplines, setHelplines] = useState<OfficialHelpline[]>([]);
  const [isLiveProvider, setIsLiveProvider] = useState<boolean>(false);
  const [providerStatus, setProviderStatus] = useState<string>("");
  const [externalSearchUrl, setExternalSearchUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>("");

  // Mother smart recommendations state
  const [recommendations, setRecommendations] = useState<HerReachRecommendationsResponse | null>(null);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);
  const [activeConcernFilter, setActiveConcernFilter] = useState<string | null>(null);

  // Load concern-based recommendations if user is Mother
  const loadMotherRecommendations = useCallback(async () => {
    if (currentRole !== "mother") return;
    setLoadingRecs(true);
    try {
      const recs = await api.herreachRecommendations();
      setRecommendations(recs);
      if (recs.recommendations.length > 0) {
        // Default to first detected concern's category
        setSelectedCategory(recs.recommendations[0].recommended_category);
        setActiveConcernFilter(recs.recommendations[0].concern_key);
      }
    } catch {
      // Recommendations endpoint unavailable or unauthenticated
      setRecommendations(null);
    } finally {
      setLoadingRecs(false);
    }
  }, [currentRole]);

  useEffect(() => {
    void loadMotherRecommendations();
  }, [loadMotherRecommendations]);

  // Execute Facility Search
  const performSearch = useCallback(
    async (overrideCategory?: string) => {
      setLoading(true);
      setSearchError("");
      const cat = overrideCategory || selectedCategory;

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
        setSearchError(err instanceof Error ? err.message : "Healthcare facility search failed");
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedCategory, userCoords, manualArea]
  );

  // Trigger initial search
  useEffect(() => {
    void performSearch();
  }, [performSearch]);

  // Request browser geolocation
  const handleGetLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Please enter your city or PIN code manually.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setLocationLabel(`Current Location (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`);
        setManualArea("");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission denied. Enter your area, city, or PIN code manually.");
        } else {
          setLocationError("Unable to acquire current location. Please use manual location search.");
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleClearLocation = () => {
    setUserCoords(null);
    setLocationLabel("");
    setManualArea("");
    setLocationError("");
  };

  // Title and subtitle customized per role
  const getHeaderInfo = () => {
    if (currentRole === "doctor") {
      return {
        title: "HerReach — Clinical Healthcare Resource Finder",
        subtitle: "Discover and verify specialized medical resources, hospitals, and diagnostic centres to guide patients.",
      };
    }
    if (currentRole === "caregiver") {
      return {
        title: "HerReach — Family Healthcare Facility Finder",
        subtitle: "Quickly locate nearby hospitals, medical stores, delivery centres, and 24x7 emergency facilities for your loved one.",
      };
    }
    return {
      title: "HerReach — Healthcare Discovery",
      subtitle: "Discover nearby healthcare facilities, gynaecologists, and support tailored to your reported concerns and wellness screenings.",
    };
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <Page title={title} subtitle={subtitle}>
      {/* 1. Medical Safety Non-diagnostic Banner (Mother & General) */}
      <div className="rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 text-xs text-lavender-900 dark:border-lavender-800/40 dark:bg-lavender-950/40 dark:text-lavender-200">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-black text-ink dark:text-white">
              Clinical Decision Support Notice & Safety Protocol
            </p>
            <p className="leading-relaxed text-muted dark:text-white/70">
              HerReach provides healthcare discovery resources and potential facility options. Screening results and recommendation highlights are non-diagnostic decision-support tools, not confirmed medical diagnoses. Always consult a licensed clinician for medical evaluation.
            </p>
            <p className="font-black text-rose-600 dark:text-rose-400">
              URGENT NOTICE: Never delay emergency care or hospital visits in order to complete a questionnaire or search this directory. If experiencing severe symptoms, call 112 or 108 immediately.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Mother Dashboard: Smart Concern-Based Facility Recommendations */}
      {currentRole === "mother" && (
        <Card className="border-lavender-100 bg-white/90 p-5 shadow-soft dark:border-white/10 dark:bg-card">
          <SectionHeader
            title="Smart Concern-Based Recommendations"
            subtitle="Guidance based on your recorded screenings and reported wellbeing concerns"
          />

          {loadingRecs ? (
            <div className="mt-4">
              <LoadingSkeleton />
            </div>
          ) : recommendations && recommendations.recommendations.length > 0 ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {recommendations.recommendations.map((rec) => {
                  const isSelected = activeConcernFilter === rec.concern_key;
                  return (
                    <button
                      key={rec.concern_key}
                      type="button"
                      onClick={() => {
                        setActiveConcernFilter(rec.concern_key);
                        setSelectedCategory(rec.recommended_category);
                        void performSearch(rec.recommended_category);
                      }}
                      className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black transition ${
                        isSelected
                          ? "bg-primary text-white shadow-soft"
                          : "border border-lavender-200 bg-white text-ink hover:bg-lavender-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      }`}
                    >
                      {rec.concern_key === "pcos" && <HeartPulse className="h-3.5 w-3.5 text-primary" />}
                      {rec.concern_key === "ppd" && <ShieldAlert className="h-3.5 w-3.5 text-secondary" />}
                      {rec.concern_key === "pregnancy" && <CalendarHeart className="h-3.5 w-3.5 text-amber-500" />}
                      {rec.concern_key === "urgent" && <LifeBuoy className="h-3.5 w-3.5 text-rose-500" />}
                      {rec.concern_key === "general" && <Stethoscope className="h-3.5 w-3.5 text-emerald-500" />}
                      <span>{rec.concern_title}</span>
                      {rec.detected_assessment_basis && (
                        <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/20">
                          Recorded
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Concern Insight Card */}
              {activeConcernFilter && (
                <div className="rounded-2xl border border-lavender-100 bg-lavender-50/40 p-4 dark:border-white/10 dark:bg-white/5">
                  {(() => {
                    const activeRec = recommendations.recommendations.find(
                      (r) => r.concern_key === activeConcernFilter
                    );
                    if (!activeRec) return null;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-ink dark:text-white">
                            Suggested Facility Types:
                          </p>
                          {activeRec.detected_assessment_basis && (
                            <Badge variant="outline" className="text-[10px]">
                              {activeRec.detected_assessment_basis}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeRec.suggested_facility_types.map((type, idx) => (
                            <span
                              key={idx}
                              className="rounded-xl border border-lavender-200 bg-white px-2.5 py-1 text-[11px] font-bold text-muted dark:border-white/10 dark:bg-card dark:text-white/80"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] italic leading-relaxed text-muted dark:text-white/60">
                          {activeRec.clinical_safety_notice}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted dark:text-white/60">
              No recent assessment screening records found. You can discover facilities or search by healthcare category below.
            </p>
          )}
        </Card>
      )}

      {/* 3. Search & Location Bar */}
      <Card className="border-lavender-100 bg-white/90 p-5 shadow-soft dark:border-white/10 dark:bg-card">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="herreach-search-input"
                type="text"
                placeholder={
                  currentRole === "caregiver"
                    ? "Search hospital, medical store, clinic name..."
                    : currentRole === "doctor"
                    ? "Search specialized medical facility, diagnostic lab..."
                    : "Search healthcare facility or specialist..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void performSearch();
                }}
                className="pl-10"
              />
            </div>

            {/* Manual Locality / PIN code Input */}
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="herreach-area-input"
                type="text"
                placeholder="Area, city, or PIN code (e.g. Indiranagar, 560038)"
                value={manualArea}
                onChange={(e) => {
                  setManualArea(e.target.value);
                  setUserCoords(null);
                  setLocationLabel("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void performSearch();
                }}
                className="pl-10"
              />
            </div>

            {/* Actions: Locate & Search */}
            <div className="flex items-center gap-2">
              <Button
                id="herreach-geolocate-btn"
                type="button"
                variant="secondary"
                className="gap-1.5"
                onClick={handleGetLocation}
                title="Find facilities near my current GPS location"
              >
                <LocateFixed className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Near Me</span>
              </Button>
              <Button
                id="herreach-search-submit-btn"
                type="button"
                className="gap-1.5 shadow-soft"
                onClick={() => void performSearch()}
                disabled={loading}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>Search</span>
              </Button>
            </div>
          </div>

          {/* Location status badge or error */}
          {locationLabel && (
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <MapPin className="h-3.5 w-3.5" />
              <span>Using: {locationLabel}</span>
              <button
                type="button"
                onClick={handleClearLocation}
                className="ml-1 text-muted hover:text-ink dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {locationError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              {locationError}
            </p>
          )}

          {/* Category Filter Pills */}
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted dark:text-white/60">
              Select Healthcare Category
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.key);
                      void performSearch(cat.key);
                    }}
                    className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-black transition ${
                      isSelected
                        ? "bg-secondary text-white shadow-soft"
                        : "border border-lavender-200 bg-white text-ink hover:bg-lavender-50 dark:border-white/10 dark:bg-card dark:text-white"
                    }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Provider Fallback Notice (Graceful, honest message when API key is unconfigured) */}
      {!isLiveProvider && hasSearched && (
        <Card className="border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
              <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                Live Maps Provider Status
              </p>
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                {providerStatus || "Live Google Places API key is not configured in this environment. In accordance with clinical safety guidelines, no synthetic or fabricated facility results are generated."}
              </p>
              <div className="pt-1">
                <Button
                  id="open-external-maps-btn"
                  variant="secondary"
                  size="sm"
                  className="gap-2 border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-card dark:text-amber-100"
                  onClick={() => {
                    if (externalSearchUrl) window.open(externalSearchUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Navigation className="h-3.5 w-3.5 text-primary" />
                  <span>Open Direct Google Maps Search for this Query</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 5. Facility Search Results List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-ink dark:text-white">
              {isLiveProvider
                ? `Discovered Facilities (${facilities.length})`
                : "Verified Healthcare Resources & Direction Links"}
            </h2>
            <p className="text-xs text-muted dark:text-white/60">
              {isLiveProvider
                ? "Live healthcare facilities verified via Google Maps Places"
                : "External direction links & verified public health helplines"}
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : searchError ? (
          <ErrorState title="Healthcare search error" text={searchError} />
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

                  <h3 className="text-sm font-black text-ink dark:text-white">
                    {facility.name}
                  </h3>

                  <p className="flex items-start gap-1.5 text-xs text-muted dark:text-white/60">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                    <span>{facility.address}</span>
                  </p>

                  {facility.opening_hours && (
                    <p className="text-[11px] font-bold text-mint">
                      ● {facility.opening_hours}
                    </p>
                  )}

                  {facility.rating !== null && facility.rating !== undefined && (
                    <p className="text-[11px] font-bold text-muted dark:text-white/60">
                      ★ {facility.rating} ({facility.user_ratings_total || 0} reviews)
                    </p>
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
            text="Try widening your search area or selecting a broader healthcare category."
          />
        ) : null}
      </section>

      {/* 6. Verified Official Emergency & Public Helplines (24/7 National Health Numbers) */}
      {helplines.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title="Official 24x7 Public Emergency & Healthcare Helplines"
            subtitle="Verified national telephone helplines available at any time"
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {helplines.map((helpline, idx) => (
              <Card
                key={idx}
                className="border-lavender-100 bg-white/80 p-4 transition hover:shadow-soft dark:border-white/10 dark:bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-black text-ink dark:text-white">
                    {helpline.title}
                  </p>
                  <span className="font-mono text-sm font-black text-primary">
                    {helpline.number}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted dark:text-white/60">
                  {helpline.description}
                </p>
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
        </section>
      )}
    </Page>
  );
}
