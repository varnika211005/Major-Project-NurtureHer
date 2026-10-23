import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Baby, LogIn, Sparkles, Stethoscope } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/useLanguage";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import type { TranslationSchema } from "@/i18n/types";
import "./AuthPages.css";

/**
 * Demo entry point. Each card maps to a demo account provisioned by
 * `scripts/seed.py`. Credentials are read from Vite env vars (with defaults
 * matching the seed) and never rendered to the DOM. The server still performs
 * a real login, so this page is only a convenience shortcut.
 */
import type { UserRole, LoginIdentifiers } from "@/lib/api";

type DemoRole = "mother" | "caregiver" | "doctor";

type DemoRoleConfig = {
  email: string;
  password: string;
  portal: UserRole;
  identifiers: LoginIdentifiers;
};

const demoConfig: Record<DemoRole, DemoRoleConfig> = {
  mother: {
    email: import.meta.env.VITE_DEMO_MOTHER_EMAIL ?? "mother@nurtureher.com",
    password: import.meta.env.VITE_DEMO_MOTHER_PASSWORD ?? "Password123!",
    portal: "mother",
    identifiers: {
      doctor_id: import.meta.env.VITE_DEMO_MOTHER_DOCTOR_ID ?? "DOC-100001",
    },
  },
  caregiver: {
    email: import.meta.env.VITE_DEMO_CAREGIVER_EMAIL ?? "caregiver@nurtureher.com",
    password: import.meta.env.VITE_DEMO_CAREGIVER_PASSWORD ?? "Password123!",
    portal: "caregiver",
    identifiers: {
      mother_id: import.meta.env.VITE_DEMO_CAREGIVER_MOTHER_ID ?? "MTH-100001",
    },
  },
  doctor: {
    email: import.meta.env.VITE_DEMO_DOCTOR_EMAIL ?? "doctor@nurtureher.com",
    password: import.meta.env.VITE_DEMO_DOCTOR_PASSWORD ?? "Password123!",
    portal: "doctor",
    identifiers: {
      medical_license: import.meta.env.VITE_DEMO_DOCTOR_LICENSE ?? "MCI-2024-98765",
    },
  },
};

const roleOrder: DemoRole[] = ["mother", "caregiver", "doctor"];

const roleIcons: Record<DemoRole, typeof Sparkles> = {
  mother: Sparkles,
  caregiver: Baby,
  doctor: Stethoscope,
};

function roleCopy(t: TranslationSchema, role: DemoRole) {
  switch (role) {
    case "mother":
      return { title: t.demo.motherTitle, desc: t.demo.motherDesc, color: "border-lavender-200 bg-lavender-50/70 text-primary hover:bg-lavender-100" };
    case "caregiver":
      return { title: t.demo.caregiverTitle, desc: t.demo.caregiverDesc, color: "border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100" };
    case "doctor":
      return { title: t.demo.doctorTitle, desc: t.demo.doctorDesc, color: "border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100" };
  }
}

export function DemoPage() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [pending, setPending] = useState<DemoRole | null>(null);
  const [error, setError] = useState("");

  async function enterDemo(role: DemoRole) {
    const creds = demoConfig[role];
    setError("");
    if (!creds.email || !creds.password) {
      setError(t.demo.unavailable);
      return;
    }
    setPending(role);
    try {
      await signIn(creds.email, creds.password, creds.portal, creds.identifiers);
      navigate("/", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.demo.authFailed);
      setPending(null);
    }
  }

  return (
    <div className="nh-auth flex">
      <div className="fixed right-4 top-4 z-20">
        <LanguageSelector />
      </div>

      <div className="nh-auth-card w-full max-w-2xl rounded-[28px] border border-lavender-100 bg-surface/95 p-8 shadow-card dark:border-white/10">
        <div className="nh-auth-brand mb-5 flex items-center gap-3">
          <img
            src="/nurtureher-logo.png"
            alt={t.common.appName}
            className="h-9 w-auto max-w-[180px] object-contain"
          />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-lavender-200 bg-lavender-50/70 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/80">
          {t.demo.badge}
        </span>

        <h1 className="nh-auth-title mt-4 text-2xl font-black text-ink dark:text-white">{t.demo.title}</h1>
        <p className="nh-auth-subtitle mt-1 text-xs leading-5 text-muted dark:text-white/60">{t.demo.subtitle}</p>

        {error ? (
          <p role="alert" className="mt-4 rounded-2xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-bold text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {roleOrder.map((role) => {
            const copy = roleCopy(t, role);
            const Icon = roleIcons[role];
            const busy = pending === role;
            return (
              <div
                key={role}
                className="flex flex-col rounded-2xl border border-lavender-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${copy.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-black text-ink dark:text-white">{copy.title}</p>
                </div>
                <p className="mt-2 flex-1 text-[11px] leading-4 text-muted dark:text-white/60">{copy.desc}</p>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => enterDemo(role)}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-2 text-xs font-black text-onbrand shadow-soft transition hover:-translate-y-0.5 disabled:opacity-70"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  {busy ? t.demo.entering : t.demo.enter}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-[11px] leading-4 text-muted dark:text-white/50">{t.demo.disclaimer}</p>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-bold">
          <Link to="/login" className="text-primary hover:underline">
            {t.demo.backToLogin}
          </Link>
          <Link to="/" className="text-muted hover:underline dark:text-white/60">
            {t.demo.backToHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
