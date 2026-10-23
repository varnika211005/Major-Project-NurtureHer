import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Activity,
  BarChart3,
  CalendarHeart,
  Check,
  ChevronRight,
  Compass,
  HeartPulse,
  LifeBuoy,
  Plus,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Utensils,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, DashboardStats } from "@/lib/api";
import { ErrorState, LoadingSkeleton } from "@/components/common/States";
import { MetricCard, SectionHeader } from "@/components/common/Premium";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/context/useLanguage";

const SYMPTOM_OPTIONS = [
  { key: "fatigue", label: "Fatigue", emoji: "😴", description: "Feeling unusually tired or low on energy" },
  { key: "headache", label: "Headache", emoji: "🤕", description: "Pain or pressure in head or temples" },
  { key: "sleep_issue", label: "Sleep Issues", emoji: "🌙", description: "Difficulty falling asleep or staying asleep" },
  { key: "anxiety", label: "Anxiety", emoji: "😰", description: "Feeling nervous, restless, or on edge" },
  { key: "cramps", label: "Cramps", emoji: "⚡", description: "Abdominal or pelvic muscle cramping" },
] as const;

export function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, boolean>>({
    fatigue: false,
    headache: false,
    sleep_issue: false,
    anxiety: false,
    cramps: false,
  });
  const [savingSymptoms, setSavingSymptoms] = useState(false);
  const [symptomStatus, setSymptomStatus] = useState<"success" | "error" | null>(null);
  const [symptomError, setSymptomError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const stats = await api.dashboard();
      setData(stats);
      if (stats.symptoms) {
        setSelectedSymptoms({
          fatigue: Boolean(stats.symptoms.fatigue),
          headache: Boolean(stats.symptoms.headache),
          sleep_issue: Boolean(stats.symptoms.sleep_issue),
          anxiety: Boolean(stats.symptoms.anxiety),
          cramps: Boolean(stats.symptoms.cramps),
        });
      }
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleSaveSymptoms() {
    setSavingSymptoms(true);
    setSymptomStatus(null);
    setSymptomError("");
    try {
      await api.createSymptoms({
        fatigue: Boolean(selectedSymptoms.fatigue),
        headache: Boolean(selectedSymptoms.headache),
        sleep_issue: Boolean(selectedSymptoms.sleep_issue),
        anxiety: Boolean(selectedSymptoms.anxiety),
        cramps: Boolean(selectedSymptoms.cramps),
      });
      setSymptomStatus("success");
      await loadDashboard();
      setTimeout(() => {
        setShowSymptomModal(false);
        setSymptomStatus(null);
      }, 900);
    } catch (reason) {
      setSymptomStatus("error");
      setSymptomError(reason instanceof Error ? reason.message : "Failed to save symptoms");
    } finally {
      setSavingSymptoms(false);
    }
  }

  if (!data && !error) return <LoadingSkeleton />;
  if (error) return <ErrorState />;

  const stats = data as DashboardStats;
  const moodKey = stats.today_mood?.mood?.toLowerCase() as "happy" | "sad" | "anxious" | "tired" | "angry" | undefined;
  const moodDisplay = moodKey && t.journal.moods[moodKey] ? t.journal.moods[moodKey] : (stats.today_mood?.mood ?? t.common.noEntry);
  const symptomCount = stats.symptoms
    ? [stats.symptoms.fatigue, stats.symptoms.headache, stats.symptoms.sleep_issue, stats.symptoms.anxiety, stats.symptoms.cramps].filter(Boolean).length
    : 0;

  const translateRisk = (risk: string | null) => {
    if (!risk) return t.common.notAssessed;
    const lower = risk.toLowerCase();
    if (lower === "low") return t.common.low;
    if (lower === "moderate") return t.common.moderate;
    if (lower === "high") return t.common.high;
    if (lower === "critical") return t.common.critical;
    return risk;
  };

  return (
    <div className="space-y-7">
      {/* Medical Non-diagnostic Disclaimer */}
      <div className="flex items-center gap-2 rounded-2xl border border-lavender-200 bg-lavender-50/70 px-4 py-2.5 text-xs text-lavender-900">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="font-semibold">Clinical Decision Support:</span>
        <span className="truncate">NurtureHer AI provides screening insights, not medical diagnoses. Consult a licensed healthcare provider for clinical evaluation.</span>
      </div>

      {/* Hero Welcome & Today's Status */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden border-lavender-100 bg-gradient-to-br from-surface via-lavender-50/40 to-lavender-100/40 p-6 md:p-8">
          <Badge>{t.dashboard.badge}</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-ink md:text-5xl">
            {t.dashboard.heading}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            {t.dashboard.subheading}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-lavender-100 bg-surface/90 px-4 py-2.5 text-xs font-black text-ink shadow-xs">
              {t.dashboard.moodLabel}: <span className="capitalize text-primary">{moodDisplay}</span>
            </div>
            <div className="rounded-2xl border border-lavender-100 bg-surface/90 px-4 py-2.5 text-xs font-black text-ink shadow-xs">
              {t.dashboard.symptomsLabel}: <span className="text-lavender-700 dark:text-lavender-300">{symptomCount} active</span>
            </div>
            <div className="rounded-2xl border border-lavender-100 bg-surface/90 px-4 py-2.5 text-xs font-black text-ink shadow-xs">
              {t.dashboard.cycleLabel}: <span className="text-primary">{stats.cycle_prediction ?? t.common.notTracked}</span>
            </div>
            <Button
              id="open-symptoms-modal-btn"
              size="sm"
              className="rounded-2xl shadow-soft"
              onClick={() => {
                setSymptomStatus(null);
                setShowSymptomModal(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Log Symptoms
            </Button>
          </div>
        </Card>

        {/* Emergency SOS & Signals Card */}
        <div className="space-y-4">
          <Card className="border-lavender-100 p-5">
            <SectionHeader title={t.dashboard.latestSignalsTitle} subtitle={t.dashboard.latestSignalsSubtitle} />
            <div className="mt-3 space-y-2.5 text-xs font-bold text-muted">
              <p className="flex items-center gap-2">
                <CalendarHeart className="h-4 w-4 text-primary" />
                <span>{t.dashboard.nextCycleEstimate}:</span>
                <span className="text-ink">{stats.cycle_prediction ?? t.common.notAvailable}</span>
              </p>
              <p className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-secondary" />
                <span>{t.dashboard.moodLabel}:</span>
                <span className="capitalize text-ink">{moodDisplay}</span>
              </p>
            </div>
          </Card>

          <Card className="border-rose-100 bg-rose-50/50 p-5 dark:border-rose-900/30 dark:bg-rose-950/20">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/50">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-rose-700 dark:text-rose-300">{t.dashboard.emergencyTitle}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  {t.dashboard.emergencyDesc}
                </p>
              </div>
            </div>
            <Button variant="danger" size="sm" className="mt-4 w-full" onClick={() => navigate("/emergency")}>
              {t.dashboard.openEmergencyBtn}
            </Button>
          </Card>
        </div>
      </section>

      {/* Core Health Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t.dashboard.pcosRiskCard}
          value={translateRisk(stats.pcos_risk)}
          icon={HeartPulse}
          progress={riskProgress(stats.pcos_risk)}
          note={t.dashboard.pcosRiskNote}
          tone="from-primary to-secondary"
        />
        <MetricCard
          label={t.dashboard.ppdStatusCard}
          value={translateRisk(stats.ppd_status)}
          icon={Stethoscope}
          progress={riskProgress(stats.ppd_status)}
          note={t.dashboard.ppdStatusNote}
          tone="from-purple-500 to-accent"
        />
        <MetricCard
          label={t.dashboard.latestMoodCard}
          value={moodDisplay}
          icon={ShieldCheck}
          note={t.dashboard.latestMoodNote}
          tone="from-emerald-400 to-mint"
        />
        <MetricCard
          label={t.dashboard.activeSymptomsCard}
          value={String(symptomCount)}
          icon={Activity}
          note={t.dashboard.activeSymptomsNote}
          tone="from-rose-400 to-primary"
        />
      </section>

      {/* Quick Access Care Suite Grid */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-ink">Care Suite & Tools</h2>
            <p className="text-xs text-muted">Comprehensive AI health tools designed for antenatal, postpartum, and gynecological wellbeing.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Card 1: Clinical Screenings */}
          <div
            onClick={() => navigate("/pcos")}
            className="group cursor-pointer rounded-2xl border border-lavender-100 bg-surface/90 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender-100 text-primary transition group-hover:bg-primary group-hover:text-onbrand">
              <HeartPulse className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-xs font-black text-ink">PCOS Screening</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted">Explainable AI biomarker risk prediction.</p>
            <span className="mt-2.5 inline-flex items-center text-[10px] font-bold text-primary group-hover:underline">
              Screen now <ChevronRight className="ml-0.5 h-3 w-3" />
            </span>
          </div>

          {/* Card 2: PPD Assessment */}
          <div
            onClick={() => navigate("/ppd")}
            className="group cursor-pointer rounded-2xl border border-lavender-100 bg-surface/90 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 transition group-hover:bg-purple-600 group-hover:text-white">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-xs font-black text-ink">PPD Detection</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted">EPDS score and sentiment analysis.</p>
            <span className="mt-2.5 inline-flex items-center text-[10px] font-bold text-primary group-hover:underline">
              Take assessment <ChevronRight className="ml-0.5 h-3 w-3" />
            </span>
          </div>

          {/* Card 4: CareCircle QR Vault */}
          <div
            onClick={() => navigate("/carecircle")}
            className="group cursor-pointer rounded-2xl border border-lavender-100 bg-surface/90 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
              <QrCode className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-xs font-black text-ink">CareCircle QR</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted">Zero-data QR consent vault.</p>
            <span className="mt-2.5 inline-flex items-center text-[10px] font-bold text-primary group-hover:underline">
              Manage vault <ChevronRight className="ml-0.5 h-3 w-3" />
            </span>
          </div>

          {/* Card 5: Nutrition Guide */}
          <div
            onClick={() => navigate("/nutrition")}
            className="group cursor-pointer rounded-2xl border border-lavender-100 bg-surface/90 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/15 text-orange-700 transition group-hover:bg-warning/25">
              <Utensils className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-xs font-black text-ink">Nutrition & Water</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted">Cultural diets & 8-cup hydration.</p>
            <span className="mt-2.5 inline-flex items-center text-[10px] font-bold text-primary group-hover:underline">
              Open guide <ChevronRight className="ml-0.5 h-3 w-3" />
            </span>
          </div>

          {/* Card 6: Reports Zone */}
          <div
            onClick={() => navigate("/reports")}
            className="group cursor-pointer rounded-2xl border border-lavender-100 bg-surface/90 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender-100 text-primary transition group-hover:bg-primary group-hover:text-onbrand">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-xs font-black text-ink">Reports Zone</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted">Printable PDF & CSV export.</p>
            <span className="mt-2.5 inline-flex items-center text-[10px] font-bold text-primary group-hover:underline">
              View reports <ChevronRight className="ml-0.5 h-3 w-3" />
            </span>
          </div>

          {/* Card 7: HerReach Healthcare Discovery */}
          <div
            id="mother-dashboard-herreach-card"
            onClick={() => navigate("/herreach")}
            className="group cursor-pointer rounded-2xl border border-lavender-100 bg-surface/90 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender-100 text-primary transition group-hover:bg-primary group-hover:text-onbrand">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-xs font-black text-ink">HerReach Discovery</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted">Smart nearby facilities & care finder.</p>
            <span className="mt-2.5 inline-flex items-center text-[10px] font-bold text-primary group-hover:underline">
              Find facilities <ChevronRight className="ml-0.5 h-3 w-3" />
            </span>
          </div>
        </div>
      </section>

      {/* Symptom Logging Modal */}
      <DialogPrimitive.Root open={showSymptomModal} onOpenChange={setShowSymptomModal}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm transition-opacity" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-lavender-200 bg-surface/95 p-6 shadow-glow backdrop-blur-xl outline-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogPrimitive.Title className="text-lg font-black text-ink">
                  Log Today's Symptoms
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-xs leading-5 text-muted">
                  Select any symptoms you are experiencing today to keep your care team informed.
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" className="h-9 w-9 shrink-0 px-0" aria-label="Close dialog">
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>

            <div className="mt-5 space-y-2">
              {SYMPTOM_OPTIONS.map((opt) => {
                const isSelected = Boolean(selectedSymptoms[opt.key]);
                return (
                  <button
                    key={opt.key}
                    id={`symptom-toggle-${opt.key}`}
                    type="button"
                    onClick={() => {
                      setSelectedSymptoms((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }));
                      setSymptomStatus(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-lavender-100 bg-lavender-50/40 text-ink hover:bg-lavender-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{opt.emoji}</span>
                      <div>
                        <p className="text-xs font-black">{opt.label}</p>
                        <p className="text-[11px] text-muted">{opt.description}</p>
                      </div>
                    </div>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-lg border transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-onbrand"
                          : "border-muted/30 bg-surface/80"
                      }`}
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {symptomStatus === "error" ? (
              <p className="mt-3 text-xs font-bold text-danger">{symptomError || "Failed to save symptoms."}</p>
            ) : null}

            {symptomStatus === "success" ? (
              <p className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">✅ Symptoms logged successfully!</p>
            ) : null}

            <div className="mt-6 flex items-center gap-3">
              <Button
                id="submit-symptoms-btn"
                className="flex-1"
                disabled={savingSymptoms}
                onClick={() => void handleSaveSymptoms()}
              >
                {savingSymptoms ? t.common.saving : "Save Symptoms"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowSymptomModal(false)}
              >
                Cancel
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

function riskProgress(value: string | null) {
  return value?.toLowerCase() === "high" ? 90 : value?.toLowerCase() === "moderate" ? 55 : value ? 20 : 0;
}