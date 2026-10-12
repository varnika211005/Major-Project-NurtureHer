import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/useLanguage";
import { LanguageCode } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSelector({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { language, setLanguage, languages, currentLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        type="button"
        id="language-selector-button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t.topbar.selectLanguage}
        title={t.topbar.selectLanguage}
        className={cn(
          "group flex min-h-11 items-center gap-2 rounded-2xl border border-pink-100 bg-white/90 px-3 py-1 shadow-card backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/10",
          open && "border-primary/50 shadow-glow ring-2 ring-primary/20",
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary dark:bg-white/10 dark:text-pink-300">
          <Globe className="h-4 w-4 transition duration-300 group-hover:rotate-45" />
        </div>
        {!compact && (
          <div className="flex items-center gap-1.5 text-left">
            <span className="text-sm font-black text-ink dark:text-white">
              {currentLanguage.nativeName}
            </span>
            <span className="hidden text-xs font-semibold text-muted dark:text-white/50 sm:inline">
              ({currentLanguage.name})
            </span>
          </div>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted transition-transform duration-200 dark:text-white/50",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right animate-in fade-in zoom-in-95 rounded-2xl border border-pink-100 bg-white/95 p-2 shadow-glow backdrop-blur-2xl dark:border-white/10 dark:bg-[#241827]/95"
        >
          <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-muted/70 dark:text-white/40">
            {t.topbar.selectLanguage}
          </div>
          <div className="space-y-1">
            {languages.map((item) => {
              const isSelected = item.code === language;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(item.code)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition duration-150",
                    isSelected
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-soft"
                      : "text-ink hover:bg-pink-50 hover:text-primary dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{item.flag}</span>
                    <div>
                      <span className="block font-black">{item.nativeName}</span>
                      <span
                        className={cn(
                          "block text-[11px] font-medium",
                          isSelected ? "text-white/80" : "text-muted dark:text-white/50",
                        )}
                      >
                        {item.name}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
