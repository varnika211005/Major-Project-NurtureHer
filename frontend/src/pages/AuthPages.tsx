import { FormEvent, useEffect, useState } from "react";
import {
  Baby,
  HeartPulse,
  LogIn,
  Shield,
  Sparkles,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/useLanguage";
import "./AuthPages.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/common/FormField";
import { LanguageSelector } from "@/components/common/LanguageSelector";

const DEMO_ACCOUNTS = [
  {
    role: "Mother",
    email: "mother@nurtureher.com",
    password: "Password123!",
    icon: Sparkles,
    color: "border-lavender-200 bg-lavender-50/70 text-primary hover:bg-lavender-100",
  },
  {
    role: "Doctor",
    email: "doctor@nurtureher.com",
    password: "Password123!",
    icon: Stethoscope,
    color: "border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100",
  },
  {
    role: "Caregiver",
    email: "caregiver@nurtureher.com",
    password: "Password123!",
    icon: Baby,
    color: "border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100",
  },
  {
    role: "Admin",
    email: "admin@nurtureher.com",
    password: "Password123!",
    icon: Shield,
    color: "border-purple-200 bg-purple-50/70 text-purple-700 hover:bg-purple-100",
  },
];

export function AuthPage({ initialMode = "login" }: { initialMode?: "login" | "register" } = {}) {
  const { signIn, signUp } = useAuth();
  const { t, language } = useLanguage();
  const [registering, setRegistering] = useState(initialMode === "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("mother");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Paint the viewport background on <body> (which always spans at least the
  // visible viewport) so this section can stay content-height. Removed on
  // unmount so no other route is affected.
  useEffect(() => {
    document.body.classList.add("nh-auth-bg");
    return () => document.body.classList.remove("nh-auth-bg");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (registering) {
        await signUp({ name, email, password, role, preferred_language: language });
      } else {
        await signIn(email, password);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.auth.authError);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin(account: (typeof DEMO_ACCOUNTS)[0]) {
    setError("");
    setSubmitting(true);
    setEmail(account.email);
    setPassword(account.password);
    try {
      await signIn(account.email, account.password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Demo login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="nh-auth flex">
      <div className="fixed right-4 top-4 z-20">
        <LanguageSelector />
      </div>

      <Card className="nh-auth-card w-full max-w-lg border-lavender-100 p-8 shadow-card dark:border-white/10">
        {/* Brand Header */}
        <div className="nh-auth-brand mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-black text-ink dark:text-white">{t.common.appName}</p>
            <p className="text-xs text-muted dark:text-white/50">{t.common.tagline}</p>
          </div>
        </div>

        <h1 className="nh-auth-title text-2xl font-black text-ink dark:text-white">
          {registering ? t.auth.createAccount : t.auth.welcomeBack}
        </h1>
        <p className="nh-auth-subtitle mt-1 text-xs leading-5 text-muted dark:text-white/60">
          {registering ? t.auth.signUpSubtitle : t.auth.signInSubtitle}
        </p>

        {/* Credentials Form */}
        <form className="nh-auth-form mt-6 space-y-3.5" onSubmit={submit}>
          {registering ? (
            <>
              <FormField
                label={t.auth.fullName}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
              />
              <div>
                <label className="mb-1 block text-xs font-bold text-ink dark:text-white">
                  User Role / Function
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-lavender-200 bg-white/80 px-3 text-xs font-semibold text-ink outline-none transition focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                >
                  <option value="mother">Mother (Personal Health & Screenings)</option>
                  <option value="doctor">Doctor (Consultation & Clinical Roster)</option>
                  <option value="caregiver">Caregiver (Family Support & Monitoring)</option>
                  <option value="admin">System Admin (Audit & User Management)</option>
                </select>
              </div>
            </>
          ) : null}

          <FormField
            label={t.auth.email}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <FormField
            label={t.auth.password}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />

          {error ? <p className="text-xs font-bold text-danger">{error}</p> : null}

          <Button className="w-full" disabled={submitting}>
            {registering ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {submitting ? t.auth.connecting : registering ? t.auth.createAccount : t.auth.signIn}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-xs font-bold text-primary hover:underline"
          onClick={() => setRegistering((value) => !value)}
        >
          {registering ? t.auth.alreadyHaveAccount : t.auth.newToNurtureHer}
        </button>

        {/* 1-Click Demo Accounts Switcher */}
        <div className="nh-auth-demo mt-8 border-t border-lavender-100 pt-5 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted dark:text-white/50">
              ⚡ 1-Click Demo Access
            </span>
            <span className="text-[11px] text-muted dark:text-white/40">Select role to sign in instantly</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.role}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin(acc)}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${acc.color}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black">{acc.role}</p>
                    <p className="truncate text-[10px] opacity-70">1-click demo</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}