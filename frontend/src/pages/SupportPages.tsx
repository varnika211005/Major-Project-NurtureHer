import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  HeartHandshake,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ChatMessage, Profile } from "@/lib/api";
import { formatDate } from "@/lib/locale";
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

export { HealthInsightsPage as InsightsPage } from "./HealthInsights";

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
          time: formatDate(item.created_at),
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
                        <p className="text-[10px] text-muted dark:text-white/50">{formatDate(entry.created_at)}</p>
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  // Common editable fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState<number | "">("");

  // Mother-specific editable fields
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [pregnancyStatus, setPregnancyStatus] = useState("Not pregnant");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");

  // Doctor-specific editable fields
  const [specialization, setSpecialization] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [experienceYears, setExperienceYears] = useState<number | "">("");
  const [hospitalClinic, setHospitalClinic] = useState("");

  // Caregiver-specific editable fields
  const [relationshipLabel, setRelationshipLabel] = useState("Caregiver");

  const loadProfile = useCallback(() => {
    setLoading(true);
    api.profile()
      .then((p) => {
        setProfile(p);
        setName(p.name || user?.name || "");
        setPhone(p.phone || user?.phone || "");
        if (p.age !== undefined && p.age !== null) setAge(p.age);
        else if (user?.age !== undefined && user?.age !== null) setAge(user.age);

        // Mother fields
        if (p.weight) setWeight(p.weight);
        if (p.height) setHeight(p.height);
        if (p.blood_group) setBloodGroup(p.blood_group);
        if (p.pregnancy_status) setPregnancyStatus(p.pregnancy_status);
        if (p.delivery_date) setDeliveryDate(p.delivery_date);
        if (p.emergency_contact) setEmergencyContact(p.emergency_contact);
        if (p.district) setDistrict(p.district);
        if (p.village) setVillage(p.village);

        // Doctor fields
        if (p.specialization) setSpecialization(p.specialization);
        if (p.qualifications) setQualifications(p.qualifications);
        if (p.experience_years !== undefined && p.experience_years !== null) setExperienceYears(p.experience_years);
        if (p.hospital_clinic) setHospitalClinic(p.hospital_clinic);

        // Caregiver fields
        if (p.relationship_label) setRelationshipLabel(p.relationship_label);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError("");

    try {
      const payload: Partial<Profile> = {
        name: name.trim() || undefined,
        phone: phone.trim() || null,
      };

      if (user?.role === "mother") {
        payload.age = age === "" ? null : Number(age);
        payload.weight = weight === "" ? null : Number(weight);
        payload.height = height === "" ? null : Number(height);
        payload.blood_group = bloodGroup || null,
        payload.pregnancy_status = pregnancyStatus || null;
        payload.delivery_date = deliveryDate || null;
        payload.emergency_contact = emergencyContact || null;
        payload.district = district || null;
        payload.village = village || null;
      } else if (user?.role === "doctor") {
        payload.age = age === "" ? null : Number(age);
        payload.specialization = specialization.trim() || null;
        payload.qualifications = qualifications.trim() || null;
        payload.experience_years = experienceYears === "" ? null : Number(experienceYears);
        payload.hospital_clinic = hospitalClinic.trim() || null;
      } else if (user?.role === "caregiver") {
        payload.relationship_label = relationshipLabel.trim() || null;
      }

      const updated = await api.updateProfile(payload);
      setProfile(updated);
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  const assignedDoctorsDisplay =
    profile?.assigned_doctors && profile.assigned_doctors.length > 0
      ? profile.assigned_doctors.map((d) => `${d.name} (${d.custom_id || "DOC"})`).join(", ")
      : profile?.assigned_doctor_id || user?.assigned_doctor_id || "None Assigned";

  return (
    <Page title={t.profile.title} subtitle={t.profile.subtitle}>
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Column: Role-Specific Account Card */}
        <Card className="p-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
            {user?.role === "doctor" ? (
              <Stethoscope className="h-10 w-10" />
            ) : user?.role === "caregiver" ? (
              <HeartHandshake className="h-10 w-10" />
            ) : (
              <UserRound className="h-10 w-10" />
            )}
          </div>
          <h2 className="mt-4 text-lg font-black text-ink dark:text-white">
            {name || profile?.name || user?.name}
          </h2>
          <p className="text-xs font-semibold capitalize text-muted dark:text-white/60">
            {user?.role?.replace("_", " ")} · {currentLanguage.nativeName}
          </p>

          {/* Verification Badge */}
          {user?.role === "doctor" ? (
            profile?.is_verified ?? user?.is_verified ? (
              <Badge className="mt-3 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 inline-flex items-center">
                <ShieldCheck className="h-3 w-3" /> Verified Clinical Provider
              </Badge>
            ) : (
              <Badge className="mt-3 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 gap-1 inline-flex items-center">
                <AlertCircle className="h-3 w-3" /> Pending Administrator Verification
              </Badge>
            )
          ) : (
            <Badge className="mt-3 bg-lavender-100 text-primary dark:bg-white/10 dark:text-lavender-300">
              {t.profile.authenticated}
            </Badge>
          )}

          <div className="mt-6 border-t border-lavender-100 pt-4 text-left text-xs space-y-2.5 dark:border-white/10">
            <div>
              <span className="text-muted">Email Address:</span>
              <p className="font-bold text-ink dark:text-white truncate">{user?.email}</p>
            </div>

            <div>
              <span className="text-muted">Contact Phone:</span>
              <p className="font-bold text-ink dark:text-white">
                {phone || profile?.phone || user?.phone || "Not provided"}
              </p>
            </div>

            <div>
              <span className="text-muted">Account Role:</span>
              <p className="font-bold capitalize text-ink dark:text-white">{user?.role?.replace("_", " ")}</p>
            </div>

            {/* Role-specific identifiers */}
            {user?.role === "doctor" && (
              <>
                <div>
                  <span className="text-muted">Doctor ID:</span>
                  <p className="font-mono font-bold text-primary dark:text-lavender-200">
                    {profile?.custom_id || user?.custom_id || "DOC-Pending"}
                  </p>
                </div>
                <div>
                  <span className="text-muted">Medical License:</span>
                  <p className="font-mono font-bold text-ink dark:text-white">
                    {profile?.medical_license || user?.medical_license || "Not provided"}
                  </p>
                </div>
              </>
            )}

            {user?.role === "mother" && (
              <>
                <div>
                  <span className="text-muted">Mother / Patient ID:</span>
                  <p className="font-mono font-bold text-primary dark:text-lavender-200">
                    {profile?.custom_id || user?.custom_id || "MTH-Pending"}
                  </p>
                </div>
                <div>
                  <span className="text-muted">Assigned Doctor:</span>
                  <p className="font-bold text-ink dark:text-white">
                    {assignedDoctorsDisplay}
                  </p>
                </div>
              </>
            )}

            {user?.role === "caregiver" && (
              <>
                <div>
                  <span className="text-muted">Caregiver ID:</span>
                  <p className="font-mono font-bold text-primary dark:text-lavender-200">
                    {profile?.custom_id || user?.custom_id || "CRG-Pending"}
                  </p>
                </div>
                <div>
                  <span className="text-muted">Linked Patient:</span>
                  <p className="font-bold text-ink dark:text-white">
                    {profile?.linked_mother
                      ? `${profile.linked_mother.name} (${profile.linked_mother.custom_id})`
                      : profile?.assigned_mother_id || user?.assigned_mother_id || "None Assigned"}
                  </p>
                </div>
                <div>
                  <span className="text-muted">CareCircle Consent:</span>
                  <p className="font-bold text-ink dark:text-white capitalize">
                    {profile?.caregiver_status === "approved" ? "Approved by Patient" : "Pending Consent"}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Right Column: Role-Appropriate Profile Form */}
        <Card className="p-6">
          {user?.role === "doctor" && (
            <SectionHeader
              title="Doctor Professional Profile"
              subtitle="Clinical credentials, qualifications, specialization, and hospital affiliation."
            />
          )}

          {user?.role === "mother" && (
            <SectionHeader
              title="Maternal Health Profile"
              subtitle="Clinical biometrics and emergency contact details used across screenings, reports, and AI assistant."
            />
          )}

          {user?.role === "caregiver" && (
            <SectionHeader
              title="Caregiver Companion Profile"
              subtitle="Caregiver details, relationship to patient, and CareCircle consent status."
            />
          )}

          {user?.role !== "doctor" && user?.role !== "mother" && user?.role !== "caregiver" && (
            <SectionHeader
              title="Account Profile"
              subtitle="Manage your system account details."
            />
          )}

          {loading ? (
            <div className="mt-6">
              <LoadingSkeleton />
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
              {/* Common Account Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Priya Sharma"
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Contact Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                </div>
              </div>

              {/* DOCTOR SPECIFIC FIELDS */}
              {user?.role === "doctor" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Doctor ID</label>
                      <input
                        type="text"
                        disabled
                        value={profile?.custom_id || user?.custom_id || "DOC-Pending"}
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-lavender-50 p-2.5 font-mono text-xs text-muted dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Medical License</label>
                      <input
                        type="text"
                        disabled
                        value={profile?.medical_license || user?.medical_license || "N/A"}
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-lavender-50 p-2.5 font-mono text-xs text-muted dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Age (Years)</label>
                      <input
                        type="number"
                        min={20}
                        max={100}
                        value={age}
                        onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="e.g. 38"
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Clinical Specialization</label>
                      <input
                        type="text"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. Obstetrics & Gynaecology"
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Qualifications & Degrees</label>
                      <input
                        type="text"
                        value={qualifications}
                        onChange={(e) => setQualifications(e.target.value)}
                        placeholder="e.g. MBBS, MD (OB-GYN), DGO"
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Years of Clinical Experience</label>
                      <input
                        type="number"
                        min={0}
                        max={70}
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="e.g. 12"
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Hospital / Clinic Affiliation</label>
                      <input
                        type="text"
                        value={hospitalClinic}
                        onChange={(e) => setHospitalClinic(e.target.value)}
                        placeholder="e.g. Apollo Cradle Hospital"
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* MOTHER SPECIFIC FIELDS */}
              {user?.role === "mother" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Mother / Patient ID</label>
                      <input
                        type="text"
                        disabled
                        value={profile?.custom_id || user?.custom_id || "MTH-Pending"}
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-lavender-50 p-2.5 font-mono text-xs text-muted dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Assigned Clinical Doctor</label>
                      <input
                        type="text"
                        disabled
                        value={assignedDoctorsDisplay}
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-lavender-50 p-2.5 text-xs text-muted dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                      />
                    </div>
                  </div>

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
                </>
              )}

              {/* CAREGIVER SPECIFIC FIELDS */}
              {user?.role === "caregiver" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Caregiver ID</label>
                      <input
                        type="text"
                        disabled
                        value={profile?.custom_id || user?.custom_id || "CRG-Pending"}
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-lavender-50 p-2.5 font-mono text-xs text-muted dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Linked Patient</label>
                      <input
                        type="text"
                        disabled
                        value={
                          profile?.linked_mother
                            ? `${profile.linked_mother.name} (${profile.linked_mother.custom_id})`
                            : profile?.assigned_mother_id || user?.assigned_mother_id || "None Assigned"
                        }
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-lavender-50 p-2.5 text-xs text-muted dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">CareCircle Consent Status</label>
                      <div className="mt-1">
                        <Badge
                          className={
                            profile?.caregiver_status === "approved"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          }
                        >
                          {profile?.caregiver_status === "approved" ? "Approved by Patient" : "Pending Patient Consent"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-ink dark:text-white">Relationship to Patient</label>
                      <select
                        value={relationshipLabel}
                        onChange={(e) => setRelationshipLabel(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                      >
                        <option value="Caregiver">Caregiver</option>
                        <option value="Spouse / Partner">Spouse / Partner</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Family Member">Family Member</option>
                        <option value="Professional Caregiver">Professional Caregiver</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {error && <p className="text-xs font-bold text-danger">{error}</p>}
              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Profile updated successfully!
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving Changes..." : "Save Profile Details"}
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
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <Page title={t.logout.title}>
      <Card className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
        <IconNote icon={CheckCircle2} title={t.logout.endSession} text={t.logout.revokeToken} />
        <Button className="mt-5" onClick={() => void handleSignOut()}>
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
