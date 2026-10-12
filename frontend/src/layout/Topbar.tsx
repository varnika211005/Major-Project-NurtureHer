import { LifeBuoy, Moon, PhoneCall, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/useLanguage";

export function Topbar() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem("nurtureher_theme") === "dark");
  const initials =
    user?.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "NH";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("nurtureher_theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <header className="sticky top-0 z-20 border-b border-lavender-100 bg-background/80 px-4 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-[#1F1326]/80 md:px-8 md:py-4">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 pl-14 lg:pl-0">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-muted dark:text-white/60 sm:text-sm">
            {t.topbar.welcome}, {user?.name ?? ""}
          </p>
          <h2 className="truncate text-base font-black text-ink dark:text-white sm:text-xl">
            {t.topbar.dashboardReady}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Emergency SOS Quick Button */}
          <button
            type="button"
            onClick={() => navigate("/emergency")}
            className="flex h-10 items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50/80 px-3 text-xs font-black text-rose-600 shadow-xs transition hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            title="Emergency SOS & 112 Dispatch"
          >
            <PhoneCall className="h-3.5 w-3.5 animate-pulse text-rose-500" />
            <span className="hidden sm:inline">SOS 112</span>
          </button>

          <LanguageSelector />

          <Button
            variant="secondary"
            className="h-10 w-10 px-0 rounded-2xl"
            onClick={() => setDark((value) => !value)}
            aria-label={dark ? t.topbar.lightMode : t.topbar.darkMode}
            title={dark ? t.topbar.lightMode : t.topbar.darkMode}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex min-h-10 items-center gap-2 rounded-2xl border border-lavender-100 bg-white/90 px-1.5 py-1 shadow-card backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/10 sm:pr-3"
            aria-label={t.topbar.openProfile}
            title={t.topbar.openProfile}
          >
            <Avatar initials={initials} />
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-32 truncate text-sm font-black text-ink dark:text-white">{user?.name}</span>
              <span className="block text-xs font-semibold capitalize text-muted dark:text-white/50">{user?.role?.replace("_", " ")}</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
