import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Baby, Menu, PanelLeftClose, PanelLeftOpen, Sparkles, Shield, Stethoscope, X } from "lucide-react";
import { getNavigationSections } from "@/layout/navigation";
import { useLanguage } from "@/context/useLanguage";
import { useAuth } from "@/context/useAuth";
import { BrandEmblem, BrandLockup } from "@/components/brand/BrandLockup";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Desktop sidebar with ChatGPT-style expanded/collapsed modes plus the
 * existing mobile slide-in drawer. The collapse preference is persisted in
 * localStorage (`nurtureher_sidebar_collapsed`, "1" = collapsed) by AppShell;
 * this component only renders the supplied state. Collapsed mode hides labels
 * but keeps every navigation icon with an accessible tooltip, and the mobile
 * drawer always shows full labels regardless of the desktop preference.
 */
export function Sidebar({
  open,
  collapsed,
  onToggleCollapsed,
  onToggle,
  onClose,
}: {
  open: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const sections = getNavigationSections(t, user?.role);
  const isDesktop = useIsDesktop();
  const iconOnly = collapsed && isDesktop;

  // Mobile drawer: Escape closes it and page scrolling stays locked while open.
  useEffect(() => {
    if (!open || isDesktop) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isDesktop, onClose]);

  const getRoleIcon = () => {
    switch (user?.role) {
      case "doctor":
        return <Stethoscope className="h-3.5 w-3.5 text-sky" />;
      case "admin":
        return <Shield className="h-3.5 w-3.5 text-accent" />;
      case "caregiver":
        return <Baby className="h-3.5 w-3.5 text-amber" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-primary" />;
    }
  };

  const collapseLabel = collapsed ? t.sidebar.expand : t.sidebar.collapse;

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={onToggle}
          className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl bg-surface/90 shadow-card backdrop-blur-xl transition hover:-translate-y-0.5 lg:hidden"
          aria-label={t.sidebar.openMenu}
          aria-expanded={open}
          aria-controls="app-sidebar"
        >
          <Menu className="h-5 w-5 text-primary" />
        </button>
      ) : null}
      <aside
        id="app-sidebar"
        aria-label={t.sidebar.navLabel}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(88vw,21rem)] flex-col transform border-r border-lavender-200/70 bg-surface/90 px-4 py-5 shadow-glow backdrop-blur-2xl transition-[transform,width] duration-300 sm:px-5 sm:py-6 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:w-80",
          collapsed && "lg:w-[92px]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header: official logo sits beside the sidebar toggle */}
        <div
          className={cn(
            "mb-5 flex items-center justify-between gap-2 px-1",
            iconOnly && "flex-col justify-center gap-3 px-0",
          )}
        >
          {iconOnly ? (
            <Tooltip content={t.common.appName}>
              <NavLink
                to="/"
                aria-label={t.common.appName}
                title={t.common.appName}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className="flex shrink-0 items-center justify-center rounded-2xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <BrandEmblem compact className="h-10 w-10 rounded-xl" />
              </NavLink>
            </Tooltip>
          ) : (
            <NavLink
              to="/"
              aria-label={t.common.appName}
              title={t.common.appName}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className="flex min-w-0 items-center rounded-2xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <BrandLockup />
            </NavLink>
          )}
          <div className={cn("flex shrink-0 items-center gap-1", iconOnly && "justify-center")}>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapseLabel}
              aria-expanded={!collapsed}
              aria-controls="app-sidebar"
              title={collapseLabel}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-ink dark:text-white/90 transition hover:bg-lavender-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:hover:bg-white/10 lg:flex"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.sidebar.closeMenu}
              title={t.sidebar.closeMenu}
              className="rounded-xl p-2 text-ink dark:text-white/90 transition hover:bg-lavender-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:hover:bg-white/10 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Active Role Card (expanded mode only) */}
        {!iconOnly ? (
          <div className="mb-5 rounded-[22px] border border-lavender-200/80 bg-gradient-to-br from-lavender-50 via-surface to-lavender-100/60 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getRoleIcon()}
                <span className="text-xs font-black capitalize text-ink">
                  {user?.role?.replace("_", " ") || "Mother"} Portal
                </span>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary">
                Active
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-muted">
              {user?.name} · {user?.email}
            </p>
          </div>
        ) : null}

        <nav aria-label={t.sidebar.navLabel} className="no-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          {sections.map((section) => (
            <div key={section.title}>
              {!iconOnly ? (
                <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.22em] text-muted/60">
                  {section.title}
                </p>
              ) : null}
              <div className={cn("space-y-1", iconOnly && "flex flex-col items-center")}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const link = (
                     <NavLink
                       key={`${section.title}-${item.key || item.path}`}
                       to={item.path}
                       end={item.path === "/caregiver" && item.key === "caregiver"}
                       onClick={() => {
                         if (window.innerWidth < 1024) onClose();
                       }}
                       aria-label={iconOnly ? item.label : undefined}
                       className={({ isActive }) => {
                         let active = isActive;
                         if (item.key === "carecircle-connect" && item.path.includes("?tab=connect")) {
                           if (typeof window !== "undefined") {
                             const url = new URL(item.path, window.location.origin);
                             active = window.location.pathname === url.pathname && window.location.search.includes("tab=connect");
                           }
                         }
                         if (item.key === "caregiver" && item.path === "/caregiver") {
                           if (typeof window !== "undefined") {
                             active = window.location.pathname === "/caregiver" && !window.location.search.includes("tab=connect");
                           }
                         }
                         return cn(
                           "group flex min-h-11 items-center rounded-2xl outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-primary/30",
                           iconOnly ? "w-11 justify-center" : "gap-3 px-3 text-sm font-bold",
                           active
                             ? "bg-gradient-to-r from-primary to-accent text-onbrand shadow-glow"
                             : "text-ink dark:text-white/90 hover:-translate-y-0.5 hover:bg-lavender-50 hover:text-primary hover:shadow-soft dark:hover:bg-white/10 dark:hover:text-white",
                         );
                       }}
                     >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition bg-lavender-100/80 dark:bg-white/10 group-hover:bg-lavender-200/80 dark:group-hover:bg-white/15 [.group[aria-current='page']_&]:bg-white/20 [.group[aria-current='page']_&]:dark:bg-white/20">
                        <Icon className="h-4 w-4 shrink-0 transition-colors text-ink dark:text-white/90 group-hover:text-primary [.group[aria-current='page']_&]:text-onbrand" />
                      </span>
                      {!iconOnly ? <span className="truncate">{item.label}</span> : null}
                    </NavLink>
                  );
                  return iconOnly ? (
                    <Tooltip key={item.path} content={item.label}>
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      {open && !isDesktop ? (
        <button
          aria-label={t.sidebar.closeMenu}
          className="fixed inset-0 z-30 bg-ink/20 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      ) : null}
    </>
  );
}

/** Tracks the desktop (lg+) breakpoint so collapsed mode never hits the drawer. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    setIsDesktop(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}
