import { NavLink } from "react-router-dom";
import { Heart, Menu, Sparkles, X, Shield, Stethoscope, Baby } from "lucide-react";
import { getNavigationSections } from "@/layout/navigation";
import { useLanguage } from "@/context/useLanguage";
import { useAuth } from "@/context/useAuth";
import { cn } from "@/lib/utils";

export function Sidebar({ open, onToggle, onClose }: { open: boolean; onToggle: () => void; onClose: () => void }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const sections = getNavigationSections(t, user?.role);

  const getRoleIcon = () => {
    switch (user?.role) {
      case "doctor":
        return <Stethoscope className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
      case "admin":
        return <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />;
      case "caregiver":
        return <Baby className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-primary" />;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 shadow-card backdrop-blur-xl transition hover:-translate-y-0.5 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5 text-primary" />
      </button>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[min(88vw,21rem)] transform border-r border-lavender-100 bg-white/90 px-4 py-5 shadow-glow backdrop-blur-2xl transition duration-300 dark:border-white/10 dark:bg-[#1F1326]/92 sm:px-5 sm:py-6 lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
              <Heart className="h-6 w-6 fill-white/20" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-ink dark:text-white">{t.common.appName}</p>
              <p className="text-xs font-bold text-muted dark:text-white/50">{t.common.tagline}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted transition hover:bg-lavender-50 hover:text-primary lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active Role Card */}
        <div className="mb-5 rounded-[22px] border border-lavender-200/80 bg-gradient-to-br from-lavender-50 via-white to-purple-50/50 p-3.5 shadow-2xs dark:border-white/10 dark:from-white/10 dark:to-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getRoleIcon()}
              <span className="text-xs font-black capitalize text-ink dark:text-white">
                {user?.role?.replace("_", " ") || "Mother"} Portal
              </span>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary dark:bg-primary/20">
              Active
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-muted dark:text-white/55">
            {user?.name} · {user?.email}
          </p>
        </div>

        <nav className="no-scrollbar flex h-[calc(100vh-230px)] flex-col gap-5 overflow-y-auto pr-1">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.22em] text-muted/60 dark:text-white/35">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={({ isActive }) =>
                        cn(
                          "group flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-primary/30",
                          isActive
                            ? "bg-gradient-to-r from-primary to-accent text-white shadow-glow"
                            : "text-muted hover:-translate-y-0.5 hover:bg-lavender-50/70 hover:text-primary hover:shadow-soft dark:text-white/60 dark:hover:bg-white/10",
                        )
                      }
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 transition group-hover:bg-lavender-100 dark:bg-white/10">
                        <Icon className="h-4 w-4 shrink-0" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      {open ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-ink/20 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      ) : null}
    </>
  );
}
