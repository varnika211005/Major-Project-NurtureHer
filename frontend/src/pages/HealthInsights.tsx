import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Brain,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flower2,
  Heart,
  Moon,
  RefreshCw,
  Shield,
  ShieldAlert,
  Smile,
  Sparkles,
  Sun,
  Utensils,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  api,
  Cycle,
  Journal,
  Mood,
  PPDAssessment,
  PCOSPrediction,
  Symptom,
  WellnessInsight,
} from "@/lib/api";
import { formatDate, formatTime } from "@/lib/locale";
import { useAuth } from "@/context/useAuth";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { LoadingSkeleton, ErrorState } from "@/components/common/States";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Analytics aggregate shape from /wellness/analytics
type AnalyticsData = {
  mood_trends?: Record<string, number>;
  symptom_trends?: {
    fatigue?: number;
    headache?: number;
    sleep_issue?: number;
    anxiety?: number;
    cramps?: number;
  };
  cycle_insights?: {
    last_period_date?: string | null;
    next_period_prediction?: string | null;
    cycle_length?: number | null;
    cycle_entries?: number;
    average_cycle_length?: number | null;
    regularity_range_days?: number | null;
    regularity?: string | null;
  };
  pcos_history?: Record<string, number>;
  pcos_latest?: {
    risk_level?: string | null;
    probability?: number | null;
    recommendations?: string | null;
  };
  ppd_history?: Record<string, number>;
  ppd_latest?: {
    risk_level?: string | null;
    epds_score?: number | null;
    sentiment?: string | null;
  };
};

type TimeFilter = "7d" | "30d" | "all";

// Mood weight score for trend visualization
const MOOD_SCORES: Record<string, { score: number; label: string; color: string; emoji: string }> = {
  happy: { score: 5, label: "Happy & Joyful", color: "#EC4899", emoji: "🌸" },
  calm: { score: 4, label: "Calm & Peaceful", color: "#8B5CF6", emoji: "🕊️" },
  tired: { score: 3, label: "Tired & Rest Needed", color: "#A855F7", emoji: "🌙" },
  anxious: { score: 2, label: "Anxious & Uneasy", color: "#F59E0B", emoji: "🌿" },
  sad: { score: 1, label: "Low & Heavy", color: "#3B82F6", emoji: "🌧️" },
  angry: { score: 1, label: "Frustrated", color: "#EF4444", emoji: "⚡" },
};

