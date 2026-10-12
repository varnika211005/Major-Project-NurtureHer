import { Download, FileSpreadsheet, FileText, Filter, Search, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ReportItem } from "@/lib/api";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/useLanguage";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { EmptyState, LoadingSkeleton } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { exportReportsToCsv, printOrSaveClinicalReport } from "@/lib/reportPdf";

export function ReportsZone() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReportModal, setActiveReportModal] = useState<ReportItem | null>(null);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const res = await api.reports();
        setReports(res.reports);
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    }
    void loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesType =
        selectedType === "all" ||
        (selectedType === "pcos" && report.type.toLowerCase().includes("pcos")) ||
        (selectedType === "ppd" && report.type.toLowerCase().includes("ppd"));
      const matchesSearch =
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.risk_level.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.score.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [reports, selectedType, searchQuery]);

  function handleDownloadReport(report: ReportItem) {
    printOrSaveClinicalReport({
      reportTitle: report.title,
      reportType: report.type.includes("PCOS") ? "PCOS Screening" : "PPD Screening",
      patientName: user?.name || "Patient",
      dateGenerated: report.date,
      primaryMetric: {
        label: report.type,
        value: report.score,
        riskCategory: report.risk_level,
      },
      contributingFactors: report.type.includes("PCOS")
        ? [
            { label: "Screening Probability", value: report.score, note: "Calibrated screening risk index" },
            { label: "Assessed Risk Level", value: report.risk_level.toUpperCase(), note: "Indication requiring clinical follow-up" },
          ]
        : [
            { label: "EPDS Numerical Score", value: report.score, note: "Validated 10-question scale" },
            { label: "Sentiment Lexicon", value: report.sentiment || "Neutral", note: "Journal text emotional indicator" },
          ],
      clinicalRecommendations: [
        report.recommendations || "Discuss findings with your healthcare provider or ASHA worker.",
        "Maintain routine hydration and follow-up clinical visits.",
        "This is an educational screening indication and not a confirmed medical diagnosis.",
      ],
      doctorQuestions: [
        "What clinical lab tests or ultrasound examinations are recommended next?",
        "Should I make dietary or activity adjustments to manage these risk indications?",
      ],
    });
  }

  function getRiskBadge(risk: string) {
    const r = risk.toLowerCase();
    if (r === "high") {
      return <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">HIGH RISK</span>;
    }
    if (r === "moderate") {
      return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">MODERATE RISK</span>;
    }
    return <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">LOW RISK</span>;
  }

  return (
    <Page
      title="Clinical Reports Zone"
      subtitle="Access, inspect, and download validated screening reports and doctor-visit briefs"
    >
      {/* Overview Banner */}
      <div className="mb-6 rounded-[24px] border border-lavender-200/80 bg-gradient-to-br from-lavender-100/90 via-white to-lavender-50/70 p-6 shadow-soft dark:border-white/10 dark:from-white/10 dark:to-white/5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
                <FileText className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-black text-ink dark:text-white">Medical & Screening Records</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted dark:text-white/60">
              Download clinical PDF reports for your doctor consultations or export data as CSV. All records feature transparent risk indicators, contributing factors, and clinical safety disclaimers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => exportReportsToCsv(filteredReports as unknown as Array<Record<string, unknown>>)}
              disabled={filteredReports.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center text-xs font-black uppercase tracking-wider text-muted">
              <Filter className="mr-1 h-3.5 w-3.5" /> Type:
            </span>
            <button
              type="button"
              onClick={() => setSelectedType("all")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                selectedType === "all"
                  ? "bg-primary text-white shadow-glow"
                  : "bg-lavender-100/70 text-ink hover:bg-lavender-200/60 dark:bg-white/10 dark:text-white"
              }`}
            >
              All Reports ({reports.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("pcos")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                selectedType === "pcos"
                  ? "bg-primary text-white shadow-glow"
                  : "bg-lavender-100/70 text-ink hover:bg-lavender-200/60 dark:bg-white/10 dark:text-white"
              }`}
            >
              PCOS Assessments
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("ppd")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                selectedType === "ppd"
                  ? "bg-primary text-white shadow-glow"
                  : "bg-lavender-100/70 text-ink hover:bg-lavender-200/60 dark:bg-white/10 dark:text-white"
              }`}
            >
              PPD Screenings
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Reports List */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredReports.length === 0 ? (
        <EmptyState
          title="No Reports Found"
          text="Complete a PCOS or Postpartum Depression screening in the Clinical Tools section to generate your first verified clinical report."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredReports.map((report) => (
            <Card key={report.id} className="relative overflow-hidden transition-all hover:shadow-glow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lavender-100 text-primary dark:bg-white/10">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <Badge className="mb-1">{report.type}</Badge>
                    <h3 className="font-black text-ink dark:text-white">{report.title}</h3>
                    <p className="text-xs text-muted dark:text-white/50">{report.date}</p>
                  </div>
                </div>
                {getRiskBadge(report.risk_level)}
              </div>

              <div className="mt-4 rounded-2xl bg-lavender-50/70 p-3.5 dark:bg-white/5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Assessment Result</p>
                <p className="mt-0.5 text-base font-black text-ink dark:text-white">{report.score}</p>
                {report.recommendations && (
                  <p className="mt-2 text-xs leading-5 text-muted dark:text-white/65">
                    {report.recommendations}
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-lavender-100 pt-4 dark:border-white/10">
                <span className="text-xs font-semibold text-muted">Status: {report.status}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="h-9 px-3 text-xs"
                    onClick={() => setActiveReportModal(report)}
                  >
                    View Details
                  </Button>
                  <Button
                    className="h-9 px-3 text-xs"
                    onClick={() => handleDownloadReport(report)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-lavender-200 bg-white p-6 shadow-glow dark:border-white/10 dark:bg-[#241627]">
            <div className="flex items-start justify-between">
              <div>
                <Badge>{activeReportModal.type}</Badge>
                <h2 className="mt-2 text-xl font-black text-ink dark:text-white">{activeReportModal.title}</h2>
                <p className="text-xs text-muted">{activeReportModal.date}</p>
              </div>
              {getRiskBadge(activeReportModal.risk_level)}
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-lavender-50 p-4 dark:bg-white/5">
                <p className="text-xs font-bold uppercase text-muted">Screening Result Metric</p>
                <p className="text-2xl font-black text-ink dark:text-white">{activeReportModal.score}</p>
              </div>

              <div className="rounded-2xl border border-lavender-200/80 p-4 dark:border-white/10">
                <p className="text-xs font-bold uppercase text-muted">Clinical Recommendations</p>
                <p className="mt-1 text-sm leading-6 text-ink dark:text-white/80">
                  {activeReportModal.recommendations || "Consult with a doctor or certified healthcare specialist for clinical assessment."}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <ShieldAlert className="h-4 w-4" />
                  <p className="text-xs font-black">Educational Screening Notice</p>
                </div>
                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
                  This report is an AI-assisted screening assessment. It does not replace clinical consultation, lab testing, or medical diagnosis.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setActiveReportModal(null)}>
                Close
              </Button>
              <Button onClick={() => {
                handleDownloadReport(activeReportModal);
                setActiveReportModal(null);
              }}>
                <Download className="mr-1.5 h-4 w-4" /> Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
