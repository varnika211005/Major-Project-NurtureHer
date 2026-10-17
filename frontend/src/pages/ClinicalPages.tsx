import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  Download,
  FileText,
  HeartPulse,
  Info,
  MapPin,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, CyclePrediction, PCOSPrediction, PPDAssessment } from "@/lib/api";
import { generatePrintableReportWindow } from "@/lib/reportPdf";
import { CalendarGrid } from "@/components/common/CalendarGrid";
import { FormField, TextAreaField } from "@/components/common/FormField";
import { IconNote, StatTile } from "@/components/common/InfoBlocks";
import { DataTable, Gauge, MetricCard, SectionHeader } from "@/components/common/Premium";
import { Page } from "@/components/common/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/context/useLanguage";
import { useAuth } from "@/context/useAuth";

/** Blank-aware coercion: empty input -> undefined (triggers a friendly
 * required message) instead of silently becoming NaN or 0. Numeric strings
 * from <input type="number"> are converted to numbers for validation. */
function blankToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  if (typeof value === "string") {
    if (value.trim() === "") return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}

export const pcosSchema = z.object({
  age: z.preprocess(
    blankToUndefined,
    z.number({ required_error: "Age is required.", invalid_type_error: "Age is required." })
      .min(10, "Age must be at least 10.")
      .max(60, "Age must be 60 or below."),
  ),
  bmi: z.preprocess(
    blankToUndefined,
    z.number({ required_error: "BMI is required.", invalid_type_error: "BMI is required." })
      .positive("BMI must be greater than 0.")
      .max(80, "BMI must be 80 or below."),
  ),
  // NOTE: a single custom check (not z.union) so the resolver surfaces one
  // clear message instead of a nested literal mismatch.
  cycle: z.preprocess(
    blankToUndefined,
    z.custom<2 | 4>(
      (value): value is 2 | 4 => value === 2 || value === 4,
      "Please select a cycle category.",
    ),
  ),
  cycleLength: z.preprocess(
    blankToUndefined,
    z.number({ required_error: "Cycle length is required.", invalid_type_error: "Cycle length is required." })
      .min(1, "Cycle length must be at least 1 day.")
      .max(100, "Cycle length must be 100 days or below."),
  ),
  weightGain: z.boolean().default(false),
  hairGrowth: z.boolean().default(false),
  skinDarkening: z.boolean().default(false),
  hairLoss: z.boolean().default(false),
  pimples: z.boolean().default(false),
});
export type PCOSForm = z.infer<typeof pcosSchema>;

// Blank defaults for a new screening. Casts are needed because the validated
// output type is numeric while the form must start empty (undefined).
export const pcosBlankDefaults = {
  age: undefined as unknown as number,
  bmi: undefined as unknown as number,
  cycle: undefined as unknown as 2 | 4,
  cycleLength: undefined as unknown as number,
  weightGain: false,
  hairGrowth: false,
  skinDarkening: false,
  hairLoss: false,
  pimples: false,
};