export function HealthInsightsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Raw records from backend
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [ppdHistory, setPpdHistory] = useState<PPDAssessment[]>([]);
  const [pcosHistory, setPcosHistory] = useState<PCOSPrediction[]>([]);
  const [, setInsights] = useState<WellnessInsight[]>([]);

  // Time filter state
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7d");

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [
        analyticsRes,
        moodsRes,
        symptomsRes,
        journalsRes,
        cyclesRes,
        ppdRes,
        pcosRes,
        insightsRes,
      ] = await Promise.allSettled([
        api.analytics(),
        api.moods(),
        api.symptoms(),
        api.journals(),
        api.cycles(),
        api.ppdHistory(),
        api.pcosHistory(),
        api.insights(),
      ]);

      if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value as AnalyticsData);
      if (moodsRes.status === "fulfilled") setMoods(moodsRes.value);
      if (symptomsRes.status === "fulfilled") setSymptoms(symptomsRes.value);
      if (journalsRes.status === "fulfilled") setJournals(journalsRes.value);
      if (cyclesRes.status === "fulfilled") setCycles(cyclesRes.value);
      if (ppdRes.status === "fulfilled") setPpdHistory(ppdRes.value);
      if (pcosRes.status === "fulfilled") setPcosHistory(pcosRes.value);
      if (insightsRes.status === "fulfilled") setInsights(insightsRes.value.insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load health insights");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Filter records by selected time window
  const filteredData = useMemo(() => {
    const now = new Date();
    const cutoffDays = timeFilter === "7d" ? 7 : timeFilter === "30d" ? 30 : Infinity;
    const cutoffDate = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);

    const fMoods = moods.filter((m) => {
      if (cutoffDays === Infinity) return true;
      const d = new Date(m.created_at);
      return !isNaN(d.getTime()) ? d >= cutoffDate : true;
    });

    const fSymptoms = symptoms.filter((s) => {
      if (cutoffDays === Infinity) return true;
      const d = new Date(s.created_at);
      return !isNaN(d.getTime()) ? d >= cutoffDate : true;
    });

    return {
      moods: fMoods.length > 0 ? fMoods : moods.slice(-7),
      symptoms: fSymptoms.length > 0 ? fSymptoms : symptoms.slice(-7),
    };
  }, [moods, symptoms, timeFilter]);

  // Aggregate stats
  const totalRecords =
    moods.length +
    symptoms.length +
    journals.length +
    cycles.length +
    ppdHistory.length +
    pcosHistory.length;

  const hasAnyData = totalRecords > 0;

  // Consistency calculation (percentage of last 7 days with at least one record)
  const trackingConsistency = useMemo(() => {
    if (moods.length === 0 && symptoms.length === 0) return 0;
    const loggedDates = new Set<string>();
    [...moods, ...symptoms].forEach((item) => {
      const d = new Date(item.created_at);
      if (!isNaN(d.getTime())) {
        loggedDates.add(d.toISOString().slice(0, 10));
      }
    });
    const now = new Date();
    let daysLoggedLastWeek = 0;
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = checkDate.toISOString().slice(0, 10);
      if (loggedDates.has(key)) daysLoggedLastWeek++;
    }
    return Math.min(100, Math.round((daysLoggedLastWeek / 7) * 100));
  }, [moods, symptoms]);

  // Format mood trend points for Recharts
  const moodChartData = useMemo(() => {
    if (filteredData.moods.length === 0) return [];
    // Sort oldest to newest
    const sorted = [...filteredData.moods].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return sorted.map((m, idx) => {
      const d = new Date(m.created_at);
      const dayLabel = !isNaN(d.getTime())
        ? formatDate(d, { month: "short", day: "numeric" })
        : `Log ${idx + 1}`;
      const timeLabel = !isNaN(d.getTime())
        ? formatTime(d, { hour: "2-digit", minute: "2-digit" })
        : "";
      const meta = MOOD_SCORES[m.mood.toLowerCase()] || {
        score: 3,
        label: m.mood,
        color: "#EC4899",
        emoji: "🌸",
      };
      return {
        date: dayLabel,
        time: timeLabel,
        mood: m.mood,
        moodLabel: meta.label,
        emoji: meta.emoji,
        score: meta.score,
        note: m.note || null,
      };
    });
  }, [filteredData.moods]);

  // Symptom counts for Recharts
  const symptomChartData = useMemo(() => {
    let fatigue = 0;
    let headache = 0;
    let sleepIssue = 0;
    let anxiety = 0;
    let cramps = 0;

    const source = filteredData.symptoms.length > 0 ? filteredData.symptoms : symptoms;
    source.forEach((s) => {
      if (s.fatigue) fatigue++;
      if (s.headache) headache++;
      if (s.sleep_issue) sleepIssue++;
      if (s.anxiety) anxiety++;
      if (s.cramps) cramps++;
    });

    return [
      { name: "Fatigue", count: fatigue, fill: "#EC4899" },
      { name: "Headache", count: headache, fill: "#A855F7" },
      { name: "Sleep Issue", count: sleepIssue, fill: "#8B5CF6" },
      { name: "Anxiety", count: anxiety, fill: "#F59E0B" },
      { name: "Cramps", count: cramps, fill: "#3B82F6" },
    ].filter((item) => item.count > 0 || source.length > 0);
  }, [filteredData.symptoms, symptoms]);

  // Mood frequency breakdown for Doughnut/Pill
  const moodBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    moods.forEach((m) => {
      const k = m.mood.toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).map(([moodKey, count]) => {
      const meta = MOOD_SCORES[moodKey] || {
        score: 3,
        label: moodKey,
        color: "#EC4899",
        emoji: "🌸",
      };
      return {
        name: meta.label,
        value: count,
        color: meta.color,
        emoji: meta.emoji,
        rawKey: moodKey,
      };
    });
  }, [moods]);

  const predominantMood = useMemo(() => {
    if (moodBreakdown.length === 0) return null;
    return [...moodBreakdown].sort((a, b) => b.value - a.value)[0];
  }, [moodBreakdown]);

  // Smart Recommendations Engine based exclusively on real records
  const recommendations = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      explanation: string;
      actionText: string;
      actionPath: string;
      icon: typeof Sparkles;
      badge: string;
      tone: string;
    }> = [];

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const hasTodayMood = moods.some((m) => m.created_at.slice(0, 10) === todayStr);

    // 1. Daily tracking prompt
    if (!hasTodayMood) {
      list.push({
        id: "daily-checkin",
        title: "Check in with yourself today",
        explanation:
          "You haven't recorded how you're feeling today. A 30-second mood check-in keeps your wellness rhythm up to date.",
        actionText: "Record Today's Mood",
        actionPath: "/dashboard",
        icon: Sun,
        badge: "Daily Habit",
        tone: "from-pink-500 to-rose-400",
      });
    } else {
      list.push({
        id: "streak-congrats",
        title: "Wellness check logged today!",
        explanation:
          "Great job staying mindful of your health journey. Continuous logs allow your wellness patterns to emerge naturally.",
        actionText: "View Dashboard",
        actionPath: "/dashboard",
        icon: Sparkles,
        badge: "Streak Active",
        tone: "from-emerald-500 to-teal-400",
      });
    }

    // 2. Emotional wellness recommendation
    const recentNegativeMood = moods.slice(0, 3).some((m) =>
      ["sad", "anxious", "angry", "tired"].includes(m.mood.toLowerCase()),
    );
    if (recentNegativeMood) {
      list.push({
        id: "emotional-care",
        title: "Gentle emotional self-care",
        explanation:
          "Your recent logs reflect feelings of fatigue or stress. Give yourself permission to pause, rest, and express your thoughts.",
        actionText: "Open Mood Journal",
        actionPath: "/journal",
        icon: Moon,
        badge: "Self-Care",
        tone: "from-purple-500 to-indigo-400",
      });
    } else if (moods.length > 0) {
      list.push({
        id: "journal-positivity",
        title: "Reflect in your journal",
        explanation:
          "Documenting positive milestones, thoughts, and reflections builds maternal emotional resilience over time.",
        actionText: "Write a Journal Entry",
        actionPath: "/journal",
        icon: Smile,
        badge: "Mindfulness",
        tone: "from-primary to-accent",
      });
    }

    // 3. Physical symptom & nutrition recommendation
    const hasFatigueOrCramps = symptoms.slice(0, 3).some((s) => s.fatigue || s.cramps || s.headache);
    if (hasFatigueOrCramps) {
      list.push({
        id: "nutrition-nourishment",
        title: "Nourish your body & stay hydrated",
        explanation:
          "You have logged fatigue or physical tension. Traditional balanced meals and regular water intake provide gentle relief.",
        actionText: "Explore Nutrition Guide",
        actionPath: "/nutrition",
        icon: Utensils,
        badge: "Body Care",
        tone: "from-amber-500 to-orange-400",
      });
    }

    // 4. Cycle prediction next steps
    if (cycles.length > 0 && analytics?.cycle_insights?.next_period_prediction) {
      const predDate = new Date(analytics.cycle_insights.next_period_prediction);
      const formattedDate = !isNaN(predDate.getTime())
        ? formatDate(predDate, { month: "short", day: "numeric" })
        : analytics.cycle_insights.next_period_prediction;
      list.push({
        id: "cycle-tracking",
        title: `Estimated period: ${formattedDate}`,
        explanation:
          "Your predicted cycle window is approaching. Log cycle milestones when they occur to refine prediction precision.",
        actionText: "Open Cycle Tracker",
        actionPath: "/cycle",
        icon: CalendarDays,
        badge: "Reproductive Health",
        tone: "from-rose-500 to-pink-400",
      });
    } else if (cycles.length === 0) {
      list.push({
        id: "start-cycle",
        title: "Track your menstrual cycle",
        explanation:
          "Recording your last period date unlocks estimated fertility windows and reproductive pattern insights.",
        actionText: "Log First Cycle",
        actionPath: "/cycle",
        icon: Calendar,
        badge: "Cycle Tracking",
        tone: "from-primary to-secondary",
      });
    }

    // 5. Clinical screening follow-up
    const latestPpd = ppdHistory[0] || (analytics?.ppd_latest?.epds_score !== undefined ? analytics.ppd_latest : null);
    if (latestPpd && latestPpd.epds_score !== null && latestPpd.epds_score >= 10) {
      list.push({
        id: "ppd-followup",
        title: "Discuss observations with your doctor",
        explanation:
          "Your recent screening indicated elevated emotional stress. We encourage discussing these observations with your doctor or healthcare worker.",
        actionText: "View Clinical Reports",
        actionPath: "/reports",
        icon: ShieldAlert,
        badge: "Clinical Check",
        tone: "from-rose-600 to-red-500",
      });
    } else if (ppdHistory.length === 0) {
      list.push({
        id: "take-screening",
        title: "Take a 3-minute PPD screening",
        explanation:
          "The Edinburgh Postnatal Depression Scale (EPDS) offers validated, gentle self-reflection on your postpartum feelings.",
        actionText: "Start Screening",
        actionPath: "/ppd",
        icon: Brain,
        badge: "Self-Reflection",
        tone: "from-purple-500 to-pink-500",
      });
    }

    return list;
  }, [moods, symptoms, cycles, analytics, ppdHistory]);

  return (
    <Page
      title="Health Insights Dashboard"
      subtitle="A gentle, visual overview of your personal wellness rhythms, mood trends, and recommended next steps."
    >
      <div className="space-y-8">
        {/* TOP WELCOME BANNER */}
        <section className="relative overflow-hidden rounded-[28px] border border-lavender-200/70 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-lavender-500/10 p-6 shadow-glow backdrop-blur-xl dark:border-white/10 dark:from-white/10 dark:to-white/5 sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300">
                  <Flower2 className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Personalized Maternal Telemetry
                </span>
              </div>
              <h1 className="text-2xl font-black text-ink dark:text-white sm:text-3xl">
                Welcome back, {user?.name || "Mother"} 🌸
              </h1>
              <p className="max-w-2xl text-xs leading-relaxed text-muted dark:text-white/70 sm:text-sm">
                Here is your holistic health overview compiled from your verified logs. Regular
                tracking empowers you with gentle observations, emotional clarity, and clinical
                readiness.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Time filter buttons */}
              <div className="inline-flex rounded-2xl border border-lavender-200 bg-white/80 p-1 shadow-soft dark:border-white/10 dark:bg-card">
                {(["7d", "30d", "all"] as TimeFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTimeFilter(f)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      timeFilter === f
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted hover:text-ink dark:text-white/60 dark:hover:text-white"
                    }`}
                  >
                    {f === "7d" ? "7 Days" : f === "30d" ? "30 Days" : "All Time"}
                  </button>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="h-9 rounded-2xl border-lavender-200 bg-white/80 text-ink shadow-soft hover:bg-lavender-50 dark:border-white/10 dark:bg-card dark:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="ml-1.5 hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </section>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState
            title="We couldn't load all health insights"
            text="Please check your connection and refresh. Your saved records are securely stored."
          />
        ) : !hasAnyData ? (
          /* INSUFFICIENT DATA / ONBOARDING STATE */
          <Card className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-100 text-pink-600 shadow-glow dark:bg-white/10 dark:text-pink-300">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-ink dark:text-white">
              Your Health Insights are getting ready! 🌿
            </h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted dark:text-white/60 sm:text-sm">
              You haven't recorded any health checks yet. Log your first mood, physical symptoms, or
              cycle dates to unlock your personalized 7-day flow curves and holistic next steps.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate("/dashboard")} className="rounded-2xl">
                <Sun className="mr-2 h-4 w-4" /> Log Today's Mood
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/cycle")}
                className="rounded-2xl"
              >
                <CalendarDays className="mr-2 h-4 w-4" /> Track Cycle
              </Button>
              <Button variant="secondary" onClick={() => navigate("/ppd")} className="rounded-2xl">
                <Brain className="mr-2 h-4 w-4" /> Take PPD Check
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* 1. HEALTH OVERVIEW METRIC CARDS */}
            <section className="space-y-4">
              <SectionHeader
                title="1. Health Overview"
                subtitle="High-level signals synthesized from your active wellness records"
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* Metric 1: Latest Mood */}
                <Card className="relative overflow-hidden p-5">
                  <div className="absolute right-0 top-0 h-16 w-16 -translate-y-4 translate-x-4 rounded-full bg-pink-400/10 blur-xl" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">
                      Recent Emotional State
                    </p>
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-white/10 dark:text-pink-300">
                      <Heart className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-ink dark:text-white capitalize">
                      {moods[0]?.mood || "Not logged"}
                    </span>
                    <span className="text-lg">
                      {moods[0] ? MOOD_SCORES[moods[0].mood.toLowerCase()]?.emoji || "🌸" : "🌱"}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted dark:text-white/50 truncate">
                    {moods[0]?.note ? `"${moods[0].note}"` : "Latest mood entry recorded"}
                  </p>
                </Card>

                {/* Metric 2: Active Symptoms */}
                <Card className="relative overflow-hidden p-5">
                  <div className="absolute right-0 top-0 h-16 w-16 -translate-y-4 translate-x-4 rounded-full bg-purple-400/10 blur-xl" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">
                      Active Symptoms
                    </p>
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-white/10 dark:text-purple-300">
                      <Activity className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-ink dark:text-white">
                      {symptoms[0]
                        ? [
                            symptoms[0].fatigue,
                            symptoms[0].headache,
                            symptoms[0].sleep_issue,
                            symptoms[0].anxiety,
                            symptoms[0].cramps,
                          ].filter(Boolean).length
                        : 0}
                    </span>
                    <span className="text-xs font-semibold text-muted">reported</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted dark:text-white/50">
                    {symptoms[0] &&
                    [
                      symptoms[0].fatigue && "Fatigue",
                      symptoms[0].headache && "Headache",
                      symptoms[0].sleep_issue && "Sleep",
                      symptoms[0].anxiety && "Anxiety",
                      symptoms[0].cramps && "Cramps",
                    ].filter(Boolean).length > 0
                      ? [
                          symptoms[0].fatigue && "Fatigue",
                          symptoms[0].headache && "Headache",
                          symptoms[0].sleep_issue && "Sleep",
                          symptoms[0].anxiety && "Anxiety",
                          symptoms[0].cramps && "Cramps",
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : "No active physical discomfort"}
                  </p>
                </Card>

                {/* Metric 3: Tracking Consistency */}
                <Card className="relative overflow-hidden p-5">
                  <div className="absolute right-0 top-0 h-16 w-16 -translate-y-4 translate-x-4 rounded-full bg-teal-400/10 blur-xl" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">
                      7-Day Consistency
                    </p>
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-white/10 dark:text-teal-300">
                      <Sparkles className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-ink dark:text-white">
                      {trackingConsistency}%
                    </span>
                  </div>
                  <Progress value={trackingConsistency} className="mt-3 h-2" />
                  <p className="mt-2 text-[11px] text-muted dark:text-white/50">
                    {trackingConsistency >= 70
                      ? "High tracking rhythm"
                      : trackingConsistency >= 30
                      ? "Moderate regular tracking"
                      : "Regular check-ins recommended"}
                  </p>
                </Card>

                {/* Metric 4: Menstrual Cycle Rhythm */}
                <Card className="relative overflow-hidden p-5">
                  <div className="absolute right-0 top-0 h-16 w-16 -translate-y-4 translate-x-4 rounded-full bg-rose-400/10 blur-xl" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">
                      Cycle Rhythm
                    </p>
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-white/10 dark:text-rose-300">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-ink dark:text-white capitalize">
                      {analytics?.cycle_insights?.regularity ||
                        (cycles.length > 0 ? "Tracking" : "Untracked")}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted dark:text-white/50">
                    {analytics?.cycle_insights?.average_cycle_length
                      ? `Avg cycle: ${analytics.cycle_insights.average_cycle_length} days`
                      : "Log periods to track rhythm"}
                  </p>
                </Card>
              </div>
            </section>

            {/* 2. PERSONALIZED WELLNESS TRENDS CHARTS */}
            <section className="space-y-4">
              <SectionHeader
                title="2. Wellness Trends & Visualizations"
                subtitle={`Visual time-series tracking for the selected window (${
                  timeFilter === "7d" ? "Past 7 Days" : timeFilter === "30d" ? "Past 30 Days" : "All Records"
                })`}
              />

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Mood Flow Curve Chart */}
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-ink dark:text-white">
                        Emotional Energy Flow Curve
                      </h3>
                      <p className="text-xs text-muted dark:text-white/60">
                        Higher scores represent joyful/peaceful moods; dips highlight rest needs
                      </p>
                    </div>
                    <Badge variant="outline" className="border-pink-200 text-pink-600 dark:border-pink-800 dark:text-pink-300">
                      {filteredData.moods.length} entries
                    </Badge>
                  </div>

                  {moodChartData.length > 0 ? (
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={moodChartData}>
                          <defs>
                            <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#EC4899" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 600 }}
                          />
                          <YAxis
                            domain={[0, 6]}
                            ticks={[1, 2, 3, 4, 5]}
                            tickFormatter={(v) =>
                              v === 5 ? "Happy" : v === 3 ? "Tired" : v === 1 ? "Low" : ""
                            }
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF", fontSize: 10, fontWeight: 600 }}
                            width={42}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-2xl border border-lavender-200 bg-white/95 p-3 shadow-glow backdrop-blur-md dark:border-white/10 dark:bg-card">
                                  <p className="text-[11px] font-bold text-muted">
                                    {d.date} {d.time ? `• ${d.time}` : ""}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1.5 text-xs font-black text-ink dark:text-white">
                                    <span>{d.emoji}</span>
                                    <span>{d.moodLabel}</span>
                                  </p>
                                  {d.note && (
                                    <p className="mt-1 text-[11px] italic text-muted max-w-[200px]">
                                      "{d.note}"
                                    </p>
                                  )}
                                </div>
                              );
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#EC4899"
                            strokeWidth={3}
                            fill="url(#moodFill)"
                            dot={{ fill: "#EC4899", r: 4, strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6, fill: "#8B5CF6" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-60 flex-col items-center justify-center text-center">
                      <Moon className="mb-2 h-8 w-8 text-muted/50" />
                      <p className="text-xs font-bold text-muted">No mood records in this window</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate("/dashboard")}
                        className="mt-1 text-xs text-primary"
                      >
                        Log a mood entry →
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Physical Symptoms Breakdown */}
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-ink dark:text-white">
                        Reported Symptom Frequency
                      </h3>
                      <p className="text-xs text-muted dark:text-white/60">
                        Tracks physical fatigue, sleep, and discomfort events over time
                      </p>
                    </div>
                    <Badge variant="outline" className="border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-300">
                      {filteredData.symptoms.length} logs
                    </Badge>
                  </div>

                  {symptomChartData.some((item) => item.count > 0) ? (
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={symptomChartData} layout="vertical">
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF", fontSize: 11 }}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#6B7280", fontSize: 11, fontWeight: 700 }}
                            width={80}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(192, 132, 252, 0.08)" }}
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-xl border border-lavender-200 bg-white/95 p-2.5 shadow-soft dark:border-white/10 dark:bg-card">
                                  <p className="text-xs font-bold text-ink dark:text-white">
                                    {d.name}: {d.count} time{d.count === 1 ? "" : "s"}
                                  </p>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={16}>
                            {symptomChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-60 flex-col items-center justify-center text-center">
                      <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500/60" />
                      <p className="text-xs font-bold text-muted">
                        No physical symptoms logged in this timeframe
                      </p>
                      <p className="mt-1 text-[11px] text-muted/70">
                        Check in regularly to track physical patterns.
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Cycle Rhythm Card (when cycles available) */}
              {cycles.length > 0 && (
                <Card className="p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-black text-ink dark:text-white">
                          Menstrual & Antenatal Cycle Timeline
                        </h3>
                      </div>
                      <p className="text-xs text-muted dark:text-white/60">
                        Calculated from your verified cycle logs. Predictions adjust with every recorded cycle.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate("/cycle")}
                      className="rounded-xl"
                    >
                      Cycle Details <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-lavender-100 bg-lavender-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] font-bold text-muted">Last Logged Period</p>
                      <p className="mt-1 text-base font-black text-ink dark:text-white">
                        {cycles[0]?.last_period_date || "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-lavender-100 bg-lavender-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] font-bold text-muted">Predicted Next Period</p>
                      <p className="mt-1 text-base font-black text-primary">
                        {cycles[0]?.next_period_prediction || "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-lavender-100 bg-lavender-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] font-bold text-muted">Recorded Cycle Length</p>
                      <p className="mt-1 text-base font-black text-ink dark:text-white">
                        {cycles[0]?.cycle_length ? `${cycles[0].cycle_length} Days` : "—"}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </section>

            {/* 3. MENTAL WELLNESS & EMOTIONAL PATTERNS */}
            <section className="space-y-4">
              <SectionHeader
                title="3. Mental Wellness & Emotional Patterns"
                subtitle="Compassionate reflections from your recorded moods, journals, and validated screenings"
              />

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Mood Distribution Card */}
                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                    <h3 className="text-sm font-black text-ink dark:text-white">
                      Emotional Balance
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted dark:text-white/60">
                    Proportion of recorded emotional states
                  </p>

                  {moodBreakdown.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {predominantMood && (
                        <div className="rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-3.5 text-xs text-ink dark:text-white">
                          <span className="font-bold">Most frequent state: </span>
                          <span className="font-black text-primary capitalize">
                            {predominantMood.name} ({predominantMood.value} logs)
                          </span>
                        </div>
                      )}

                      <div className="space-y-2 pt-2">
                        {moodBreakdown.map((item) => (
                          <div key={item.rawKey} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="flex items-center gap-1.5 text-muted dark:text-white/70">
                                <span>{item.emoji}</span>
                                <span>{item.name}</span>
                              </span>
                              <span className="font-bold text-ink dark:text-white">
                                {Math.round((item.value / moods.length) * 100)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-lavender-100 dark:bg-white/10">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${(item.value / moods.length) * 100}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-6 text-center text-xs text-muted">No mood logs recorded yet.</p>
                  )}
                </Card>

                {/* Journal Reflection Card */}
                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-600 dark:text-pink-300" />
                    <h3 className="text-sm font-black text-ink dark:text-white">
                      Latest Journal Reflection
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted dark:text-white/60">
                    Private thoughts recorded in your mood journal
                  </p>

                  {journals.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-lavender-100 bg-lavender-50/40 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-bold text-ink dark:text-white">
                        "{journals[0].title}"
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-3 dark:text-white/70">
                        {journals[0].content}
                      </p>
                      <p className="mt-3 text-[10px] font-semibold text-muted">
                        Recorded on{" "}
                        {formatDate(journals[0].created_at, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-col items-center justify-center text-center">
                      <Moon className="mb-2 h-7 w-7 text-muted/40" />
                      <p className="text-xs text-muted">No journal entries yet</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate("/journal")}
                        className="mt-1 text-xs text-primary"
                      >
                        Write first entry →
                      </Button>
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl bg-lavender-50/30 p-3 text-[11px] leading-relaxed text-muted dark:bg-white/5 dark:text-white/60">
                    💡 <span className="font-semibold">Gentle note:</span> Emotional highs and lows are
                    a normal part of maternity. Expressing your feelings creates clarity and relief.
                  </div>
                </Card>

                {/* PPD Assessment Context Card */}
                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-teal-600 dark:text-teal-300" />
                    <h3 className="text-sm font-black text-ink dark:text-white">
                      PPD Screening Observation
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted dark:text-white/60">
                    Validated Edinburgh Postnatal Depression Scale score
                  </p>

                  {ppdHistory.length > 0 || analytics?.ppd_latest?.epds_score !== undefined ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-lavender-100 bg-lavender-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-muted">Score</span>
                          <span className="text-sm font-black text-ink dark:text-white">
                            {(ppdHistory[0]?.epds_score ?? analytics?.ppd_latest?.epds_score) ?? "—"} / 30
                          </span>
                        </div>
                        <Progress
                          value={Math.min(
                            100,
                            (((ppdHistory[0]?.epds_score ?? analytics?.ppd_latest?.epds_score) || 0) / 30) * 100,
                          )}
                          className="mt-2 h-2"
                        />
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-muted">Observation:</span>
                          <Badge
                            variant="outline"
                            className="capitalize border-teal-200 text-teal-700 dark:border-teal-800 dark:text-teal-300"
                          >
                            {(ppdHistory[0]?.risk_level ?? analytics?.ppd_latest?.risk_level) || "Low"} Risk
                          </Badge>
                        </div>
                      </div>

                      <p className="text-[11px] leading-relaxed text-muted dark:text-white/60">
                        {((ppdHistory[0]?.epds_score ?? analytics?.ppd_latest?.epds_score) || 0) >= 10
                          ? "Your score suggests elevated stress. We encourage discussing persistent concerns with a certified healthcare specialist."
                          : "Your responses suggest balanced emotional adaptation. Reach out to your support circle whenever needed."}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-col items-center justify-center text-center">
                      <Brain className="mb-2 h-7 w-7 text-muted/40" />
                      <p className="text-xs text-muted">No PPD check recorded yet</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate("/ppd")}
                        className="mt-1 text-xs text-primary"
                      >
                        Take 3-min check →
                      </Button>
                    </div>
                  )}

                  <div className="mt-4 border-t border-lavender-100 pt-3 dark:border-white/10">
                    <p className="text-[10px] text-muted/80">
                      ℹ️ NurtureHer assessments provide wellness tracking observations and are not a psychiatric diagnosis.
                    </p>
                  </div>
                </Card>
              </div>
            </section>

            {/* 4. SMART RECOMMENDATIONS & ACTION PLAN */}
            <section className="space-y-4">
              <SectionHeader
                title="4. Your Next Steps & Action Plan"
                subtitle="Personalized suggestions generated exclusively from your available wellness telemetry"
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {recommendations.map((rec) => {
                  const IconComp = rec.icon;
                  return (
                    <Card
                      key={rec.id}
                      className="group relative flex flex-col justify-between overflow-hidden p-5 transition-all hover:-translate-y-1 hover:shadow-soft"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm ${rec.tone}`}
                          >
                            <IconComp className="h-5 w-5" />
                          </span>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {rec.badge}
                          </Badge>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-ink dark:text-white">
                            {rec.title}
                          </h4>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted dark:text-white/65">
                            {rec.explanation}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button
                          size="sm"
                          onClick={() => navigate(rec.actionPath)}
                          className="w-full rounded-xl group-hover:bg-primary/90"
                        >
                          <span>{rec.actionText}</span>
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </Page>
  );
}
