import { useEffect, useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  HeartPulse,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import { api, DoctorPatientItem } from "@/lib/api";
import { generatePrintableReportWindow } from "@/lib/reportPdf";
import { Page } from "@/components/common/Page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton, EmptyState } from "@/components/common/States";

interface PatientTimelineData {
  patient: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    age: number | null;
    blood_group: string | null;
    pregnancy_status: string | null;
    emergency_contact: string | null;
  };
  moods: Array<{ id: string; mood: string; note: string | null; created_at: string }>;
  symptoms: Array<{ id: string; fatigue: boolean; headache: boolean; sleep_issue: boolean; anxiety: boolean; cramps: boolean; created_at: string }>;
  pcos_screenings: Array<{ id: string; risk_level: string; probability: number; recommendations: string; created_at: string }>;
  ppd_screenings: Array<{ id: string; risk_level: string; epds_score: number; sentiment: string; created_at: string }>;
  cycles: Array<{ id: string; last_period_date: string; cycle_length: number; next_period_prediction: string }>;
  doctor_notes: Array<{ id: string; clinical_observations: string; follow_up_recommendation: string | null; prescribed_advice: string | null; created_at: string }>;
}

export function DoctorDashboard() {
  const [patients, setPatients] = useState<DoctorPatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "moderate" | "low">("all");

  // Selected patient for detail inspection drawer/modal
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<PatientTimelineData | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Clinical note form state
  const [observations, setObservations] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [prescribedAdvice, setPrescribedAdvice] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState("");

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    setLoading(true);
    setError("");
    try {
      const data = await api.doctorPatients();
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient roster");
    } finally {
      setLoading(false);
    }
  }

  async function selectPatient(patientId: string) {
    setSelectedPatientId(patientId);
    setTimelineLoading(true);
    setNoteSuccess("");
    try {
      const data = await api.doctorPatientTimeline(patientId);
      setTimelineData(data as unknown as PatientTimelineData);
    } catch (err) {
      console.error(err);
    } finally {
      setTimelineLoading(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId || !observations.trim()) return;
    setSavingNote(true);
    setNoteSuccess("");
    try {
      await api.doctorAddNote(selectedPatientId, {
        clinical_observations: observations.trim(),
        follow_up_recommendation: recommendations.trim() || undefined,
        prescribed_advice: prescribedAdvice.trim() || undefined,
      });
      setNoteSuccess("Clinical note saved to patient record");
      setObservations("");
      setRecommendations("");
      setPrescribedAdvice("");
      // Refresh timeline
      const updated = await api.doctorPatientTimeline(selectedPatientId);
      setTimelineData(updated as unknown as PatientTimelineData);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save clinical note");
    } finally {
      setSavingNote(false);
    }
  }

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.phone && p.phone.includes(searchQuery));

      if (!matchesSearch) return false;

      if (riskFilter === "all") return true;
      const pcosHigh = p.latest_pcos_risk.toLowerCase().includes("high");
      const ppdHigh = p.latest_ppd_risk.toLowerCase().includes("high");
      const pcosMod = p.latest_pcos_risk.toLowerCase().includes("mod");
      const ppdMod = p.latest_ppd_risk.toLowerCase().includes("mod");

      if (riskFilter === "high") return pcosHigh || ppdHigh;
      if (riskFilter === "moderate") return pcosMod || ppdMod;
      if (riskFilter === "low") return !pcosHigh && !ppdHigh && !pcosMod && !ppdMod;
      return true;
    });
  }, [patients, searchQuery, riskFilter]);

  const stats = useMemo(() => {
    const total = patients.length;
    const highRiskPCOS = patients.filter((p) => p.latest_pcos_risk.toLowerCase().includes("high")).length;
    const highRiskPPD = patients.filter((p) => p.latest_ppd_risk.toLowerCase().includes("high")).length;
    const pregnant = patients.filter((p) => p.pregnancy_status && p.pregnancy_status.toLowerCase() !== "not pregnant").length;
    return { total, highRiskPCOS, highRiskPPD, pregnant };
  }, [patients]);

  const printPatientSummary = (patient: PatientTimelineData) => {
    generatePrintableReportWindow({
      patientName: patient.patient.name,
      patientAge: patient.patient.age,
      pregnancyStage: patient.patient.pregnancy_status || "Not specified",
      emergencyContact: patient.patient.emergency_contact || "Not provided",
      reports: [
        ...patient.pcos_screenings.map((p) => ({
          title: "PCOS Risk Assessment",
          type: "PCOS",
          date: new Date(p.created_at).toLocaleDateString(),
          risk_level: p.risk_level,
          score: `${Math.round(p.probability * 100)}% risk probability`,
          recommendations: p.recommendations,
        })),
        ...patient.ppd_screenings.map((d) => ({
          title: "Postpartum Depression Screening (EPDS)",
          type: "PPD",
          date: new Date(d.created_at).toLocaleDateString(),
          risk_level: d.risk_level,
          score: `EPDS Score: ${d.epds_score}/30`,
          sentiment: d.sentiment,
        })),
      ],
      disclaimer:
        "CONFIDENTIAL MEDICAL SUMMARY: Generated via NurtureHer AI Provider Portal. This synthesis supports triage, multi-disciplinary consultations, and clinical decision making. It does not replace independent clinical evaluation or pathology.",
    });
  };

  return (
    <Page
      title="Doctor Consultation Portal"
      subtitle="Comprehensive clinical triage, longitudinal patient telemetry, and consultation records for maternal health providers."
    >
      {/* Medical Disclaimer Banner */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 text-xs leading-relaxed text-lavender-900 shadow-sm dark:border-lavender-800/40 dark:bg-lavender-950/40 dark:text-lavender-200">
        <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <span className="font-bold">Provider Decision Support Notice:</span> Patient risk scores and timeline trends
          synthesize self-reported symptoms, Edinburgh Postnatal Depression Scale (EPDS) screening data, and AI biomarker
          models. Always correlate findings with standard clinical diagnostic criteria and pathology prior to definitive therapy.
        </div>
      </div>

      {/* Clinical Triage Summary Metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-lavender-100 bg-white/90 p-5 shadow-soft dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">Active Roster</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-ink dark:text-white">{stats.total}</div>
          <p className="mt-1 text-xs text-muted dark:text-white/50">Mothers registered under care</p>
        </Card>

        <Card className="border-rose-100 bg-rose-50/40 p-5 shadow-soft dark:border-rose-900/30 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">High Risk PCOS</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/50">
              <HeartPulse className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-rose-700 dark:text-rose-200">{stats.highRiskPCOS}</div>
          <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-300/70">Requires endocrine follow-up</p>
        </Card>

        <Card className="border-amber-100 bg-amber-50/40 p-5 shadow-soft dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">High Risk PPD</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/50">
              <ShieldAlert className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-700 dark:text-amber-200">{stats.highRiskPPD}</div>
          <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-300/70">EPDS score elevated</p>
        </Card>

        <Card className="border-lavender-100 bg-lavender-50/40 p-5 shadow-soft dark:border-lavender-900/30 dark:bg-lavender-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-lavender-300">Antenatal Tracking</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lavender-100 text-primary dark:bg-lavender-900/50">
              <Activity className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-primary dark:text-lavender-200">{stats.pregnant}</div>
          <p className="mt-1 text-xs text-muted dark:text-white/50">Active pregnancy telemetry</p>
        </Card>
      </div>

      {/* Main Split View: Patient Table + Detail Drawer */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Left Column: Patient Roster */}
        <div className={selectedPatientId ? "xl:col-span-6" : "xl:col-span-12"}>
          <Card className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-ink dark:text-white">Authorized Patient Roster</h2>
                <p className="text-xs text-muted dark:text-white/60">Select any patient to review longitudinal telemetry and append clinical notes.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search patient name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-xl border border-lavender-200 bg-lavender-50/40 pl-9 pr-3 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div className="flex rounded-xl bg-lavender-100/60 p-0.5 dark:bg-white/10">
                  {(["all", "high", "moderate", "low"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setRiskFilter(lvl)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-colors ${
                        riskFilter === lvl
                          ? "bg-white text-primary shadow-xs dark:bg-primary dark:text-white"
                          : "text-muted hover:text-ink dark:text-white/60 dark:hover:text-white"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="mt-6">
                <LoadingSkeleton />
              </div>
            ) : error ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
                {error}
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="No patients match current filter"
                  text="Adjust your search keywords or risk filter to view patient records."
                />
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-2xl border border-lavender-100 dark:border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-lavender-100 bg-lavender-50/60 text-muted dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                      <tr>
                        <th className="px-4 py-3 font-black uppercase tracking-wider">Patient Name</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider">Stage & Age</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider">PCOS Risk</th>
                        <th className="px-4 py-3 font-black uppercase tracking-wider">PPD Risk</th>
                        <th className="px-4 py-3 text-right font-black uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-lavender-100 dark:divide-white/10">
                      {filteredPatients.map((patient) => {
                        const isSelected = selectedPatientId === patient.id;
                        const pcosHigh = patient.latest_pcos_risk.toLowerCase().includes("high");
                        const ppdHigh = patient.latest_ppd_risk.toLowerCase().includes("high");

                        return (
                          <tr
                            key={patient.id}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-lavender-100/70 dark:bg-white/15"
                                : "hover:bg-lavender-50/40 dark:hover:bg-white/5"
                            }`}
                            onClick={() => selectPatient(patient.id)}
                          >
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-ink dark:text-white">{patient.name}</div>
                              <div className="text-[11px] text-muted dark:text-white/50">{patient.email}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-ink dark:text-white/90">
                                {patient.pregnancy_status || "Not specified"}
                              </div>
                              <div className="text-[11px] text-muted dark:text-white/50">
                                {patient.age ? `${patient.age} yrs` : "Age —"} · {patient.blood_group || "Blood —"}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                                  pcosHigh
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                                    : patient.latest_pcos_risk.toLowerCase().includes("mod")
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                }`}
                              >
                                {patient.latest_pcos_risk}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                                  ppdHigh
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                                    : patient.latest_ppd_risk.toLowerCase().includes("mod")
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                }`}
                              >
                                {patient.latest_ppd_risk}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <Button
                                size="sm"
                                variant={isSelected ? "primary" : "secondary"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectPatient(patient.id);
                                }}
                              >
                                {isSelected ? "Active" : "Inspect"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Longitudinal Patient Telemetry & Consultation Notes */}
        {selectedPatientId && (
          <div className="space-y-6 xl:col-span-6">
            {timelineLoading ? (
              <Card className="p-8 text-center">
                <LoadingSkeleton />
              </Card>
            ) : timelineData ? (
              <>
                {/* Header Card with Patient Profile & PDF Export */}
                <Card className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
                        <User className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-black text-ink dark:text-white">{timelineData.patient.name}</h2>
                          <Badge variant="outline" className="border-lavender-300 text-primary">
                            {timelineData.patient.blood_group || "Blood Type Unspecified"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted dark:text-white/60">
                          {timelineData.patient.age ? `${timelineData.patient.age} years old` : "Age unrecorded"} ·{" "}
                          {timelineData.patient.pregnancy_status || "Postpartum / Antenatal"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted dark:text-white/60">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {timelineData.patient.email}
                          </span>
                          {timelineData.patient.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {timelineData.patient.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => printPatientSummary(timelineData)}
                        className="gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" /> Printable Summary
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPatientId(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Longitudinal Telemetry Tabs / Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Screening Syntheses */}
                  <Card className="p-5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted dark:text-white/60">
                      <HeartPulse className="h-4 w-4 text-primary" /> Screening History
                    </div>
                    <div className="mt-3 space-y-3">
                      {timelineData.pcos_screenings.length > 0 ? (
                        timelineData.pcos_screenings.slice(0, 2).map((p) => (
                          <div key={p.id} className="rounded-xl border border-lavender-100 bg-lavender-50/40 p-3 text-xs dark:border-white/10 dark:bg-white/5">
                            <div className="flex items-center justify-between font-bold text-ink dark:text-white">
                              <span>PCOS Evaluation</span>
                              <span className="capitalize text-primary">{p.risk_level}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-muted dark:text-white/60">
                              Probability: {Math.round(p.probability * 100)}% · {new Date(p.created_at).toLocaleDateString()}
                            </p>
                            <p className="mt-1 text-[11px] italic text-muted dark:text-white/50 line-clamp-2">
                              {p.recommendations}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted">No PCOS screenings recorded.</p>
                      )}

                      {timelineData.ppd_screenings.length > 0 ? (
                        timelineData.ppd_screenings.slice(0, 2).map((d) => (
                          <div key={d.id} className="rounded-xl border border-lavender-100 bg-lavender-50/40 p-3 text-xs dark:border-white/10 dark:bg-white/5">
                            <div className="flex items-center justify-between font-bold text-ink dark:text-white">
                              <span>EPDS Postpartum Assessment</span>
                              <span className="capitalize text-amber-600 dark:text-amber-300">{d.risk_level}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-muted dark:text-white/60">
                              EPDS Score: {d.epds_score}/30 · Sentiment: {d.sentiment}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted">No PPD assessments recorded.</p>
                      )}
                    </div>
                  </Card>

                  {/* Self-Reported Symptoms & Moods */}
                  <Card className="p-5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted dark:text-white/60">
                      <Activity className="h-4 w-4 text-secondary" /> Daily Symptoms & Mood
                    </div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <span className="text-[11px] font-bold text-ink dark:text-white">Recent Mood Trend:</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {timelineData.moods.length > 0 ? (
                            timelineData.moods.slice(0, 5).map((m) => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-lavender-100 bg-white px-2 py-1 text-[11px] font-semibold capitalize text-ink shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-white"
                              >
                                {m.mood}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted">No moods logged</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-ink dark:text-white">Latest Symptoms:</span>
                        {timelineData.symptoms.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {timelineData.symptoms[0].fatigue && <Badge variant="secondary">Fatigue</Badge>}
                            {timelineData.symptoms[0].headache && <Badge variant="secondary">Headache</Badge>}
                            {timelineData.symptoms[0].sleep_issue && <Badge variant="secondary">Insomnia</Badge>}
                            {timelineData.symptoms[0].anxiety && <Badge variant="secondary">Anxiety</Badge>}
                            {timelineData.symptoms[0].cramps && <Badge variant="secondary">Cramps</Badge>}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-muted">No physical symptoms logged</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Consultation Notes Section */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-ink dark:text-white">Clinical Notes & Follow-up</h3>
                      <p className="text-xs text-muted dark:text-white/60">Append physician observations and prescribed lifestyle or therapeutic advice.</p>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleAddNote} className="mt-4 space-y-3 rounded-2xl border border-lavender-100 bg-lavender-50/30 p-4 dark:border-white/10 dark:bg-white/5">
                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">
                        Clinical Observations & Diagnostic Impression *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="e.g. Patient presents with irregular cycle symptoms, mild fatigue. EPDS score stable at 6..."
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-3 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-ink dark:text-white">
                          Prescribed Advice / Nutrition Guidance
                        </label>
                        <input
                          type="text"
                          value={prescribedAdvice}
                          onChange={(e) => setPrescribedAdvice(e.target.value)}
                          placeholder="e.g. High-fiber diet, hydration 2.5L/day"
                          className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink dark:text-white">
                          Follow-up Schedule
                        </label>
                        <input
                          type="text"
                          value={recommendations}
                          onChange={(e) => setRecommendations(e.target.value)}
                          placeholder="e.g. Repeat EPDS screening in 2 weeks"
                          className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                        />
                      </div>
                    </div>

                    {noteSuccess && (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-4 w-4" /> {noteSuccess}
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <Button type="submit" disabled={savingNote || !observations.trim()} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> {savingNote ? "Saving Note..." : "Save Clinical Note"}
                      </Button>
                    </div>
                  </form>

                  {/* Past Doctor Notes Feed */}
                  <div className="mt-6 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">
                      Previous Consultation Notes ({timelineData.doctor_notes.length})
                    </h4>
                    {timelineData.doctor_notes.length > 0 ? (
                      timelineData.doctor_notes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-xl border border-lavender-100 bg-white p-4 text-xs shadow-2xs dark:border-white/10 dark:bg-card"
                        >
                          <div className="flex items-center justify-between text-muted dark:text-white/50">
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <Stethoscope className="h-3.5 w-3.5" /> Attending Physician
                            </span>
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock className="h-3 w-3" /> {new Date(note.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-ink dark:text-white">
                            {note.clinical_observations}
                          </p>
                          {note.prescribed_advice && (
                            <div className="mt-2 rounded-lg bg-lavender-50/60 p-2 text-[11px] text-lavender-900 dark:bg-white/5 dark:text-lavender-200">
                              <span className="font-bold">Advice:</span> {note.prescribed_advice}
                            </div>
                          )}
                          {note.follow_up_recommendation && (
                            <p className="mt-1 text-[11px] text-muted dark:text-white/50">
                              <span className="font-semibold">Follow-up:</span> {note.follow_up_recommendation}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted">No prior consultation notes on file for this patient.</p>
                    )}
                  </div>
                </Card>
              </>
            ) : null}
          </div>
        )}
      </div>
    </Page>
  );
}
