import { Calendar, Download, FileText, HelpCircle, Lightbulb, RefreshCw, ShieldAlert, Sparkles, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { api, DoctorVisitSummary } from "@/lib/api";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/useLanguage";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { LoadingSkeleton } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { printOrSaveClinicalReport } from "@/lib/reportPdf";

export function DoctorVisitAssistant() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [summary, setSummary] = useState<DoctorVisitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadSummary() {
    setLoading(true);
    try {
      const res = await api.doctorVisitSummary();
      setSummary(res);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await api.doctorVisitSummary();
      setSummary(res);
    } finally {
      setRefreshing(false);
    }
  }

  function handleDownloadPDF() {
    if (!summary) return;
    printOrSaveClinicalReport({
      reportTitle: "Doctor-Visit Clinical Consultation Brief",
      reportType: "Doctor Visit Summary",
      patientName: summary.patient_name,
      patientAge: summary.age,
      pregnancyStage: summary.pregnancy_stage,
      emergencyContact: summary.emergency_contact,
      dateGenerated: summary.generated_at,
      primaryMetric: {
        label: "Primary Clinical Profile",
        value: summary.pregnancy_stage || "General Wellness",
        riskCategory: summary.summary.ppd_screening.risk_level || summary.summary.pcos_screening.risk_level || "LOW",
      },
      contributingFactors: [
        {
          label: "PCOS Screening Status",
          value: `${summary.summary.pcos_screening.risk_level.toUpperCase()} RISK`,
          note: summary.summary.pcos_screening.notes,
        },
        {
          label: "Postpartum Depression (EPDS)",
          value: `${summary.summary.ppd_screening.risk_level.toUpperCase()} RISK`,
          note: summary.summary.ppd_screening.sentiment ? `Sentiment: ${summary.summary.ppd_screening.sentiment}` : undefined,
        },
        {
          label: "Fatigue Frequency (Last 7 Days)",
          value: `${summary.summary.symptom_frequency_last_7_days.fatigue_days ?? 0} days recorded`,
        },
        {
          label: "Sleep Disruption (Last 7 Days)",
          value: `${summary.summary.symptom_frequency_last_7_days.sleep_issue_days ?? 0} days recorded`,
        },
      ],
      clinicalRecommendations: [
        "Present this structured overview to your obstetrician or consulting physician.",
        "Review questions generated below regarding your reported symptom trends.",
        "Remember this AI brief is for appointment preparation and not a clinical diagnosis.",
      ],
      doctorQuestions: summary.questions_to_ask_doctor,
      suggestedRecords: summary.suggested_records_to_bring,
    });
  }

  return (
    <Page
      title="AI Doctor-Visit Assistant"
      subtitle="Automated clinical synthesis of your recent symptoms, mood patterns, and screening history"
    >
      {/* Overview Banner */}
      <div className="mb-6 rounded-[24px] border border-lavender-200/80 bg-gradient-to-br from-lavender-100/90 via-white to-lavender-50/70 p-6 shadow-soft dark:border-white/10 dark:from-white/10 dark:to-white/5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
                <Stethoscope className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-black text-ink dark:text-white">Consultation Preparation Brief</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted dark:text-white/60">
              This summary condenses your longitudinal journals, screening evaluations, and symptom counts into a concise, clinic-ready briefing paper to make your doctor visits more productive and focused.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh Data
            </Button>
            <Button onClick={handleDownloadPDF} disabled={!summary}>
              <Download className="mr-2 h-4 w-4" /> Download Brief (PDF)
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : !summary ? (
        <Card className="text-center p-8">
          <p className="text-sm font-bold text-muted">Unable to synthesize visit summary. Please log symptoms and try again.</p>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Main Summary Column */}
          <div className="space-y-6">
            {/* Screenings and Vitals Summary Card */}
            <Card>
              <SectionHeader
                title="Longitudinal Clinical Overview"
                subtitle={`Synthesized for ${summary.patient_name} on ${summary.generated_at}`}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-lavender-200/80 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-black uppercase text-muted">PCOS Clinical Status</p>
                  <p className="mt-1 text-lg font-black text-ink dark:text-white">
                    {summary.summary.pcos_screening.risk_level.toUpperCase()} RISK
                  </p>
                  <p className="mt-1 text-xs text-muted dark:text-white/60">
                    {summary.summary.pcos_screening.notes}
                  </p>
                </div>

                <div className="rounded-2xl border border-lavender-200/80 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-black uppercase text-muted">Postpartum Mental Health (EPDS)</p>
                  <p className="mt-1 text-lg font-black text-ink dark:text-white">
                    {summary.summary.ppd_screening.risk_level.toUpperCase()} RISK
                  </p>
                  <p className="mt-1 text-xs text-muted dark:text-white/60">
                    {summary.summary.ppd_screening.sentiment
                      ? `Emotional sentiment: ${summary.summary.ppd_screening.sentiment}`
                      : "Screening logged without text sentiment"}
                  </p>
                </div>
              </div>

              {/* Symptom frequency in last 7 days */}
              <div className="mt-5 rounded-2xl border border-lavender-200/80 p-4 dark:border-white/10">
                <p className="text-xs font-black uppercase tracking-wider text-muted">7-Day Symptom Frequency</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-lavender-100/70 p-3 text-center dark:bg-white/5">
                    <p className="text-2xl font-black text-ink dark:text-white">
                      {summary.summary.symptom_frequency_last_7_days.fatigue_days ?? 0}
                    </p>
                    <p className="text-xs font-bold text-muted">Fatigue Days</p>
                  </div>
                  <div className="rounded-xl bg-lavender-100/70 p-3 text-center dark:bg-white/5">
                    <p className="text-2xl font-black text-ink dark:text-white">
                      {summary.summary.symptom_frequency_last_7_days.headache_days ?? 0}
                    </p>
                    <p className="text-xs font-bold text-muted">Headache Days</p>
                  </div>
                  <div className="rounded-xl bg-lavender-100/70 p-3 text-center dark:bg-white/5">
                    <p className="text-2xl font-black text-ink dark:text-white">
                      {summary.summary.symptom_frequency_last_7_days.sleep_issue_days ?? 0}
                    </p>
                    <p className="text-xs font-bold text-muted">Sleep Issues</p>
                  </div>
                  <div className="rounded-xl bg-lavender-100/70 p-3 text-center dark:bg-white/5">
                    <p className="text-2xl font-black text-ink dark:text-white">
                      {summary.summary.symptom_frequency_last_7_days.anxiety_days ?? 0}
                    </p>
                    <p className="text-xs font-bold text-muted">Anxiety Days</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Questions to ask doctor */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HelpCircle className="h-5 w-5" />
                </span>
                <h3 className="text-base font-black text-ink dark:text-white">
                  Important Questions to Ask Your Doctor
                </h3>
              </div>

              <div className="space-y-3">
                {summary.questions_to_ask_doctor.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl border border-lavender-200/80 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-ink dark:text-white">{q}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar Column: What to Bring & Medical Notice */}
          <div className="space-y-6">
            {/* Suggested Records to bring */}
            <Card>
              <SectionHeader
                title="What to Bring to Your Visit"
                subtitle="Checklist of essential records"
              />
              <div className="space-y-3">
                {summary.suggested_records_to_bring.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl bg-lavender-50 p-3 text-xs font-semibold text-ink dark:bg-white/5 dark:text-white"
                  >
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Emergency & Disclaimer Card */}
            <Card className="border border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <h4 className="font-black text-sm">Clinical Safety Disclaimer</h4>
              </div>
              <p className="mt-2 text-xs leading-5 text-amber-900 dark:text-amber-200/90">
                {summary.disclaimer}
              </p>
              <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-white/10">
                <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300">
                  National Emergency Ambulance: 112
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </Page>
  );
}
