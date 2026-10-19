import { useEffect, useState, useMemo } from "react";
import {
  Activity,
  CheckCircle,
  Clock,
  Compass,
  Download,
  ExternalLink,
  HeartPulse,
  LocateFixed,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  User,
  Users,
  X,
} from "lucide-react";
import { api, ChatMessage, DoctorPatientItem, FacilityItem, OfficialHelpline } from "@/lib/api";
import { generatePrintableReportWindow } from "@/lib/reportPdf";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton, EmptyState, ErrorState } from "@/components/common/States";

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
  symptoms: Array<{ id: string; fatigue: boolean; headache?: boolean; sleep_issue: boolean; anxiety: boolean; cramps?: boolean; created_at: string }>;
  pcos_screenings: Array<{ id: string; risk_level: string; probability?: number; recommendations?: string; created_at: string }>;
  ppd_screenings: Array<{ id: string; risk_level: string; epds_score?: number; sentiment?: string; created_at: string }>;
  cycles: Array<{ id: string; last_period_date: string; cycle_length: number; next_period_prediction: string }>;
  doctor_notes: Array<{ id: string; clinical_observations: string; follow_up_recommendation: string | null; prescribed_advice: string | null; created_at: string }>;
}

export function DoctorDashboard() {
  const [patients, setPatients] = useState<DoctorPatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "moderate" | "low">("all");
  const [portalTab, setPortalTab] = useState<"patients" | "herreach">("patients");

  // Selected patient for detail inspection drawer/modal
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<PatientTimelineData | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [escalations, setEscalations] = useState<{ case_id: string; mother_id: string; mother_name: string; severity: string; risk_type: string; status: string; created_at: string }[]>([]);
  const [patientChat, setPatientChat] = useState<ChatMessage[] | null>(null);

  // Clinical note form state
  const [observations, setObservations] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [prescribedAdvice, setPrescribedAdvice] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState("");

  useEffect(() => {
    fetchPatients();
    api.doctorEscalations().then(setEscalations).catch(() => setEscalations([]));
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
    setPatientChat(null);
    try {
      const data = await api.doctorPatientTimeline(patientId);
      setTimelineData(data as unknown as PatientTimelineData);
      const chats = await api.doctorPatientChatHistory(patientId).catch(() => []);
      setPatientChat(chats);
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
      const hasSharedRisk = [p.latest_pcos_risk, p.latest_ppd_risk].some(
        (risk) => risk !== "Not shared" && risk !== "Not screened",
      );

      if (riskFilter === "high") return pcosHigh || ppdHigh;
      if (riskFilter === "moderate") return pcosMod || ppdMod;
      if (riskFilter === "low") return hasSharedRisk && !pcosHigh && !ppdHigh && !pcosMod && !ppdMod;
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
          score: p.probability === undefined ? `${p.risk_level} risk category` : `${Math.round(p.probability * 100)}% risk probability`,
          recommendations: p.recommendations,
        })),
        ...patient.ppd_screenings.map((d) => ({
          title: "Postpartum Depression Screening (EPDS)",
          type: "PPD",
          date: new Date(d.created_at).toLocaleDateString(),
          risk_level: d.risk_level,
          score: d.epds_score === undefined ? `${d.risk_level} risk category` : `EPDS Score: ${d.epds_score}/30`,
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

      {/* Portal Tab Switch */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-lavender-200 pb-3 dark:border-white/10">
        <button
          type="button"
          onClick={() => setPortalTab("patients")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            portalTab === "patients"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <Users className="h-4 w-4" /> Patient Roster & Telemetry
        </button>
        <button
          id="doctor-herreach-tab"
          type="button"
          onClick={() => setPortalTab("herreach")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            portalTab === "herreach"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <Compass className="h-4 w-4 text-primary" /> HerReach Resource Finder
        </button>
      </div>

      {portalTab === "herreach" ? (
        <DoctorHerReachView />
      ) : (
        <>
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

      {/* Escalation Queue: open chat-triage cases for authorized patients */}
      {escalations.length > 0 && (
        <Card className="mb-6 border-rose-200 p-6 dark:border-rose-900/40">
          <div className="flex items-center gap-2 text-sm font-black text-ink dark:text-white">
            <ShieldAlert className="h-4 w-4 text-rose-600" /> Escalation Queue ({escalations.length})
          </div>
          <p className="mt-1 text-xs text-muted">Chat messages flagged by deterministic triage. Select a patient to review.</p>
          <div className="mt-3 space-y-2">
            {escalations.map((item) => (
              <button
                key={item.case_id}
                type="button"
                onClick={() => void selectPatient(item.mother_id)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-lavender-100 bg-lavender-50/40 px-3 py-2 text-left text-xs hover:border-primary dark:border-white/10 dark:bg-white/5"
              >
                <span className="font-bold text-ink dark:text-white">{item.mother_name}</span>
                <span className="font-black uppercase text-rose-600">{item.severity}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

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
                        const riskBadgeClass = (risk: string, highClass: string, moderateClass: string) =>
                          risk.toLowerCase().includes("high")
                            ? highClass
                            : risk.toLowerCase().includes("mod")
                            ? moderateClass
                            : risk === "Not shared" || risk === "Not screened"
                            ? "bg-lavender-100 text-muted dark:bg-white/10 dark:text-white/60"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";

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
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${riskBadgeClass(patient.latest_pcos_risk, "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300", "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300")}`}
                              >
                                {patient.latest_pcos_risk}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${riskBadgeClass(patient.latest_ppd_risk, "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300", "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300")}`}
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
                              {p.probability === undefined ? "" : `Probability: ${Math.round(p.probability * 100)}% · `}
                              {new Date(p.created_at).toLocaleDateString()}
                            </p>
                            {p.recommendations && (
                              <p className="mt-1 text-[11px] italic text-muted dark:text-white/50 line-clamp-2">
                                {p.recommendations}
                              </p>
                            )}
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
                              {d.epds_score === undefined ? "" : `EPDS Score: ${d.epds_score}/30 · `}
                              {d.sentiment ? `Sentiment: ${d.sentiment} · ` : ""}
                              {new Date(d.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted">No PPD assessments recorded.</p>
                      )}
                    </div>
                  </Card>

                  {/* Conversation History (consent-gated) */}
                  <Card className="p-5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted dark:text-white/60">
                      <Mail className="h-4 w-4 text-primary" /> Conversation History
                    </div>
                    <div className="mt-3 space-y-2">
                      {patientChat === null ? (
                        <p className="text-xs text-muted">Loading shared conversations…</p>
                      ) : patientChat.length === 0 ? (
                        <p className="text-xs text-muted">No conversations shared for this patient yet.</p>
                      ) : (
                        patientChat.slice(0, 5).map((chat) => (
                          <div key={chat.id} className="rounded-xl border border-lavender-100 bg-lavender-50/40 p-3 text-xs dark:border-white/10 dark:bg-white/5">
                            <p className="font-bold text-ink dark:text-white">Patient: {chat.message}</p>
                            <p className="mt-1 text-muted dark:text-white/60">{chat.response}</p>
                          </div>
                        ))
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
        </>
      )}
    </Page>
  );
}

const DOCTOR_RESOURCE_CATEGORIES = [
  { key: "gynaecology", label: "Gynaecologists" },
  { key: "obstetrics", label: "Obstetricians" },
  { key: "mental_health", label: "Mental Health Professionals" },
  { key: "maternity", label: "Maternity Centres" },
  { key: "hospital", label: "Hospitals" },
  { key: "diagnostic_lab", label: "Diagnostic Laboratories" },
  { key: "general", label: "General Practitioners" },
  { key: "emergency", label: "Emergency Facilities" },
];

function DoctorHerReachView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("gynaecology");
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
        setLocationError(err.code === err.PERMISSION_DENIED ? "Location permission denied. Please enter an area or PIN code." : "Could not determine location.");
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="space-y-6">
      {/* Professional Scope Notice */}
      <div className="rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 text-xs text-lavender-900 dark:border-lavender-800/40 dark:bg-lavender-950/40 dark:text-lavender-200">
        <span className="font-black text-ink dark:text-white">Clinical Guidance Notice:</span> This resource finder enables clinicians to discover nearby specialized facilities and diagnostic partners for patient referral discussions. It does not automate clinical appointments, formal referral exchanges, or electronic medical record handovers. Facilities are verified via map providers without independent clinical endorsement.
      </div>

      <Card className="border-lavender-100 bg-white/90 p-5 shadow-soft dark:border-white/10 dark:bg-card">
        <SectionHeader
          title="Healthcare Resource Finder"
          subtitle="Discover nearby specialists, diagnostic labs, hospitals, and emergency casualty units"
        />

        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="doctor-search-resource-input"
                type="text"
                placeholder="Search facility name, clinic, or diagnostic centre..."
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
                id="doctor-search-area-input"
                type="text"
                placeholder="Area, city, or PIN code (e.g. Indiranagar, 560038)"
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
                id="doctor-locate-btn"
                type="button"
                variant="secondary"
                className="gap-1.5"
                onClick={handleGetLocation}
              >
                <LocateFixed className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Near Me</span>
              </Button>
              <Button
                id="doctor-search-submit-btn"
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

          {/* Professional Category Tabs */}
          <div className="flex flex-wrap gap-2 pt-1">
            {DOCTOR_RESOURCE_CATEGORIES.map((cat) => {
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

      {/* Provider Status / Fallback */}
      {!isLiveProvider && hasSearched && (
        <Card className="border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
              <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                Live Maps Provider Status
              </p>
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                {providerStatus || "Live Google Places API is unconfigured in this environment. In adherence to clinical data integrity, synthetic facility records are never generated."}
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

      {/* Facility Search Results */}
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
          title="No resources found"
          text="Try broadening your search query or choosing another clinical category."
        />
      ) : null}

      {/* Verified 24/7 Helplines */}
      {helplines.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            title="Verified 24/7 National Emergency & Health Helplines"
            subtitle="Immediate clinical tele-guidance and emergency hospital dispatch"
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
