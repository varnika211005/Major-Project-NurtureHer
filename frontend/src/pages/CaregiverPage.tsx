import { AlertTriangle, Baby, CheckCircle2, Heart, HelpCircle, LifeBuoy, Lock, PhoneCall, ShieldAlert, Sparkles, UserCheck, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { api, CaregiverContent } from "@/lib/api";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/useLanguage";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { LoadingSkeleton } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CaregiverPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<CaregiverContent[]>([]);
  const [connections, setConnections] = useState<Array<{ access_id: string; mother_name: string; relationship_label: string; permissions: Record<string, boolean> }>>([]);
  const [sharedSummary, setSharedSummary] = useState<Record<string, unknown> | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"education" | "warning-signs" | "support-checklist" | "shared-status">("education");
  const [loading, setLoading] = useState(true);

  // Daily support checklist state
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({
    task1: true,
    task2: false,
    task3: false,
    task4: false,
    task5: false,
  });

  useEffect(() => {
    async function loadCaregiverData() {
      setLoading(true);
      try {
        const [videoGroup, tipGroup, articleGroup, conns] = await Promise.all([
          api.caregiver("videos").catch(() => []),
          api.caregiver("tips").catch(() => []),
          api.caregiver("articles").catch(() => []),
          api.careCircleConnections().catch(() => []),
        ]);
        setItems([...videoGroup, ...tipGroup, ...articleGroup]);
        setConnections(conns);
        if (conns.length > 0) {
          setSelectedConnection(conns[0].access_id);
          const summary = await api.careCircleSharedSummary(conns[0].access_id).catch(() => null);
          setSharedSummary(summary);
        }
      } finally {
        setLoading(false);
      }
    }
    void loadCaregiverData();
  }, []);

  async function handleSelectConnection(accessId: string) {
    setSelectedConnection(accessId);
    try {
      const summary = await api.careCircleSharedSummary(accessId);
      setSharedSummary(summary);
    } catch {
      setSharedSummary(null);
    }
  }

  const toggleTask = (taskId: string) => {
    setCheckedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const WARNING_SIGNS = [
    {
      level: "EMERGENCY — IMMEDIATE CARE (CALL 112)",
      color: "border-rose-300 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200",
      signs: [
        "Heavy vaginal bleeding soaking more than 1 sanitary pad per hour",
        "Severe, persistent headache with blurred vision or seeing spots (Preeclampsia sign)",
        "Sudden chest pain, difficulty breathing, or coughing up blood",
        "Severe abdominal pain that does not subside",
        "Expressed thoughts of harming oneself or the baby",
      ],
    },
    {
      level: "CLINICAL FOLLOW-UP WITHIN 24 HOURS",
      color: "border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200",
      signs: [
        "High fever (above 100.4°F / 38°C) or foul-smelling lochia discharge",
        "Red, painful, swollen, or hot area on the breast (Mastitis sign)",
        "Redness, swelling, or warm tender calves in legs (DVT sign)",
        "Persistent feelings of detachment, severe anxiety, or inability to sleep even when baby sleeps",
      ],
    },
  ];

  const SUPPORT_CHECKLIST = [
    { id: "task1", label: "Ensure she drinks at least 8 glasses of clean water today", category: "Hydration" },
    { id: "task2", label: "Take over baby soothing so she gets 2-3 hours of uninterrupted sleep", category: "Rest & Sleep" },
    { id: "task3", label: "Provide warm, nutritious iron-rich meals without asking her to cook", category: "Nutrition" },
    { id: "task4", label: "Gently ask how she feels emotionally and listen without giving unsolicited advice", category: "Emotional Care" },
    { id: "task5", label: "Check on diaper, laundry, and household chores before she needs to request them", category: "Household Support" },
  ];

  const COMMUNICATION_TIPS = [
    { doText: "Ask: 'I am here with you. What is one small thing I can take off your shoulders right now?'", dontText: "Don't say: 'You should be happy now that the baby is here.'" },
    { doText: "Validate: 'It is completely normal to feel exhausted and overwhelmed. You are doing a wonderful job.'", dontText: "Don't say: 'Other mothers manage fine without complaining.'" },
    { doText: "Action: 'I will watch the baby while you take a warm bath or rest quietly.'", dontText: "Don't say: 'Just tell me if you need help with anything.'" },
  ];

  return (
    <Page
      title="Caregiver Companion"
      subtitle="Empowering husbands and family caregivers with education, warning signs, and support guides"
    >
      {/* Navigation tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-lavender-200 pb-3 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab("education")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "education"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <Baby className="h-4 w-4" /> Caregiver Guides & Videos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("warning-signs")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "warning-signs"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-rose-500" /> Postpartum Warning Signs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("support-checklist")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "support-checklist"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Daily Support Checklist
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("shared-status")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "shared-status"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <UserCheck className="h-4 w-4 text-primary" /> Mother's Permitted Status ({connections.length})
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* TAB 1: CAREGIVER EDUCATION */}
          {activeTab === "education" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-lavender-200/80 bg-lavender-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  <h3 className="font-black text-ink dark:text-white">The Partner & Family Caregiver Role</h3>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Maternal recovery requires an active care team. Studies confirm that proactive caregiver support dramatically reduces postpartum depression severity and promotes maternal healing.
                </p>
              </div>

              {/* Communication Do's and Don'ts */}
              <Card>
                <SectionHeader
                  title="Supportive Communication Guide"
                  subtitle="Phrases that reassure vs phrases that unintentionally increase emotional distress"
                />
                <div className="grid gap-4 md:grid-cols-3">
                  {COMMUNICATION_TIPS.map((tip, idx) => (
                    <div key={idx} className="rounded-2xl border border-lavender-200/80 p-4 dark:border-white/10">
                      <div className="rounded-xl bg-emerald-50 p-3 text-xs dark:bg-emerald-950/20">
                        <p className="font-black text-emerald-800 dark:text-emerald-200">✅ WHAT TO SAY</p>
                        <p className="mt-1 font-semibold text-emerald-900 dark:text-emerald-100">{tip.doText}</p>
                      </div>
                      <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs dark:bg-rose-950/20">
                        <p className="font-black text-rose-800 dark:text-rose-200">❌ WHAT TO AVOID</p>
                        <p className="mt-1 font-semibold text-rose-900 dark:text-rose-100">{tip.dontText}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Educational Cards */}
              <div className="grid gap-5 md:grid-cols-3">
                {items.map((item) => (
                  <Card key={item.id} className="relative overflow-hidden">
                    <Badge className="mb-2">{item.category.toUpperCase()}</Badge>
                    <h3 className="text-base font-black text-ink dark:text-white">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted dark:text-white/60">{item.description}</p>
                    {item.video_url && (
                      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-primary">
                        <Video className="h-4 w-4" /> Video Resource Included
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: POSTPARTUM WARNING SIGNS */}
          {activeTab === "warning-signs" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-black text-sm">Postpartum Clinical Warning Signs (Red Flags)</h3>
                </div>
                <p className="mt-1 text-xs text-rose-900/80 dark:text-rose-200/80">
                  As a family caregiver, you are often the first to notice maternal warning signs. Never hesitate to call emergency services or take the mother to the nearest hospital if any red flags appear.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {WARNING_SIGNS.map((group, idx) => (
                  <div key={idx} className={`rounded-3xl border p-6 ${group.color}`}>
                    <h3 className="text-xs font-black tracking-wider uppercase">{group.level}</h3>
                    <ul className="mt-4 space-y-3">
                      {group.signs.map((sign, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs font-bold leading-5">
                          <span className="shrink-0 mt-0.5 font-black">•</span>
                          <span>{sign}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-r from-rose-50 to-white dark:from-white/10 dark:to-white/5 border border-rose-100">
                <div>
                  <h4 className="font-black text-ink dark:text-white">Immediate Medical Escalation</h4>
                  <p className="text-xs text-muted">Direct national medical emergency dispatch</p>
                </div>
                <a
                  href="tel:112"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-danger px-6 py-3 text-sm font-black text-white shadow-emergency transition hover:bg-rose-700"
                >
                  <PhoneCall className="h-4 w-4" /> Call 112 Ambulance
                </a>
              </Card>
            </div>
          )}

          {/* TAB 3: DAILY SUPPORT CHECKLIST */}
          {activeTab === "support-checklist" && (
            <Card className="max-w-2xl mx-auto p-7">
              <SectionHeader
                title="Daily Caregiver Support Checklist"
                subtitle="Track your daily contributions to mother and newborn care"
              />

              <div className="space-y-3">
                {SUPPORT_CHECKLIST.map((task) => {
                  const isChecked = Boolean(checkedTasks[task.id]);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                        isChecked
                          ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-100"
                          : "border-lavender-200 bg-white text-ink hover:bg-lavender-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      }`}
                    >
                      <div>
                        <Badge className="mb-1">{task.category}</Badge>
                        <p className={`text-sm font-bold ${isChecked ? "line-through opacity-80" : ""}`}>
                          {task.label}
                        </p>
                      </div>
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border ${
                          isChecked
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-lavender-300 bg-white dark:border-white/20 dark:bg-white/10"
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* TAB 4: MOTHER'S PERMITTED STATUS */}
          {activeTab === "shared-status" && (
            <div className="space-y-6">
              {connections.length === 0 ? (
                <Card className="text-center p-8">
                  <Lock className="mx-auto h-12 w-12 text-primary" />
                  <h3 className="mt-3 text-lg font-black text-ink dark:text-white">No Active CareCircle Connections</h3>
                  <p className="mt-1 text-xs text-muted max-w-md mx-auto">
                    Ask the mother to display her CareCircle QR code. Scan or enter her token to request access. Once she explicitly approves your request, her permitted health overview will appear here.
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Connection Selector */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-muted">Connected Mothers:</span>
                    {connections.map((c) => (
                      <button
                        key={c.access_id}
                        type="button"
                        onClick={() => void handleSelectConnection(c.access_id)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          selectedConnection === c.access_id
                            ? "bg-primary text-white shadow-glow"
                            : "bg-lavender-100 text-ink dark:bg-white/10 dark:text-white"
                        }`}
                      >
                        {c.mother_name} ({c.relationship_label})
                      </button>
                    ))}
                  </div>

                  {/* Summary Card */}
                  {sharedSummary ? (
                    <Card>
                      <SectionHeader
                        title={`Shared Health Status: ${String(sharedSummary.mother_name ?? "Mother")}`}
                        subtitle="Filtered by the mother's explicit consent preferences"
                      />

                      <div className="grid gap-5 md:grid-cols-3">
                        {Boolean(sharedSummary.emergency) && (
                          <div className="rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                            <Badge className="mb-2">EMERGENCY SOS</Badge>
                            <p className="text-xs font-bold text-muted">Emergency Contact:</p>
                            <p className="text-sm font-black text-ink dark:text-white">
                              {String((sharedSummary.emergency as Record<string, string>).emergency_contact)}
                            </p>
                            <p className="mt-2 text-xs font-bold text-muted">Blood Group:</p>
                            <p className="text-sm font-black text-ink dark:text-white">
                              {String((sharedSummary.emergency as Record<string, string>).blood_group)}
                            </p>
                          </div>
                        )}

                        {Boolean(sharedSummary.screenings) && (
                          <div className="rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                            <Badge className="mb-2">CLINICAL SCREENING</Badge>
                            <p className="text-xs font-bold text-muted">PCOS Risk Level:</p>
                            <p className="text-sm font-black text-ink dark:text-white">
                              {String((sharedSummary.screenings as Record<string, string>).pcos_risk)}
                            </p>
                            <p className="mt-2 text-xs font-bold text-muted">PPD Risk Level:</p>
                            <p className="text-sm font-black text-ink dark:text-white">
                              {String((sharedSummary.screenings as Record<string, string>).ppd_risk)}
                            </p>
                          </div>
                        )}

                        {Boolean(sharedSummary.wellness) && (
                          <div className="rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                            <Badge className="mb-2">WELLNESS & ENERGY</Badge>
                            <p className="text-xs font-bold text-muted">Today's Mood:</p>
                            <p className="text-sm font-black capitalize text-ink dark:text-white">
                              {String((sharedSummary.wellness as Record<string, string>).today_mood)}
                            </p>
                            <p className="mt-2 text-xs font-bold text-muted">Recent Fatigue:</p>
                            <p className="text-sm font-black text-ink dark:text-white">
                              {(sharedSummary.wellness as Record<string, boolean>).recent_fatigue ? "Fatigue reported" : "Normal energy"}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <LoadingSkeleton />
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