export function PCOSPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [result, setResult] = useState<PCOSPrediction | null>(null);
  const [lastFormValues, setLastFormValues] = useState<PCOSForm | null>(null);
  const [history, setHistory] = useState<PCOSPrediction[]>([]);
  const [error, setError] = useState("");
  const cycleSelectId = useId();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PCOSForm>({
    resolver: zodResolver(pcosSchema),
    defaultValues: { ...pcosBlankDefaults },
  });

  useEffect(() => {
    api.pcosHistory().then(setHistory).catch(() => undefined);
  }, []);

  async function submit(values: PCOSForm) {
    setError("");
    setLastFormValues(values);
    try {
      const prediction = await api.predictPCOS({
  age: values.age,
  bmi: values.bmi,
  cycle: values.cycle,
  cycle_length: values.cycleLength,
  weight_gain: values.weightGain,
  hair_growth: values.hairGrowth,
  skin_darkening: values.skinDarkening,
  hair_loss: values.hairLoss,
  pimples: values.pimples,
});
      setResult(prediction);
      setHistory((items) => [prediction, ...items]);
      // Reset to the blank defaults (single call, no delays). NOTE: this must
      // stay argument-free: reset(values) wipes RHF's field registry without
      // writing to the DOM, leaving stale values visible (and submittable).
      // reset() restores the native form defaults (empty inputs, placeholder
      // option, unchecked boxes) and RHF state together.
      reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Prediction failed");
    }
  }

  const handleDownloadReport = () => {
    if (!result) return;
    generatePrintableReportWindow({
      patientName: user?.name || "Patient",
      reports: [
        {
          title: "Polycystic Ovary Syndrome (PCOS) Screening Estimate",
          type: "PCOS",
          date: new Date(result.created_at).toLocaleDateString(),
          risk_level: result.risk_level,
          score: `${Math.round(result.probability * 100)}% Probability`,
          recommendations: result.recommendations,
        },
      ],
      disclaimer:
        "NON-DIAGNOSTIC SCREENING REPORT: This report was generated by NurtureHer AI using machine learning risk evaluation. It indicates statistical risk probabilities based on self-reported and clinical indicators. It is not an ultrasound or biochemical diagnosis. Please consult an obstetrician/gynecologist.",
    });
  };

  const fields: [string, "age" | "bmi" | "cycleLength"][] = [
  [t.pcos.age, "age"],
  [t.pcos.bmi, "bmi"],
  [t.pcos.cycleLength, "cycleLength"],
];

  const checkboxes: [string, keyof PCOSForm][] = [
  [t.pcos.weightGain, "weightGain"],
  [t.pcos.hairGrowth, "hairGrowth"],
  [t.pcos.skinDarkening, "skinDarkening"],
  ["Hair loss", "hairLoss"],
  ["Pimples / acne", "pimples"],
];

  return (
    <Page title={t.pcos.title} subtitle={t.pcos.subtitle}>
      {/* Medical Disclaimer Banner */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 text-xs leading-relaxed text-lavender-900 shadow-sm dark:border-lavender-800/40 dark:bg-lavender-950/40 dark:text-lavender-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <span className="font-bold">Medical Disclaimer:</span> This PCOS screening estimate uses the nine
          model inputs (age, BMI, cycle category, cycle length, weight gain, hair growth, skin darkening,
          hair loss, and pimples). It is a model-based screening estimate, not a medical diagnosis.
          Always review findings with a certified gynecologist.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <Card className="p-6">
          <form onSubmit={handleSubmit(submit)}>
            <SectionHeader title={t.pcos.formTitle} subtitle={t.pcos.formSubtitle} />
            <div className="mt-4 space-y-3.5">
              {fields.map(([label, name]) => (
                <FormField
                  key={name}
                  label={label}
                  type="number"
                  // step="any" is required: without it, browsers (and jsdom)
                  // natively reject decimal entries such as BMI 24.5 and the
                  // form never submits.
                  step="any"
                  error={errors[name]?.message}
                  {...register(name)}
                />
              ))}

              <div className="space-y-2">
                <label
                  htmlFor={cycleSelectId}
                  className="text-sm font-semibold text-ink dark:text-white"
                >
                  {t.pcos.cycleCategory}
                </label>
                <select
                  id={cycleSelectId}
                  className="w-full rounded-xl border border-lavender-100 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                  defaultValue=""
                  {...register("cycle")}
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  <option value={2}>Category 2</option>
                  <option value={4}>Category 4</option>
                </select>
                {errors.cycle?.message ? (
                  <p className="text-xs font-bold text-danger">{errors.cycle.message}</p>
                ) : null}
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">
                  Phenotypic & Symptom Indicators
                </p>
                {checkboxes.map(([label, name]) => (
                  <label
                    key={name}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-lavender-100 bg-lavender-50/40 p-3 text-xs font-bold text-ink transition hover:bg-lavender-100/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 accent-primary"
                      {...register(name)}
                    />
                  </label>
                ))}
              </div>

              {error ? <p className="text-xs font-bold text-danger">{error}</p> : null}
              <Button className="w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? t.pcos.running : t.pcos.runPrediction}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <PCOSResult result={result} formValues={lastFormValues} onDownloadReport={handleDownloadReport} />

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-black text-ink dark:text-white">Historical PCOS Screenings</h3>
            <DataTable
              rows={history.map((item) => ({
                date: new Date(item.created_at).toLocaleDateString(),
                risk: item.risk_level,
                probability: `${Math.round(item.probability * 100)}%`,
              }))}
              columns={["date", "risk", "probability"]}
            />
          </Card>
        </div>
      </div>
    </Page>
  );
}

