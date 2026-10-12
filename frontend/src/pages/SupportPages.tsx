import {
  Activity,
  CheckCircle2,
  FileText,
  Lightbulb,
  Save,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, CaregiverContent, ChatMessage, Profile, WellnessInsight } from "@/lib/api";
import { IconNote } from "@/components/common/InfoBlocks";
import { EmptyState, LoadingSkeleton } from "@/components/common/States";
import { Page } from "@/components/common/Page";
import { SectionHeader, Timeline } from "@/components/common/Premium";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/useLanguage";

export function InsightsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<WellnessInsight[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.insights()
      .then((response) => setItems(response.insights))
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "Unable to load health insights");
        setItems([]);
      });
  }, []);

  const severityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
      case "critical":
        return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200";
      case "medium":
      case "moderate":
        return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
      default:
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
    }
  };

  return (
    <Page title={t.insights.title} subtitle={t.insights.subtitle}>
      <Card className="p-6">
        <SectionHeader title={t.insights.sectionTitle} subtitle={t.insights.sectionSubtitle} />
        {items === null ? (
          <LoadingSkeleton />
        ) : error ? (
          <IconNote icon={Activity} title={t.insights.errorTitle} text={error} />
        ) : items.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {items.map((item, index) => (
              <article
                key={`${item.category}-${item.message}-${index}`}
                className="rounded-2xl border border-lavender-100 bg-gradient-to-br from-white to-lavender-50/60 p-5 shadow-soft dark:border-white/10 dark:from-white/10 dark:to-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Lightbulb className="h-5 w-5" />
                    </span>
                    <h2 className="truncate font-black capitalize text-ink dark:text-white">
                      {item.category.replace(/_/g, " ")}
                    </h2>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black capitalize ${severityStyle(item.severity)}`}>
                    {item.severity}
                  </span>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted dark:text-white/65">{item.message}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title={t.insights.emptyTitle} text={t.insights.emptyText} />
        )}
      </Card>
    </Page>
  );
}

export function JournalPage() {
  const { t } = useLanguage();
  const [mood, setMood] = useState<"happy" | "sad" | "anxious" | "tired" | "angry">("happy");
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<{ id: string; title: string; detail: string; time: string }[]>([]);
  const [moodHistory, setMoodHistory] = useState<{ id: string; mood: string; note: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const MOOD_EMOJI: Record<string, string> = { happy: "😊", sad: "😢", anxious: "😰", tired: "😴", angry: "😠" };

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [items, moods] = await Promise.all([api.journals(), api.moods()]);
      setEntries(
        items.map((item) => ({
          id: item.id,
          title: item.title,
          detail: item.content,
          time: new Date(item.created_at).toLocaleDateString(),
        })),
      );
      setMoodHistory(moods.slice(0, 10));
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Unable to load saved journal entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function save() {
    const content = note.trim();
    if (!content || saving) return;
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const [item] = await Promise.all([
        api.createJournal(`Mood: ${mood}`, content),
        api.createMood(mood, content.slice(0, 200)),
      ]);
      setEntries((items) => [
        { id: item.id, title: item.title, detail: item.content, time: t.common.today },
        ...items.filter((entry) => entry.id !== item.id),
      ]);
      setNote("");
      setSaved(true);
      await loadEntries();
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Journal save failed");
    } finally {
      setSaving(false);
    }
  }

  const moodList: Array<"happy" | "sad" | "anxious" | "tired" | "angry"> = ["happy", "sad", "anxious", "tired", "angry"];

  return (
    <Page title={t.journal.title} subtitle={t.journal.subtitle}>
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="p-6">
          <SectionHeader title={t.journal.moodPrompt} subtitle={t.journal.moodSubtitle} />
          <div className="mt-4 grid grid-cols-5 gap-2">
            {moodList.map((value) => (
              <button
                key={value}
                id={`mood-btn-${value}`}
                type="button"
                onClick={() => {
                  setMood(value);
                  setSaved(false);
                }}
                className={`flex flex-col items-center gap-1 rounded-2xl p-2.5 text-xs font-black capitalize transition-all ${
                  mood === value
                    ? "scale-105 bg-primary text-white shadow-xs"
                    : "bg-lavender-50 text-muted hover:bg-lavender-100 dark:bg-white/10 dark:text-white/60"
                }`}
              >
                <span className="text-xl">{MOOD_EMOJI[value]}</span>
                {t.journal.moods[value]}
              </button>
            ))}
          </div>

          <textarea
            id="journal-note-input"
            className="mt-5 min-h-36 w-full rounded-2xl border border-lavender-200 bg-white/80 p-3.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setSaved(false);
            }}
            placeholder={t.journal.notePlaceholder}
          />

          {saveError ? <p className="mt-2 text-xs font-bold text-danger">{saveError}</p> : null}
          {saved ? <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">✅ {t.journal.saveSuccess}</p> : null}

          <Button id="save-journal-btn" className="mt-4 w-full" disabled={!note.trim() || saving} onClick={() => void save()}>
            <CheckCircle2 className="h-4 w-4" />
            {saving ? t.common.saving : t.journal.saveBtn}
          </Button>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <SectionHeader
              title={t.journal.timelineTitle}
              subtitle={t.journal.timelineSubtitle}
              action={
                <Button variant="secondary" size="sm" disabled={loading} onClick={() => void loadEntries()}>
                  {t.common.refresh}
                </Button>
              }
            />
            {loading && !entries.length ? (
              <LoadingSkeleton />
            ) : loadError ? (
              <div className="space-y-4">
                <IconNote icon={Activity} title="Could not load journal history" text={loadError} />
                <Button variant="secondary" onClick={() => void loadEntries()}>
                  {t.common.tryAgain}
                </Button>
              </div>
            ) : entries.length ? (
              <Timeline items={entries} />
            ) : (
              <EmptyState title={t.journal.noEntries} text={t.journal.noEntriesDesc} />
            )}
          </Card>

          {moodHistory.length > 0 && (
            <Card className="p-6">
              <SectionHeader title={t.journal.recentMoodLog} subtitle={t.journal.recentMoodLogSubtitle} />
              <div className="mt-4 flex flex-wrap gap-2">
                {moodHistory.map((entry) => {
                  const mKey = entry.mood.toLowerCase() as keyof typeof t.journal.moods;
                  const label = t.journal.moods[mKey] ?? entry.mood.toLowerCase();
                  return (
                    <div key={entry.id} className="flex items-center gap-2 rounded-2xl border border-lavender-100 bg-lavender-50/60 px-3 py-2 dark:border-white/10 dark:bg-white/10">
                      <span className="text-lg">{MOOD_EMOJI[entry.mood.toLowerCase()] ?? "🌸"}</span>
                      <div>
                        <p className="text-xs font-black capitalize text-ink dark:text-white">{label}</p>
                        <p className="text-[10px] text-muted dark:text-white/50">{new Date(entry.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}

export function NutritionPage() {
  // Re-export or redirect if imported from here
  const { t } = useLanguage();
  return (
    <Page title={t.nutrition.title} subtitle={t.nutrition.subtitle}>
      <Card className="p-6">
        <IconNote icon={FileText} title="Nutrition Guide Available in Main Navigation" text="Please visit the dedicated /nutrition route to access full meal plans and hydration tracker." />
      </Card>
    </Page>
  );
}

export function CaregiverPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<CaregiverContent[]>([]);
  useEffect(() => {
    Promise.all([api.caregiver("videos"), api.caregiver("tips"), api.caregiver("articles")])
      .then((groups) => setItems(groups.flat()))
      .catch(() => undefined);
  }, []);
  return (
    <Page title={t.caregiver.title} subtitle={t.caregiver.subtitle}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {items.length ? (
          items.map((item) => (
            <Card key={item.id} className="p-5">
              <Badge>{item.category}</Badge>
              <h2 className="mt-3 text-base font-black text-ink dark:text-white">{item.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted dark:text-white/60">{item.description}</p>
            </Card>
          ))
        ) : (
          <EmptyState title={t.caregiver.emptyTitle} text={t.caregiver.emptyText} />
        )}
      </div>
    </Page>
  );
}

export function ReportsPage() {
  const { t } = useLanguage();
  return (
    <Page title={t.reports.title} subtitle={t.reports.subtitle}>
      <Card className="p-6">
        <IconNote icon={FileText} title="Reports Zone Available in Main Navigation" text="Please visit the dedicated /reports route to access full printable PDF and CSV clinical records." />
      </Card>
    </Page>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const [, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  // Edit form state
  const [age, setAge] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [pregnancyStatus, setPregnancyStatus] = useState("Not pregnant");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");

  useEffect(() => {
    api.profile()
      .then((p) => {
        setProfile(p);
        if (p.age) setAge(p.age);
        if (p.weight) setWeight(p.weight);
        if (p.height) setHeight(p.height);
        if (p.blood_group) setBloodGroup(p.blood_group);
        if (p.pregnancy_status) setPregnancyStatus(p.pregnancy_status);
        if (p.delivery_date) setDeliveryDate(p.delivery_date);
        if (p.emergency_contact) setEmergencyContact(p.emergency_contact);
        if (p.district) setDistrict(p.district);
        if (p.village) setVillage(p.village);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load health profile"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError("");
    try {
      const updated = await api.updateProfile({
        age: age === "" ? null : Number(age),
        weight: weight === "" ? null : Number(weight),
        height: height === "" ? null : Number(height),
        blood_group: bloodGroup || null,
        pregnancy_status: pregnancyStatus || null,
        delivery_date: deliveryDate || null,
        emergency_contact: emergencyContact || null,
        district: district || null,
        village: village || null,
      });
      setProfile(updated);
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page title={t.profile.title} subtitle={t.profile.subtitle}>
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Column: Account Card */}
        <Card className="p-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
            <UserRound className="h-10 w-10" />
          </div>
          <h2 className="mt-4 text-lg font-black text-ink dark:text-white">{user?.name}</h2>
          <p className="text-xs font-semibold capitalize text-muted dark:text-white/60">
            {user?.role?.replace("_", " ")} · {currentLanguage.nativeName}
          </p>
          <Badge className="mt-3 bg-lavender-100 text-primary dark:bg-white/10 dark:text-lavender-300">
            {t.profile.authenticated}
          </Badge>

          <div className="mt-6 border-t border-lavender-100 pt-4 text-left text-xs space-y-2.5 dark:border-white/10">
            <div>
              <span className="text-muted">Email:</span>
              <p className="font-bold text-ink dark:text-white truncate">{user?.email}</p>
            </div>
            <div>
              <span className="text-muted">Account Role:</span>
              <p className="font-bold capitalize text-ink dark:text-white">{user?.role?.replace("_", " ")}</p>
            </div>
          </div>
        </Card>

        {/* Right Column: Editable Health Profile */}
        <Card className="p-6">
          <SectionHeader
            title="Maternal Health Profile"
            subtitle="Clinical biometrics and emergency contact details used across screenings, reports, and AI assistant."
          />

          {loading ? (
            <div className="mt-6">
              <LoadingSkeleton />
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Age (Years)</label>
                  <input
                    type="number"
                    min={12}
                    max={75}
                    value={age}
                    onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 28"
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 62.5"
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 162"
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  >
                    <option value="">Select blood group</option>
                    <option value="O+">O Positive (O+)</option>
                    <option value="O-">O Negative (O-)</option>
                    <option value="A+">A Positive (A+)</option>
                    <option value="A-">A Negative (A-)</option>
                    <option value="B+">B Positive (B+)</option>
                    <option value="B-">B Negative (B-)</option>
                    <option value="AB+">AB Positive (AB+)</option>
                    <option value="AB-">AB Negative (AB-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Pregnancy / Postpartum Status</label>
                  <select
                    value={pregnancyStatus}
                    onChange={(e) => setPregnancyStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  >
                    <option value="Not pregnant">Not pregnant / Preconception</option>
                    <option value="1st Trimester (Weeks 1-12)">1st Trimester (Weeks 1-12)</option>
                    <option value="2nd Trimester (Weeks 13-26)">2nd Trimester (Weeks 13-26)</option>
                    <option value="3rd Trimester (Weeks 27-40)">3rd Trimester (Weeks 27-40)</option>
                    <option value="Postpartum (0-6 months)">Postpartum (0-6 months)</option>
                    <option value="Postpartum (6-12 months)">Postpartum (6-12 months)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Expected / Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Bengaluru Urban"
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Village / Locality</label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="e.g. Yelahanka"
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                </div>
              </div>

              {error && <p className="text-xs font-bold text-danger">{error}</p>}
              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Maternal health profile updated successfully!
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving Changes..." : "Save Health Profile"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </Page>
  );
}

export function SettingsPage() {
  const { t } = useLanguage();
  return (
    <Page title={t.settings.title} subtitle={t.settings.subtitle}>
      <div className="space-y-6">
        <Card className="p-6">
          <SectionHeader title={t.settings.languagePreference} subtitle="Change the active interface language" />
          <div className="mt-4 flex items-center gap-4">
            <LanguageSelector />
          </div>
        </Card>
        <Card className="p-6">
          <IconNote icon={SettingsIcon} title={t.settings.controlsTitle} text={t.settings.unavailableDesc} />
        </Card>
      </div>
    </Page>
  );
}

export function ChatHistoryPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ChatMessage[]>([]);
  useEffect(() => {
    api.chatHistory().then(setItems).catch(() => undefined);
  }, []);
  return (
    <Page title={t.chatHistory.title} subtitle={t.chatHistory.subtitle}>
      <div className="space-y-4">
        {items.length ? (
          items.map((item) => (
            <Card key={item.id} className="p-5">
              <h2 className="text-sm font-black text-ink dark:text-white">{item.message}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted dark:text-white/60">{item.response}</p>
            </Card>
          ))
        ) : (
          <EmptyState title={t.chatHistory.emptyTitle} />
        )}
      </div>
    </Page>
  );
}

export function LogoutPage() {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  return (
    <Page title={t.logout.title}>
      <Card className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
        <IconNote icon={CheckCircle2} title={t.logout.endSession} text={t.logout.revokeToken} />
        <Button className="mt-5" onClick={() => void signOut()}>
          {t.logout.signOut}
        </Button>
      </Card>
    </Page>
  );
}

export function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <Page title={t.notFound.title}>
      <EmptyState title={t.notFound.heading} text={t.notFound.text} />
    </Page>
  );
}
