import { Check, Droplets, Heart, Info, Plus, ShieldCheck, Sparkles, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { api, HealthMythItem, NutritionPlanItem } from "@/lib/api";
import { useLanguage } from "@/context/useLanguage";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { LoadingSkeleton } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function NutritionPage() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<NutritionPlanItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hydrationCups, setHydrationCups] = useState<number>(0);
  const [targetCups, setTargetCups] = useState<number>(8);
  const [hydrationPercent, setHydrationPercent] = useState<number>(0);
  const [myths, setMyths] = useState<HealthMythItem[]>([]);
  const [activeTab, setActiveTab] = useState<"plans" | "hydration" | "myths">("plans");
  const [loading, setLoading] = useState(true);
  const [updatingHydration, setUpdatingHydration] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [plansRes, hydrationRes, mythsRes] = await Promise.all([
          api.nutritionPlans(),
          api.hydration().catch(() => ({ cups: 0, target_cups: 8, percent: 0 })),
          api.healthMyths().catch(() => []),
        ]);
        setPlans(plansRes.plans);
        setHydrationCups(hydrationRes.cups);
        setTargetCups(hydrationRes.target_cups);
        setHydrationPercent(hydrationRes.percent);
        setMyths(mythsRes);
      } catch {
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  async function handleAddWater() {
    setUpdatingHydration(true);
    const newCups = hydrationCups + 1;
    try {
      const res = await api.updateHydration(newCups, targetCups);
      setHydrationCups(res.cups);
      setHydrationPercent(res.percent);
    } catch {
      // Local fallback
      setHydrationCups(newCups);
      setHydrationPercent(Math.min(100, Math.round((newCups / targetCups) * 100)));
    } finally {
      setUpdatingHydration(false);
    }
  }

  async function handleResetWater() {
    try {
      await api.updateHydration(0, targetCups);
      setHydrationCups(0);
      setHydrationPercent(0);
    } catch {
      setHydrationCups(0);
      setHydrationPercent(0);
    }
  }

  const filteredPlans = plans.filter((plan) => {
    if (selectedCategory === "all") return true;
    return plan.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <Page
      title="Nutrition & Maternal Wellness Guide"
      subtitle="Culturally tailored Indian dietary recommendations, PCOS nutrition, and hydration tracking"
    >
      {/* Navigation tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-lavender-200 pb-3 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "plans"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <Utensils className="h-4 w-4" /> Meal Plans & Diets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("hydration")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "hydration"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <Droplets className="h-4 w-4" /> Daily Hydration Tracker ({hydrationCups}/{targetCups} Glasses)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("myths")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "myths"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <Sparkles className="h-4 w-4" /> Health Myth-Buster ({myths.length})
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* TAB 1: MEAL PLANS */}
          {activeTab === "plans" && (
            <div className="space-y-6">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-muted">Filter:</span>
                {[
                  { id: "all", label: "All Guidelines" },
                  { id: "pregnancy", label: "🤰 Pregnancy (Trimester-Wise)" },
                  { id: "postpartum", label: "🤱 Postpartum & Lactation" },
                  { id: "pcos", label: "🌸 PCOS & Hormone Balance" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                      selectedCategory === cat.id
                        ? "bg-primary text-white shadow-glow"
                        : "bg-lavender-100/70 text-ink hover:bg-lavender-200/60 dark:bg-white/10 dark:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Meal Cards Grid */}
              <div className="grid gap-5 md:grid-cols-2">
                {filteredPlans.map((plan, idx) => (
                  <Card key={`${plan.title}-${idx}`} className="relative overflow-hidden transition hover:shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge>{plan.category.toUpperCase()}</Badge>
                          <span className="text-xs font-bold text-primary">{plan.phase}</span>
                        </div>
                        <h3 className="mt-2 text-lg font-black text-ink dark:text-white">{plan.title}</h3>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Recommended as {plan.meal_type}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                        Local & Affordable
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-muted dark:text-white/70">{plan.description}</p>

                    <div className="mt-4 space-y-2 rounded-2xl bg-lavender-50/80 p-3.5 dark:bg-white/5">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-muted">Local Ingredients:</span>
                        <p className="text-sm font-semibold text-ink dark:text-white">{plan.local_foods}</p>
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-muted">Key Nutrients:</span>
                        <p className="text-xs font-bold text-primary">{plan.key_nutrients}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: HYDRATION TRACKER */}
          {activeTab === "hydration" && (
            <div className="space-y-6">
              <Card className="max-w-2xl mx-auto text-center p-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-sky-600 shadow-glow">
                  <Droplets className="h-10 w-10" />
                </div>
                <h2 className="mt-4 text-2xl font-black text-ink dark:text-white">Daily Hydration Goal</h2>
                <p className="mt-1 text-sm text-muted">
                  Adequate water intake is essential for blood volume, amniotic fluid, and postpartum milk supply.
                </p>

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm font-black">
                    <span className="text-ink dark:text-white">{hydrationCups} of {targetCups} Glasses</span>
                    <span className="text-primary">{hydrationPercent}% Completed</span>
                  </div>
                  <Progress value={hydrationPercent} className="h-4" />
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Button
                    onClick={() => void handleAddWater()}
                    disabled={updatingHydration}
                    className="px-6 shadow-glow"
                  >
                    <Plus className="mr-2 h-5 w-5" /> Drink a Glass (250ml)
                  </Button>
                  <Button variant="secondary" onClick={() => void handleResetWater()}>
                    Reset Today
                  </Button>
                </div>

                <div className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {Array.from({ length: targetCups }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex h-12 flex-col items-center justify-center rounded-xl border text-xs font-black transition ${
                        i < hydrationCups
                          ? "border-sky-300 bg-sky-100 text-sky-700 shadow-sm dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
                          : "border-lavender-200 bg-white/60 text-muted dark:border-white/10 dark:bg-white/5"
                      }`}
                    >
                      {i < hydrationCups ? "💧" : "🥛"}
                      <span className="text-[10px]">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: HEALTH MYTH-BUSTER */}
          {activeTab === "myths" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-lavender-200/80 bg-lavender-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-black text-ink dark:text-white">Evidence-Based Women's Health Education</h3>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Clear, verified answers debunking common myths surrounding PCOS, postpartum recovery, and menstruation.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {myths.map((m) => (
                  <Card key={m.id} className="relative overflow-hidden">
                    <Badge className="mb-2">{m.category}</Badge>
                    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/30 dark:bg-rose-950/20">
                      <p className="text-xs font-black uppercase text-rose-700 dark:text-rose-300">Common Myth</p>
                      <p className="mt-1 text-sm font-black text-rose-900 dark:text-rose-200">"{m.myth}"</p>
                    </div>

                    <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/70 p-3 dark:border-teal-900/30 dark:bg-teal-950/20">
                      <p className="text-xs font-black uppercase text-teal-700 dark:text-teal-300">Medical Fact</p>
                      <p className="mt-1 text-sm leading-6 text-teal-950 dark:text-teal-100">{m.fact}</p>
                    </div>

                    <p className="mt-3 text-[11px] font-semibold text-muted">
                      Source: {m.verification_source}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Persistent Medical Disclaimer */}
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        <strong>⚠️ Clinical Nutrition Disclaimer:</strong> This guide provides evidence-based dietary education and does not substitute for clinical advice or medical prescription. Mothers with gestational diabetes, preeclampsia, or severe kidney/metabolic conditions should strictly adhere to their obstetrician's personalized dietary plan.
      </div>
    </Page>
  );
}