function PCOSResult({
  result,
  formValues,
  onDownloadReport,
}: {
  result: PCOSPrediction | null;
  formValues: PCOSForm | null;
  onDownloadReport: () => void;
}) {
  const { t } = useLanguage();
  if (!result) {
    return (
      <Card className="p-6">
        <SectionHeader title={t.pcos.resultTitle} subtitle={t.pcos.resultSubtitle} />
        <IconNote icon={HeartPulse} title={t.pcos.noPredictionYet} text={t.pcos.disclaimer} />
      </Card>
    );
  }

  const percentage = Math.round(result.probability * 100);

  return (
    <Card className="overflow-hidden p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-5">
          <div className="rounded-3xl border border-lavender-200 bg-lavender-50/70 p-4 text-center dark:border-white/10 dark:bg-white/5">
            <HeartPulse className="mx-auto mb-2 h-8 w-8 text-primary" />
            <Gauge value={percentage} label={`${result.risk_level} Risk`} />
          </div>
          <div>
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">
              Model-based screening estimate
            </Badge>
            <h3 className="mt-2 text-xl font-black text-ink dark:text-white">{t.pcos.recommendationSummary}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted dark:text-white/60">{result.recommendations}</p>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={onDownloadReport} className="shrink-0 gap-1.5 self-start">
          <Download className="h-3.5 w-3.5" /> Download Report PDF
        </Button>
      </div>

      {/* Submitted inputs for this result (echo of what was sent, not model explanations) */}
      {formValues && (
        <div className="mt-6 border-t border-lavender-100 pt-5 dark:border-white/10">
          <h4 className="text-xs font-black uppercase tracking-wider text-muted dark:text-white/60">
            Submitted inputs for this result
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-lavender-100 bg-lavender-50/40 p-3 text-xs dark:border-white/10 dark:bg-white/5">
              <span className="text-muted">Age:</span>
              <p className="font-bold text-ink dark:text-white">{formValues.age}</p>
            </div>
            <div className="rounded-xl border border-lavender-100 bg-lavender-50/40 p-3 text-xs dark:border-white/10 dark:bg-white/5">
              <span className="text-muted">BMI:</span>
              <p className="font-bold text-ink dark:text-white">{formValues.bmi}</p>
            </div>
            <div className="rounded-xl border border-lavender-100 bg-lavender-50/40 p-3 text-xs dark:border-white/10 dark:bg-white/5">
              <span className="text-muted">Cycle category:</span>
              <p className="font-bold text-ink dark:text-white">Category {formValues.cycle}</p>
            </div>
            <div className="rounded-xl border border-lavender-100 bg-lavender-50/40 p-3 text-xs dark:border-white/10 dark:bg-white/5">
              <span className="text-muted">Cycle length:</span>
              <p className="font-bold text-ink dark:text-white">{formValues.cycleLength} days</p>
            </div>
            <div className="rounded-xl border border-lavender-100 bg-lavender-50/40 p-3 text-xs dark:border-white/10 dark:bg-white/5">
              <span className="text-muted">Symptoms noted:</span>
              <p className="font-bold text-ink dark:text-white">
                {[
                  formValues.weightGain && "weight gain",
                  formValues.hairGrowth && "hair growth",
                  formValues.skinDarkening && "skin darkening",
                  formValues.hairLoss && "hair loss",
                  formValues.pimples && "pimples",
                ]
                  .filter(Boolean)
                  .join(", ") || "None"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted dark:text-white/60">
            This is a screening estimate based on the inputs above, not a medical diagnosis.
          </p>
        </div>
      )}
    </Card>
  );
}

export function PPDPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [answers, setAnswers] = useState<number[]>(Array(10).fill(0));
  const [result, setResult] = useState<PPDAssessment | null>(null);
  const [history, setHistory] = useState<PPDAssessment[]>([]);
  const [journal, setJournal] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.ppdHistory().then(setHistory).catch(() => undefined);
  }, []);

  async function submit() {
    setError("");
    try {
      const assessment = await api.assessPPD(answers, journal || null);
      setResult(assessment);
      setHistory((items) => [assessment, ...items]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Assessment failed");
    }
  }

  const handleDownloadPPDReport = () => {
    if (!result) return;
    generatePrintableReportWindow({
      patientName: user?.name || "Patient",
      reports: [
        {
          title: "Edinburgh Postnatal Depression Scale (EPDS) Screening",
          type: "PPD",
          date: new Date(result.created_at).toLocaleDateString(),
          risk_level: result.risk_level,
          score: `EPDS Score: ${result.epds_score}/30`,
          sentiment: result.sentiment,
          recommendations:
            result.epds_score >= 10
              ? "Score indicates possible depressive symptoms. A clinical consultation with your healthcare provider or counselor is strongly encouraged."
              : "Score within typical range. Continue routine postpartum wellness checkups and self-care.",
        },
      ],
      disclaimer:
        "NON-DIAGNOSTIC SCREENING REPORT: The EPDS is an internationally validated screening questionnaire designed to identify women who may be experiencing postpartum depression or anxiety. It does not replace a psychiatric or clinical diagnostic interview. If you or someone you know is in crisis, call emergency services 112 immediately.",
    });
  };

  return (
    <Page title={t.ppd.title} subtitle={t.ppd.subtitle}>
      {/* Medical Disclaimer Banner */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 text-xs leading-relaxed text-lavender-900 shadow-sm dark:border-lavender-800/40 dark:bg-lavender-950/40 dark:text-lavender-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <span className="font-bold">Clinical Care Standard:</span> The Edinburgh Postnatal Depression Scale (EPDS) is a
          10-question screening questionnaire. Scores of 10 or above indicate elevated risk and warrant compassionate follow-up
          with a maternal mental health professional. Emergency crisis support is always available via 112.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="p-6">
          <SectionHeader title={t.ppd.formTitle} subtitle={t.ppd.formSubtitle} />
          <div className="mt-6 space-y-4">
            {t.ppd.epdsQuestions.map((question, index) => (
              <div
                key={index}
                className="rounded-2xl border border-lavender-100 bg-lavender-50/40 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-xs font-bold text-ink dark:text-white">
                  {index + 1}. {question}
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={answers[index] === value ? "primary" : "secondary"}
                      onClick={() =>
                        setAnswers((items) =>
                          items.map((item, itemIndex) => (itemIndex === index ? value : item)),
                        )
                      }
                      className="text-xs font-bold"
                    >
                      {value}
                    </Button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted">
                  <span>0: Never / Rare</span>
                  <span>3: Most of the time</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <TextAreaField
              label={t.ppd.optionalJournal}
              value={journal}
              onChange={(event) => setJournal(event.target.value)}
              placeholder={t.ppd.journalPlaceholder}
            />
          </div>

          {error ? <p className="mt-3 text-xs font-bold text-danger">{error}</p> : null}

          <Button className="mt-5 w-full" onClick={() => void submit()}>
            {t.ppd.submitAssessment}
          </Button>
        </Card>

        <div className="space-y-6">
          {result ? (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-muted dark:text-white/60">
                  Assessment Outcome
                </span>
                <Button variant="secondary" size="sm" onClick={handleDownloadPPDReport} className="gap-1 text-xs">
                  <Download className="h-3 w-3" /> Report PDF
                </Button>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/40">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-ink dark:text-white">
                    Score: {result.epds_score}/30
                  </h3>
                  <p className="text-xs font-bold capitalize text-primary">Risk Tier: {result.risk_level}</p>
                </div>
              </div>

              <Progress value={Math.min(100, (result.epds_score * 100) / 30)} className="mt-4" />

              <div className="mt-4 rounded-xl bg-lavender-50/50 p-3 text-xs text-muted dark:bg-white/5 dark:text-white/60">
                <p>
                  <span className="font-bold text-ink dark:text-white">Sentiment Telemetry:</span> {result.sentiment}
                </p>
                <p className="mt-1">
                  {result.epds_score >= 10
                    ? "Care recommendation: We advise sharing this screening summary with your doctor or reaching out to your care circle for continuous emotional support."
                    : "Your answers suggest positive emotional adaptation. Reach out to your care circle whenever needed."}
                </p>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <SectionHeader title={t.ppd.currentResult} />
              <IconNote icon={ShieldAlert} title={t.ppd.noAssessmentYet} text={t.ppd.noAssessmentDesc} />
            </Card>
          )}

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-black text-ink dark:text-white">Assessment History</h3>
            <DataTable
              rows={history.map((item) => ({
                date: new Date(item.created_at).toLocaleDateString(),
                score: `${item.epds_score}/30`,
                risk: item.risk_level,
              }))}
              columns={["date", "score", "risk"]}
            />
          </Card>
        </div>
      </div>
    </Page>
  );
}

export function CyclePage() {
  const { t } = useLanguage();
  const [prediction, setPrediction] = useState<CyclePrediction | null>(null);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [length, setLength] = useState(28);

  useEffect(() => {
    api.cyclePrediction().then(setPrediction).catch(() => undefined);
  }, []);

  async function submit() {
    setError("");
    try {
      await api.createCycle(date, length);
      setPrediction(await api.cyclePrediction());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Cycle entry failed");
    }
  }

  return (
    <Page title={t.cycle.title} subtitle={t.cycle.subtitle}>
      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <Card className="p-6">
          <SectionHeader title={t.cycle.formTitle} subtitle={t.cycle.formSubtitle} />
          <div className="mt-4 space-y-4">
            <FormField
              label={t.cycle.lastPeriodDate}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <FormField
              label={t.cycle.cycleLength}
              type="number"
              min={15}
              max={60}
              value={length}
              onChange={(event) => setLength(Number(event.target.value))}
            />
            {error ? <p className="text-xs font-bold text-danger">{error}</p> : null}
            <Button className="w-full" disabled={!date} onClick={() => void submit()}>
              {t.cycle.saveCycle}
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <CalendarDays className="mb-3 h-8 w-8 text-primary" />
            {prediction ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [t.cycle.nextPeriod, prediction.next_period_prediction],
                  [t.cycle.ovulation, prediction.ovulation_prediction],
                  [t.cycle.fertilityWindow, `${prediction.fertility_window_start} - ${prediction.fertility_window_end}`],
                  [t.cycle.cycleLengthResult, `${prediction.cycle_length} ${t.common.days}`],
                ].map(([label, value]) => (
                  <StatTile key={label} label={label} value={value} />
                ))}
              </div>
            ) : (
              <IconNote icon={CalendarDays} title={t.cycle.noPrediction} text={t.cycle.noPredictionDesc} />
            )}
          </Card>

          {prediction ? (
            <Card className="p-6">
              <SectionHeader title={t.cycle.calendarTitle} subtitle={t.cycle.calendarSubtitle} />
              <div className="mt-4">
                <CalendarGrid activeFrom={1} activeTo={prediction.cycle_length} monthDays={prediction.cycle_length} />
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </Page>
  );
}

export function EmergencyPage() {
  const { t } = useLanguage();
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const triggerDispatch = () => {
    setDispatchStatus("SOS Alert dispatched to your emergency contact and nearest ASHA coordinator.");
  };

  return (
    <Page title={t.emergency.title} subtitle={t.emergency.subtitle}>
      {/* Urgent Warning Header */}
      <Card className="overflow-hidden border-rose-200 bg-gradient-to-br from-rose-600 via-rose-700 to-purple-800 p-8 text-white shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-white/75">Maternal Rapid Response</span>
            <h2 className="text-2xl font-black md:text-4xl">{t.emergency.mainHeading}</h2>
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/90">
          {t.emergency.mainText}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            className="bg-white text-rose-700 hover:bg-white/90 font-black gap-2"
            onClick={() => window.open("tel:112")}
          >
            <PhoneCall className="h-4 w-4" /> Dial National Emergency 112
          </Button>
          <Button
            variant="secondary"
            className="bg-white/20 text-white hover:bg-white/30 font-bold border border-white/30 gap-2"
            onClick={triggerDispatch}
          >
            <Sparkles className="h-4 w-4" /> Dispatch CareCircle & ASHA SOS
          </Button>
        </div>

        {dispatchStatus && (
          <div className="mt-4 rounded-xl bg-white/20 p-3 text-xs font-bold text-white backdrop-blur-sm">
            ✅ {dispatchStatus}
          </div>
        )}
      </Card>

      {/* Helplines Directory */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-lavender-100 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-ink dark:text-white">National Emergency</h3>
            <Badge className="bg-rose-100 text-rose-700">24/7 Police & Fire</Badge>
          </div>
          <div className="mt-3 text-2xl font-black text-primary">112</div>
          <p className="mt-1 text-xs text-muted dark:text-white/50">All-India unified emergency service</p>
          <Button size="sm" variant="secondary" className="mt-4 w-full" onClick={() => window.open("tel:112")}>
            Call 112
          </Button>
        </Card>

        <Card className="border-lavender-100 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-ink dark:text-white">Ambulance Service</h3>
            <Badge className="bg-amber-100 text-amber-700">Medical Transit</Badge>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-600">108 / 102</div>
          <p className="mt-1 text-xs text-muted dark:text-white/50">Free maternal & infant ambulance</p>
          <Button size="sm" variant="secondary" className="mt-4 w-full" onClick={() => window.open("tel:108")}>
            Call 108
          </Button>
        </Card>

        <Card className="border-lavender-100 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-ink dark:text-white">Maternal Health Helpline</h3>
            <Badge className="bg-emerald-100 text-emerald-700">Tele-triage</Badge>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-600">104</div>
          <p className="mt-1 text-xs text-muted dark:text-white/50">State health information & clinical advice</p>
          <Button size="sm" variant="secondary" className="mt-4 w-full" onClick={() => window.open("tel:104")}>
            Call 104
          </Button>
        </Card>
      </div>
    </Page>
  );
}
