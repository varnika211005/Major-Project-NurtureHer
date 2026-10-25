import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HeartHandshake,
  Mail,
  Phone,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Save,
  X,
  ArrowRight,
  Link2,
} from "lucide-react";
import { api, Profile } from "@/lib/api";
import { Page } from "@/components/common/Page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/common/States";
import { useAuth } from "@/context/useAuth";

export function CaregiverProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Editable registration details
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [relationshipLabel, setRelationshipLabel] = useState(user?.relationship_label || "Caregiver");

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    api.profile()
      .then((p) => {
        if (!mounted) return;
        setProfile(p);
        if (p.name) setName(p.name);
        if (p.phone) setPhone(p.phone);
        if (p.relationship_label) setRelationshipLabel(p.relationship_label);
      })
      .catch((err) => {
        // Gracefully fall back to authenticated user session data
        console.warn("Could not fetch remote profile details, falling back to session data:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleSaveContactDetails(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setSaveSuccess(false);
    setSaveError("");

    try {
      const updated = await api.updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || null,
        relationship_label: relationshipLabel.trim() || null,
      });

      setProfile(updated);
      if (updated.name) setName(updated.name);
      if (updated.phone) setPhone(updated.phone);
      if (updated.relationship_label) setRelationshipLabel(updated.relationship_label);
      setSaveSuccess(true);
      setEditMode(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update profile details");
    } finally {
      setSaving(false);
    }
  }

  // Derive display values safely from profile or cached session user
  const displayName = name || profile?.name || user?.name || "Caregiver";
  const displayEmail = profile?.email || user?.email || "Not provided";
  const displayPhone = phone || profile?.phone || user?.phone || "Not provided";
  const caregiverId = profile?.caregiver_id || profile?.custom_id || user?.custom_id || "CRG-Pending";
  const preferredLanguage = user?.preferred_language || profile?.preferred_language || "English";
  const displayRelationship = relationshipLabel || profile?.relationship_label || user?.relationship_label || "Caregiver";

  // Mother Connection details
  const linkedMother = profile?.linked_mother || (user?.assigned_mother_id ? { id: "", name: "", custom_id: user.assigned_mother_id } : null);
  const connectionStatus = profile?.caregiver_status || (linkedMother ? "pending" : "not_linked");
  const isApproved = connectionStatus === "approved" || connectionStatus === "active";
  const isPending = connectionStatus === "pending";
  const isRevoked = connectionStatus === "revoked";
  const isUnlinked = !linkedMother || connectionStatus === "not_linked";

  return (
    <Page title="Profile" subtitle="Your account information and connection status.">
      <div className="relative z-0 space-y-6 pt-1 sm:pt-2">
        {/* Registration Details Card */}
        <Card className="overflow-hidden p-6 shadow-card transition sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
                <HeartHandshake className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-black text-ink dark:text-white sm:text-2xl">
                    {displayName}
                  </h2>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-lavender-300">
                    Caregiver
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 inline-flex items-center">
                    <ShieldCheck className="h-3 w-3" /> Verified Account
                  </Badge>
                </div>
                <p className="mt-1 text-xs font-semibold text-muted dark:text-white/60">
                  Caregiver ID: <span className="font-mono font-bold text-primary dark:text-lavender-300">{caregiverId}</span> · Language: {preferredLanguage}
                </p>
              </div>
            </div>

            {!editMode ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditMode(true);
                  setSaveSuccess(false);
                  setSaveError("");
                }}
                className="gap-1.5 self-start sm:self-center"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Contact Details
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditMode(false);
                  setSaveError("");
                }}
                className="gap-1.5 self-start sm:self-center"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
          </div>

          {saveSuccess && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Contact details updated successfully!
            </div>
          )}

          {saveError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {saveError}
            </div>
          )}

          {loading ? (
            <div className="mt-6">
              <LoadingSkeleton />
            </div>
          ) : editMode ? (
            <form onSubmit={handleSaveContactDetails} className="mt-6 space-y-4 border-t border-lavender-100 pt-6 dark:border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">
                Edit Contact Information
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Rao"
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink dark:text-white">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="mt-1 w-full rounded-xl border border-lavender-200 bg-white p-2.5 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
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

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving Changes..." : "Save Contact Details"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-6 border-t border-lavender-100 pt-6 dark:border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">
                Registered Account Details
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-lavender-100 bg-surface/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-muted dark:text-white/60">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Full Name</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-ink dark:text-white">{displayName}</p>
                </div>

                <div className="rounded-2xl border border-lavender-100 bg-surface/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-muted dark:text-white/60">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Registered Email</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-black text-ink dark:text-white">{displayEmail}</p>
                </div>

                <div className="rounded-2xl border border-lavender-100 bg-surface/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-muted dark:text-white/60">
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Contact Phone</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-ink dark:text-white">{displayPhone}</p>
                </div>

                <div className="rounded-2xl border border-lavender-100 bg-surface/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-muted dark:text-white/60">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Account Role</span>
                  </div>
                  <p className="mt-1 text-sm font-black capitalize text-ink dark:text-white">Caregiver</p>
                </div>

                <div className="rounded-2xl border border-lavender-100 bg-surface/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-muted dark:text-white/60">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Caregiver ID</span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-black text-primary dark:text-lavender-200">{caregiverId}</p>
                </div>

                <div className="rounded-2xl border border-lavender-100 bg-surface/50 p-4 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-muted dark:text-white/60">
                    <HeartHandshake className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Relationship to Patient</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-ink dark:text-white">{displayRelationship}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Compact Mother Connection Section */}
        <Card className="overflow-hidden p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-black text-ink dark:text-white">Mother Connection</h3>
              </div>
              <p className="mt-1 text-xs text-muted dark:text-white/60">
                Maternal profile connection and CareCircle access status
              </p>
            </div>

            {/* Status Badge */}
            <div>
              {isApproved && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 inline-flex items-center">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approved by Patient
                </Badge>
              )}
              {isPending && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 gap-1 inline-flex items-center">
                  <AlertCircle className="h-3.5 w-3.5" /> Pending Patient Consent
                </Badge>
              )}
              {isRevoked && (
                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 gap-1 inline-flex items-center">
                  <AlertCircle className="h-3.5 w-3.5" /> Consent Revoked
                </Badge>
              )}
              {isUnlinked && (
                <Badge className="bg-lavender-100 text-muted dark:bg-white/10 dark:text-white/70">
                  Not Linked
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-lavender-100 pt-6 dark:border-white/10">
            {isApproved && linkedMother && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Linked Patient</span>
                    <p className="mt-1 text-sm font-black text-ink dark:text-white">
                      {linkedMother.name || "Authorized Patient"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Patient ID</span>
                    <p className="mt-1 font-mono text-sm font-black text-primary dark:text-lavender-200">
                      {linkedMother.custom_id || "MTH"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Relationship</span>
                    <p className="mt-1 text-sm font-black text-ink dark:text-white">
                      {displayRelationship}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">CareCircle Access</span>
                    <p className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-300">
                      Authorized Companion
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-lavender-50/60 p-4 text-xs text-muted dark:bg-white/5 dark:text-white/60 sm:flex-row sm:items-center">
                  <p>
                    You have active CareCircle companion authorization to support this mother's maternal health journey.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate("/caregiver")}
                    className="gap-1.5 shrink-0"
                  >
                    Open Dashboard
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {isPending && linkedMother && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Requested Patient ID</span>
                    <p className="mt-1 font-mono text-sm font-black text-ink dark:text-white">
                      {linkedMother.custom_id || user?.assigned_mother_id || "MTH-Pending"}
                      {linkedMother.name ? ` (${linkedMother.name})` : ""}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Connection Status</span>
                    <p className="mt-1 text-sm font-black text-amber-700 dark:text-amber-300">
                      Awaiting Patient Consent
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-50/60 p-4 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                  <p>
                    Your connection request has been registered. Once the mother approves your CareCircle companion request in her portal, you will be able to access authorized updates.
                  </p>
                </div>
              </div>
            )}

            {isRevoked && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
                  <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Consent Status</span>
                  <p className="mt-1 text-sm font-black text-rose-700 dark:text-rose-300">
                    Access Revoked by Patient
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted dark:text-white/60">
                    Access to this mother's health profile was revoked by the patient. If this was unintended, request a new CareCircle QR code or link from the mother.
                  </p>
                </div>

                <div className="flex justify-start">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate("/caregiver?tab=connect")}
                    className="gap-1.5"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Connect via CareCircle
                  </Button>
                </div>
              </div>
            )}

            {isUnlinked && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-lavender-200 p-8 text-center dark:border-white/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lavender-100 text-primary dark:bg-white/10 dark:text-lavender-300">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <h4 className="mt-3 text-sm font-black text-ink dark:text-white">No Mother Linked Yet</h4>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-muted dark:text-white/60">
                  You are not currently linked to any mother's profile. Connect with an expectant or new mother using her CareCircle QR code or Patient ID to access companion features and provide personalized care support.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate("/caregiver?tab=connect")}
                  className="mt-4 gap-1.5"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Connect via CareCircle
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Page>
  );
}
