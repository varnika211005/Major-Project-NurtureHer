import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Apple,
  Check,
  ClipboardList,
  Droplets,
  Heart,
  Plus,
  Save,
  ShieldCheck,
  Utensils,
} from "lucide-react";
import { api, CareCircleConnectionItem, CaregiverNutritionData, DoctorNutritionData, NutritionCarePlan, NutritionDraftPayload, NutritionMeal, NutritionPreferences, NutritionSuggestion } from "@/lib/api";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/useLanguage";
import { Page } from "@/components/common/Page";
import { EmptyState, LoadingSkeleton } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

type MotherHydration = { cups: number; target_cups: number; percent: number };
type MealEditor = {
  name: string;
  meal_type: string;
  ingredients: string;
  serving_size: string;
  preparation_instructions: string;
  preparation_minutes: string;
  substitutions: string;
  nutrition_facts: string;
  nutrition_source: string;
};

const EMPTY_MEAL: MealEditor = {
  name: "",
  meal_type: "breakfast",
  ingredients: "",
  serving_size: "",
  preparation_instructions: "",
  preparation_minutes: "",
  substitutions: "",
  nutrition_facts: "",
  nutrition_source: "",
};

const EMPTY_PREFERENCES: NutritionPreferences = {
  dietary_preferences: [],
  dietary_restrictions: [],
  allergies: [],
  breastfeeding: null,
};

function splitLines(value: string) {
  return value.split(/\r?\n/).map((part) => part.trim()).filter(Boolean);
}

function splitCommaList(value: string) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function listText(values: string[]) {
  return values.join(", ");
}

function sourceLabel(source: NutritionCarePlan["source"]) {
  if (source === "doctor_reviewed") return "Doctor-reviewed";
  if (source === "ai_generated") return "AI-generated suggestion — not doctor-reviewed";
  if (source === "doctor_authored") return "Doctor-authored draft — not active";
  return "General educational guidance";
}

export function NutritionPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (user?.role === "caregiver") return <CaregiverNutritionPage />;
  if (user?.role === "doctor" || user?.role === "admin") return <DoctorNutritionPage />;
  if (user?.role === "mother") return <MotherNutritionPage />;

  return (
    <Page title={t.nutrition.title} subtitle={t.nutrition.subtitle}>
      <EmptyState title="Nutrition unavailable" text="This account role cannot access nutrition information." />
    </Page>
  );
}

function MotherNutritionPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.myNutrition>> | null>(null);
  const [hydration, setHydration] = useState<MotherHydration | null>(null);
  const [myths, setMyths] = useState<Awaited<ReturnType<typeof api.healthMyths>>>([]);
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [updatingWater, setUpdatingWater] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<NutritionPreferences>(EMPTY_PREFERENCES);
  const [activeTab, setActiveTab] = useState<"today" | "hydration" | "myths">("today");

  async function loadNutrition() {
    setLoading(true);
    setError("");
    try {
      const [nutrition, water, healthMyths] = await Promise.all([
        api.myNutrition(),
        api.hydration(),
        api.healthMyths(),
      ]);
      setData(nutrition);
      setHydration(water);
      setMyths(healthMyths);
      setPreferences(nutrition.preferences);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nutrition information could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNutrition();
  }, []);

  async function savePreferences(event: FormEvent) {
    event.preventDefault();
    setSavingPreferences(true);
    setNotice("");
    setError("");
    try {
      const saved = await api.updateNutritionPreferences(preferences);
      setPreferences(saved);
      await loadNutrition();
      setNotice("Your nutrition preferences were saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Preferences could not be saved.");
    } finally {
      setSavingPreferences(false);
    }
  }

  async function updateSuggestion(suggestion: NutritionSuggestion, completed: boolean, saved: boolean) {
    setError("");
    try {
      const result = await api.updateNutritionInteraction(suggestion.key, completed, saved);
      setData((current) => current ? {
        ...current,
        interactions: { ...current.interactions, [result.recommendation_key]: { completed: result.completed, saved: result.saved } },
      } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your nutrition action could not be saved.");
    }
  }

  async function addWater() {
    if (!hydration) return;
    setUpdatingWater(true);
    setError("");
    try {
      setHydration(await api.updateHydration(hydration.cups + 1, hydration.target_cups));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Hydration could not be saved.");
    } finally {
      setUpdatingWater(false);
    }
  }

  async function resetWater() {
    if (!hydration) return;
    setUpdatingWater(true);
    setError("");
    try {
      setHydration(await api.updateHydration(0, hydration.target_cups));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Hydration could not be reset.");
    } finally {
      setUpdatingWater(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  const contextLabels = data ? [
    ...(data.context.pregnancy_stage ? [`Recorded stage: ${data.context.pregnancy_stage}`] : []),
    ...(data.context.postpartum ? ["Postpartum recovery context recorded"] : []),
    ...(data.context.breastfeeding === true ? ["Breastfeeding recorded"] : []),
    ...(data.context.pcos_screening_recorded ? ["PCOS screening recorded"] : []),
    ...(data.context.ppd_screening_recorded ? ["PPD screening recorded"] : []),
  ] : [];

  return (
    <Page title={t.nutrition.title} subtitle="Simple food and drink ideas for today, informed only by information you have recorded.">
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</p>}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-lavender-200 pb-3 dark:border-white/10">
        {([
          ["today", "Today's food ideas"],
          ["hydration", "Hydration"],
          ["myths", "Nutrition education"],
        ] as const).map(([tab, label]) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-2xl px-4 py-2.5 text-sm font-black ${activeTab === tab ? "bg-primary text-white shadow-glow" : "bg-white text-ink dark:bg-white/10 dark:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "today" && data && (
        <div className="space-y-5">
          <Card className="border-lavender-200 bg-lavender-50/70 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-ink dark:text-white">Your recorded nutrition context</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {contextLabels.length ? contextLabels.map((label) => <Badge key={label}>{label}</Badge>) : <span className="text-sm text-muted">No pregnancy, postpartum, or screening context is recorded. These are general ideas.</span>}
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => setShowPreferences((visible) => !visible)}>
                {showPreferences ? "Close preferences" : "Dietary preferences"}
              </Button>
            </div>
            {data.context.ppd_screening_recorded && (
              <p className="mt-3 text-xs text-muted">Food ideas are not treatment for postpartum depression; continue to use professional mental-health support when needed.</p>
            )}
            <ul className="mt-3 space-y-1 text-xs leading-5 text-muted">{data.context_guidance.map((item) => <li key={item}>• {item}</li>)}</ul>
            {showPreferences && (
              <form className="mt-4 grid gap-3 border-t border-lavender-200 pt-4 dark:border-white/10 md:grid-cols-2" onSubmit={(event) => void savePreferences(event)}>
                <label className="text-xs font-bold text-muted">Food preferences (comma-separated)<Input className="mt-1" value={listText(preferences.dietary_preferences)} onChange={(event) => setPreferences({ ...preferences, dietary_preferences: splitCommaList(event.target.value) })} /></label>
                <label className="text-xs font-bold text-muted">Dietary restrictions<Input className="mt-1" value={listText(preferences.dietary_restrictions)} onChange={(event) => setPreferences({ ...preferences, dietary_restrictions: splitCommaList(event.target.value) })} /></label>
                <label className="text-xs font-bold text-muted">Allergies<Input className="mt-1" value={listText(preferences.allergies)} onChange={(event) => setPreferences({ ...preferences, allergies: splitCommaList(event.target.value) })} /></label>
                <label className="text-xs font-bold text-muted">Breastfeeding status
                  <select className="mt-1 h-11 w-full rounded-2xl border border-lavender-200 bg-white px-3 text-sm text-ink dark:border-white/10 dark:bg-[#271b30] dark:text-white" value={preferences.breastfeeding === null ? "" : String(preferences.breastfeeding)} onChange={(event) => setPreferences({ ...preferences, breastfeeding: event.target.value === "" ? null : event.target.value === "true" })}>
                    <option value="">Not recorded</option><option value="true">Yes</option><option value="false">No</option>
                  </select>
                </label>
                <Button className="md:col-span-2 md:justify-self-start" type="submit" disabled={savingPreferences}><Save className="mr-2 h-4 w-4" />{savingPreferences ? "Saving…" : "Save preferences"}</Button>
              </form>
            )}
          </Card>

          {data.active_plan && (
            <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-black text-ink dark:text-white">Your active nutrition plan: {data.active_plan.title}</h2>
                <Badge>{sourceLabel(data.active_plan.source)}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">Version {data.active_plan.version}{data.active_plan.reviewed_at ? ` · Reviewed ${new Date(data.active_plan.reviewed_at).toLocaleDateString()}` : ""}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {data.active_plan.meals.map((meal, index) => <MealCard key={`${meal.name}-${index}`} meal={meal} simple />)}
              </div>
              {data.active_plan.preparation_guidance && <p className="mt-3 text-sm text-muted">{data.active_plan.preparation_guidance}</p>}
              {data.active_plan.clinician_note && <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-ink dark:bg-white/5 dark:text-white">{data.active_plan.clinician_note}</p>}
            </Card>
          )}

          <section>
            <div className="mb-3 flex items-center gap-2"><Utensils className="h-5 w-5 text-primary" /><h2 className="text-lg font-black text-ink dark:text-white">Today’s food and drink ideas</h2></div>
            {data.suggestions.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.suggestions.map((suggestion) => {
                  const interaction = data.interactions[suggestion.key] ?? { completed: false, saved: false };
                  return (
                    <Card key={suggestion.key}>
                      <div className="flex items-start gap-3">
                        <span className="rounded-xl bg-lavender-100 p-2 text-primary dark:bg-white/10"><Apple className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><Badge>{suggestion.meal_type}</Badge>{interaction.completed && <Badge>Completed</Badge>}</div>
                          <h3 className="mt-2 font-black text-ink dark:text-white">{suggestion.name}</h3>
                          <p className="mt-1 text-sm text-muted">{suggestion.reason}</p>
                          <p className="mt-2 text-xs font-semibold text-primary">Suggested portion: {suggestion.portion}</p>
                          <details className="mt-3 text-xs text-muted">
                            <summary className="cursor-pointer font-bold">View simple preparation</summary>
                            <p className="mt-2">Ingredients: {suggestion.ingredients.join(", ")}</p>
                            <ol className="mt-1 list-inside list-decimal">{suggestion.preparation_instructions.map((step) => <li key={step}>{step}</li>)}</ol>
                            <p className="mt-1">Substitutions: {suggestion.substitutions.join(" ")}</p>
                          </details>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant={interaction.completed ? "secondary" : "primary"} onClick={() => void updateSuggestion(suggestion, !interaction.completed, interaction.saved)}>
                              <Check className="mr-1 h-4 w-4" />{interaction.completed ? "Undo completed" : "Mark completed"}
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => void updateSuggestion(suggestion, interaction.completed, !interaction.saved)}>
                              <Heart className={`mr-1 h-4 w-4 ${interaction.saved ? "fill-current" : ""}`} />{interaction.saved ? "Saved" : "Save idea"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : <EmptyState title="No suggestions match these restrictions" text="Review your saved allergies and restrictions, or ask a qualified dietitian for suitable options." />}
          </section>
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">{data.disclaimer}</p>
        </div>
      )}

      {activeTab === "hydration" && hydration && (
        <Card className="mx-auto max-w-2xl text-center">
          <Droplets className="mx-auto h-10 w-10 text-sky-600" />
          <h2 className="mt-3 text-xl font-black text-ink dark:text-white">Your hydration log</h2>
          <p className="mt-1 text-sm text-muted">Track what you drink; follow any fluid guidance from your clinician.</p>
          <div className="my-5 flex justify-between text-sm font-bold"><span>{hydration.cups} / {hydration.target_cups} cups logged</span><span>{hydration.percent}%</span></div>
          <Progress value={hydration.percent} className="h-3" />
          <div className="mt-5 flex justify-center gap-3">
            <Button type="button" disabled={updatingWater} onClick={() => void addWater()}><Plus className="mr-2 h-4 w-4" />Log a cup</Button>
            <Button type="button" variant="secondary" disabled={updatingWater} onClick={() => void resetWater()}>Reset today</Button>
          </div>
        </Card>
      )}

      {activeTab === "myths" && (
        <div className="grid gap-4 md:grid-cols-2">
          {myths.map((myth) => <Card key={myth.id}><Badge>{myth.category}</Badge><h3 className="mt-2 font-black text-ink dark:text-white">{myth.myth}</h3><p className="mt-3 text-sm text-muted">{myth.fact}</p><p className="mt-3 text-xs font-bold text-primary">Source: {myth.verification_source}</p></Card>)}
        </div>
      )}
    </Page>
  );
}

function MealCard({ meal, simple = false }: { meal: NutritionMeal; simple?: boolean }) {
  return (
    <Card className="border-lavender-200/70 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-2"><Badge>{meal.meal_type}</Badge><h3 className="font-black text-ink dark:text-white">{meal.name}</h3></div>
      {meal.serving_size && <p className="mt-2 text-xs font-semibold text-primary">Serving: {meal.serving_size}</p>}
      <p className="mt-3 text-xs font-black uppercase text-muted">Ingredients</p>
      <ul className="mt-1 list-inside list-disc text-sm text-muted">{meal.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul>
      {!simple && (
        <>
          <p className="mt-3 text-xs font-black uppercase text-muted">Preparation</p>
          <ol className="mt-1 list-inside list-decimal text-sm text-muted">{meal.preparation_instructions.map((step) => <li key={step}>{step}</li>)}</ol>
          {meal.preparation_minutes !== null && <p className="mt-2 text-xs text-muted">Approx. {meal.preparation_minutes} minutes</p>}
          {meal.substitutions.length > 0 && <p className="mt-2 text-xs text-muted">Possible substitutions: {meal.substitutions.join("; ")}</p>}
        </>
      )}
      {meal.nutrition_facts.length > 0 && <div className="mt-3 rounded-xl bg-lavender-50 p-3 text-xs text-ink dark:bg-white/5 dark:text-white"><p className="font-bold">Clinician-entered nutrition information</p><p>{meal.nutrition_facts.join("; ")}</p><p className="mt-1 text-muted">Recorded source (not independently verified): {meal.nutrition_source}</p></div>}
      {meal.nutrition_facts.length === 0 && <p className="mt-3 text-[11px] text-muted">No verified nutrient values provided.</p>}
    </Card>
  );
}

function CaregiverNutritionPage() {
  const { t } = useLanguage();
  const [connections, setConnections] = useState<CareCircleConnectionItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState<CaregiverNutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.careCircleConnections().then((items) => {
      setConnections(items);
      const permitted = items.find((item) => item.permissions.nutrition);
      setSelectedId(permitted?.access_id ?? items[0]?.access_id ?? "");
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Connections could not be loaded.");
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const connection = connections.find((item) => item.access_id === selectedId);
    setData(null);
    if (!connection || !connection.permissions.nutrition) {
      setError(connection ? "Nutrition sharing is not enabled for this connection. Ask the mother to update her CareCircle sharing permissions." : "");
      return;
    }
    setLoading(true);
    setError("");
    void api.caregiverNutrition(connection.access_id).then(setData).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Authorized nutrition information could not be loaded.");
    }).finally(() => setLoading(false));
  }, [connections, selectedId]);

  if (loading && !connections.length) return <LoadingSkeleton />;
  return (
    <Page title={t.nutrition.title} subtitle="Detailed meal-preparation support for a mother who has explicitly enabled nutrition sharing.">
      {error && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{error}</p>}
      {connections.length > 0 && (
        <label className="mb-5 block max-w-xl text-sm font-bold text-muted">Mother connection
          <select className="mt-1 h-11 w-full rounded-2xl border border-lavender-200 bg-white px-3 text-ink dark:border-white/10 dark:bg-[#271b30] dark:text-white" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {connections.map((connection) => <option key={connection.access_id} value={connection.access_id}>{connection.mother_name}{connection.permissions.nutrition ? "" : " — nutrition not shared"}</option>)}
          </select>
        </label>
      )}
      {!connections.length && !loading && <EmptyState title="No CareCircle connection" text="Connect using the mother's CareCircle QR. Her approval and nutrition-sharing permission are required." />}
      {loading && connections.length > 0 && <LoadingSkeleton />}
      {data && !loading && (
        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /><h2 className="font-black text-ink dark:text-white">Authorized support for {data.mother_name}</h2></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.context.pregnancy_stage && <Badge>Recorded stage: {data.context.pregnancy_stage}</Badge>}
              {data.context.postpartum && <Badge>Postpartum context</Badge>}
              {data.context.breastfeeding === true && <Badge>Breastfeeding recorded</Badge>}
              {data.preferences.dietary_preferences.map((item) => <Badge key={item}>{item}</Badge>)}
              {data.preferences.dietary_restrictions.map((item) => <Badge key={item}>Restriction: {item}</Badge>)}
              {data.preferences.allergies.map((item) => <Badge key={item}>Allergy: {item}</Badge>)}
            </div>
            <ul className="mt-3 space-y-1 text-xs leading-5 text-muted">{data.context_guidance.map((item) => <li key={item}>• {item}</li>)}</ul>
          </Card>
          {data.active_plan ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black text-ink dark:text-white">Active plan · {data.active_plan.title}</h2><Badge>{sourceLabel(data.active_plan.source)}</Badge></div>
              <div className="grid gap-4 lg:grid-cols-2">{data.active_plan.meals.map((meal, index) => <MealCard key={`${meal.name}-${index}`} meal={meal} />)}</div>
              {data.active_plan.preparation_guidance && <Card><h3 className="font-black text-ink dark:text-white">Practical support</h3><p className="mt-2 text-sm leading-6 text-muted">{data.active_plan.preparation_guidance}</p></Card>}
              {data.active_plan.clinician_note && <Card><h3 className="font-black text-ink dark:text-white">Clinician note</h3><p className="mt-2 text-sm leading-6 text-muted">{data.active_plan.clinician_note}</p></Card>}
            </section>
          ) : (
            <Card><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /><h2 className="font-black text-ink dark:text-white">General meal ideas</h2></div><p className="mt-2 text-sm text-muted">No active patient-specific plan is available. These are general suggestions only; do not treat them as a clinician-reviewed plan.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{data.general_suggestions.map((suggestion) => <Card key={suggestion.key}><Badge>{suggestion.meal_type}</Badge><h3 className="mt-2 font-black text-ink dark:text-white">{suggestion.name}</h3><p className="mt-2 text-sm text-muted">Ingredients: {suggestion.ingredients.join(", ")}</p><ol className="mt-2 list-inside list-decimal text-sm text-muted">{suggestion.preparation_instructions.map((step) => <li key={step}>{step}</li>)}</ol><p className="mt-2 text-xs text-muted">{suggestion.portion}</p></Card>)}</div></Card>
          )}
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">{data.disclaimer} No verified nutrient values are available unless a source is explicitly shown.</p>
        </div>
      )}
    </Page>
  );
}

function DoctorNutritionPage() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [patientId, setPatientId] = useState("");
  const [data, setData] = useState<DoctorNutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [contexts, setContexts] = useState<string[]>([]);
  const [guidance, setGuidance] = useState("");
  const [clinicianNote, setClinicianNote] = useState("");
  const [meals, setMeals] = useState<MealEditor[]>([{ ...EMPTY_MEAL }]);

  async function loadPatients() {
    setLoading(true);
    setError("");
    try {
      const items = await api.doctorNutritionPatients();
      setPatients(items);
      setPatientId((current) => items.some((item) => item.id === current) ? current : items[0]?.id ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authorized patient list could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPatients(); }, []);

  async function loadPatientNutrition(id: string) {
    if (!id) {
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await api.doctorPatientNutrition(id));
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : "Patient nutrition data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPatientNutrition(patientId); }, [patientId]);

  function startDraft(plan?: NutritionCarePlan) {
    setEditingPlanId(plan?.id ?? null);
    setTitle(plan?.title ?? "");
    setContexts(plan?.applicable_context ?? []);
    setGuidance(plan?.preparation_guidance ?? "");
    setClinicianNote(plan?.clinician_note ?? "");
    setMeals(plan?.meals.length ? plan.meals.map((meal) => ({
      name: meal.name,
      meal_type: meal.meal_type,
      ingredients: meal.ingredients.join("\n"),
      serving_size: meal.serving_size ?? "",
      preparation_instructions: meal.preparation_instructions.join("\n"),
      preparation_minutes: meal.preparation_minutes === null ? "" : String(meal.preparation_minutes),
      substitutions: meal.substitutions.join("\n"),
      nutrition_facts: meal.nutrition_facts.join("\n"),
      nutrition_source: meal.nutrition_source ?? "",
    })) : [{ ...EMPTY_MEAL }]);
    document.getElementById("nutrition-plan-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function serializeMeals(): NutritionMeal[] | null {
    const serialized = meals.map((meal) => ({
      name: meal.name.trim(),
      meal_type: meal.meal_type.trim(),
      ingredients: splitLines(meal.ingredients),
      serving_size: meal.serving_size.trim() || null,
      preparation_instructions: splitLines(meal.preparation_instructions),
      preparation_minutes: meal.preparation_minutes.trim() ? Number(meal.preparation_minutes) : null,
      substitutions: splitLines(meal.substitutions),
      nutrition_facts: splitLines(meal.nutrition_facts),
      nutrition_source: meal.nutrition_source.trim() || null,
    }));
    if (serialized.some((meal) => !meal.name || meal.ingredients.length === 0 || meal.preparation_instructions.length === 0)) {
      setError("Each meal needs a name, ingredients, and preparation instructions.");
      return null;
    }
    if (serialized.some((meal) => meal.nutrition_facts.length > 0 && !meal.nutrition_source)) {
      setError("Add a reliable source for any nutrition facts, or remove those values.");
      return null;
    }
    return serialized;
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    if (!patientId || !title.trim()) return;
    const mealList = serializeMeals();
    if (!mealList) return;
    setSaving(true);
    setError("");
    setNotice("");
    const payload: NutritionDraftPayload = {
      title: title.trim(),
      applicable_context: contexts,
      meals: mealList,
      preparation_guidance: guidance.trim() || null,
      clinician_note: clinicianNote.trim() || null,
    };
    try {
      if (editingPlanId) await api.updateDoctorNutritionDraft(patientId, editingPlanId, payload);
      else await api.createDoctorNutritionDraft(patientId, payload);
      setNotice("Draft saved. It is not active or doctor-reviewed until you publish it.");
      setEditingPlanId(null);
      await loadPatientNutrition(patientId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Draft could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function publish(planId: string) {
    if (!patientId || !window.confirm("Publish this plan as doctor-reviewed and make it the patient's active nutrition plan?")) return;
    setError("");
    try {
      await api.publishDoctorNutritionPlan(patientId, planId);
      setNotice("Plan published as doctor-reviewed.");
      await loadPatientNutrition(patientId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Plan could not be published.");
    }
  }

  async function discontinue(planId: string) {
    if (!patientId || !window.confirm("Discontinue this active nutrition plan?")) return;
    setError("");
    try {
      await api.discontinueDoctorNutritionPlan(patientId, planId);
      setNotice("Plan discontinued.");
      await loadPatientNutrition(patientId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Plan could not be discontinued.");
    }
  }

  const selectedPatient = useMemo(() => data?.patient, [data]);
  if (loading && !data && !patients.length) return <LoadingSkeleton />;

  return (
    <Page title={t.nutrition.title} subtitle="Clinical nutrition review and patient-specific care planning for explicitly authorized patients.">
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</p>}
      {patients.length > 0 && <label className="mb-5 block max-w-xl text-sm font-bold text-muted">Authorized patient
        <select className="mt-1 h-11 w-full rounded-2xl border border-lavender-200 bg-white px-3 text-ink dark:border-white/10 dark:bg-[#271b30] dark:text-white" value={patientId} onChange={(event) => { setPatientId(event.target.value); setEditingPlanId(null); }}><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select>
      </label>}
      {loading && patients.length > 0 && <LoadingSkeleton />}
      {!loading && !patients.length && <EmptyState title="No authorized nutrition patients" text="Only mothers who have an approved doctor connection and enabled nutrition sharing are listed." />}
      {data && !loading && selectedPatient && (
        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="font-black text-ink dark:text-white">Nutrition context · {selectedPatient.name}</h2></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ContextItem label="Age" value={selectedPatient.age === null ? "Not recorded" : String(selectedPatient.age)} />
              <ContextItem label="Pregnancy stage" value={selectedPatient.pregnancy_stage || "Not recorded"} />
              <ContextItem label="Postpartum" value={selectedPatient.postpartum ? "Recorded" : "Not recorded"} />
              <ContextItem label="Breastfeeding" value={selectedPatient.breastfeeding === null ? "Not recorded" : selectedPatient.breastfeeding ? "Yes" : "No"} />
              <ContextItem label="PCOS screening" value={selectedPatient.pcos_screening ?? "Not recorded"} />
              <ContextItem label="PPD screening" value={selectedPatient.ppd_screening ?? "Not recorded"} />
            </div>
            <p className="mt-3 text-xs text-muted">These are recorded screening/context fields, not diagnoses. Patient allergies and restrictions are included below.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedPatient.dietary_preferences.map((item) => <Badge key={item}>{item}</Badge>)}
              {selectedPatient.dietary_restrictions.map((item) => <Badge key={item}>Restriction: {item}</Badge>)}
              {selectedPatient.allergies.map((item) => <Badge key={item}>Allergy: {item}</Badge>)}
              {!selectedPatient.dietary_preferences.length && !selectedPatient.dietary_restrictions.length && !selectedPatient.allergies.length && <span className="text-sm text-muted">Dietary preferences, restrictions, and allergies not recorded.</span>}
            </div>
          </Card>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black text-ink dark:text-white">Nutrition plan history</h2><Button type="button" onClick={() => startDraft()}><Plus className="mr-2 h-4 w-4" />Create draft</Button></div>
            {data.plans.length ? data.plans.map((plan) => (
              <Card key={plan.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-ink dark:text-white">{plan.title}</h3><Badge>{plan.status}</Badge><Badge>{sourceLabel(plan.source)}</Badge></div><p className="mt-1 text-xs text-muted">Version {plan.version}{plan.reviewed_at ? ` · Reviewed ${new Date(plan.reviewed_at).toLocaleString()}` : ""}</p></div>
                  <div className="flex flex-wrap gap-2">
                    {plan.status === "draft" && <><Button type="button" size="sm" variant="secondary" onClick={() => startDraft(plan)}>Edit draft</Button><Button type="button" size="sm" onClick={() => void publish(plan.id)}>Review & publish</Button></>}
                    {plan.status === "active" && <Button type="button" size="sm" variant="secondary" onClick={() => void discontinue(plan.id)}>Discontinue</Button>}
                  </div>
                </div>
                {plan.meals.map((meal, index) => <details key={`${meal.name}-${index}`} className="mt-3 rounded-xl bg-lavender-50 p-3 dark:bg-white/5"><summary className="cursor-pointer text-sm font-bold text-ink dark:text-white">{meal.meal_type}: {meal.name}</summary><div className="mt-3"><MealCard meal={meal} /></div></details>)}
              </Card>
            )) : <EmptyState title="No nutrition plans yet" text="Create a draft, review its content, and explicitly publish it before it becomes active for the mother." />}
          </section>

          <form id="nutrition-plan-editor" className="space-y-4" onSubmit={(event) => void saveDraft(event)}>
            <Card>
              <h2 className="text-lg font-black text-ink dark:text-white">{editingPlanId ? "Edit nutrition draft" : "Create nutrition draft"}</h2>
              <p className="mt-1 text-xs text-muted">Saving creates a draft only. Publishing requires explicit confirmation and archives the previous active plan.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-xs font-bold text-muted md:col-span-2">Plan title<Input className="mt-1" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={255} /></label>
                <div className="md:col-span-2"><p className="text-xs font-bold text-muted">Applicable recorded context</p><div className="mt-2 flex flex-wrap gap-3">{["pregnancy", "postpartum", "breastfeeding", "PCOS screening", "PPD screening"].map((item) => <label key={item} className="flex items-center gap-2 text-sm text-ink dark:text-white"><input type="checkbox" checked={contexts.includes(item)} onChange={(event) => setContexts(event.target.checked ? [...contexts, item] : contexts.filter((value) => value !== item))} />{item}</label>)}</div></div>
                {meals.map((meal, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-lavender-200 p-4 dark:border-white/10 md:col-span-2 md:grid-cols-2">
                    <div className="flex items-center justify-between md:col-span-2"><h3 className="font-black text-ink dark:text-white">Meal {index + 1}</h3>{meals.length > 1 && <Button type="button" size="sm" variant="secondary" onClick={() => setMeals(meals.filter((_, i) => i !== index))}>Remove meal</Button>}</div>
                    <label className="text-xs font-bold text-muted">Meal name<Input className="mt-1" value={meal.name} onChange={(event) => setMeals(meals.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></label>
                    <label className="text-xs font-bold text-muted">Meal type<select className="mt-1 h-11 w-full rounded-2xl border border-lavender-200 bg-white px-3 text-ink dark:border-white/10 dark:bg-[#271b30] dark:text-white" value={meal.meal_type} onChange={(event) => setMeals(meals.map((item, i) => i === index ? { ...item, meal_type: event.target.value } : item))}>{["breakfast", "lunch", "dinner", "snack", "drink"].map((option) => <option key={option}>{option}</option>)}</select></label>
                    <label className="text-xs font-bold text-muted">Ingredients (one per line)<textarea className="mt-1 min-h-24 w-full rounded-2xl border border-lavender-200 bg-white p-3 text-sm text-ink dark:border-white/10 dark:bg-white/5 dark:text-white" value={meal.ingredients} onChange={(event) => setMeals(meals.map((item, i) => i === index ? { ...item, ingredients: event.target.value } : item))} /></label>
                    <label className="text-xs font-bold text-muted">Preparation instructions (one per line)<textarea className="mt-1 min-h-24 w-full rounded-2xl border border-lavender-200 bg-white p-3 text-sm text-ink dark:border-white/10 dark:bg-white/5 dark:text-white" value={meal.preparation_instructions} onChange={(event) => setMeals(meals.map((item, i) => i === index ? { ...item, preparation_instructions: event.target.value } : item))} /></label>
                    <label className="text-xs font-bold text-muted">Serving size<Input className="mt-1" value={meal.serving_size} onChange={(event) => setMeals(meals.map((item, i) => i === index ? { ...item, serving_size: event.target.value } : item))} /></label>
                    <label className="text-xs font-bold text-muted">Preparation time (minutes)<Input type="number" min={0} max={1440} className="mt-1" value={meal.preparation_minutes} onChange={(event) => setMeals(meals.map((item, i) => i === index ? { ...item, preparation_minutes: event.target.value } : item))} /></label>
                    <label className="text-xs font-bold text-muted">Substitutions (one per line)<textarea className="mt-1 min-h-20 w-full rounded-2xl border border-lavender-200 bg-white p-3 text-sm text-ink dark:border-white/10 dark:bg-white/5 dark:text-white" value={meal.substitutions} onChange={(event) => setMeals(meals.map((item, i) => i === index ? { ...item, substitutions: event.target.value } : item))} /></label>
                    <label className="text-xs font-bold text-muted">Nutritional facts (only if verified; one per line)<textarea className="mt-1 min-h-20 w-full rounded-2xl border border-lavender-200 bg-white p-3 text-sm text-ink dark:border-white/10 dark:bg-white/5 dark:text-white" value={meal.nutrition_facts} onChange={(event) => setMeals(meals.map((item, i) => i === index ? { ...item, nutrition_facts: event.target.value } : item))} /></label>
                    <label className="text-xs font-bold text-muted md:col-span-2">Nutrition fact source (required when facts are entered)<Input className="mt-1" value={meal.nutrition_source} onChange={(event) => setMeals(meals.map((item, i) => i === index ? { ...item, nutrition_source: event.target.value } : item))} /></label>
                  </div>
                ))}
                <Button type="button" variant="secondary" className="md:col-span-2 md:justify-self-start" onClick={() => setMeals([...meals, { ...EMPTY_MEAL }])}><Plus className="mr-2 h-4 w-4" />Add meal</Button>
                <label className="text-xs font-bold text-muted md:col-span-2">Practical preparation/support guidance<textarea className="mt-1 min-h-20 w-full rounded-2xl border border-lavender-200 bg-white p-3 text-sm text-ink dark:border-white/10 dark:bg-white/5 dark:text-white" value={guidance} onChange={(event) => setGuidance(event.target.value)} /></label>
                <label className="text-xs font-bold text-muted md:col-span-2">Clinician note<textarea className="mt-1 min-h-20 w-full rounded-2xl border border-lavender-200 bg-white p-3 text-sm text-ink dark:border-white/10 dark:bg-white/5 dark:text-white" value={clinicianNote} onChange={(event) => setClinicianNote(event.target.value)} /></label>
                <Button type="submit" disabled={saving || !patientId} className="md:justify-self-start"><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save draft"}</Button>
              </div>
            </Card>
          </form>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">{data.disclaimer}</p>
        </div>
      )}
    </Page>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-lavender-50 p-3 dark:bg-white/5"><p className="text-[11px] font-bold uppercase text-muted">{label}</p><p className="mt-1 text-sm font-black text-ink dark:text-white">{value}</p></div>;
}
