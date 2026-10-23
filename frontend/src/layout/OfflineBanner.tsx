import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CloudOff, Download, WifiOff } from "lucide-react";
import { useLanguage } from "@/context/useLanguage";

/**
 * Offline awareness banner. Shows while the browser reports no connectivity
 * and briefly confirms when the connection returns. This is a UI signal only:
 * we never fabricate cached clinical data, so feature pages continue to show
 * their own empty/error states when a request fails offline.
 */
export function OfflineBanner() {
  const { t } = useLanguage();
  const [offline, setOffline] = useState(() => (typeof navigator === "undefined" ? false : !navigator.onLine));
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOffline = () => {
      setOffline(true);
      setReconnected(false);
    };
    const goOnline = () => {
      setOffline(false);
      setReconnected(true);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (!reconnected) return;
    const timeout = window.setTimeout(() => setReconnected(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [reconnected]);

  if (!offline && !reconnected) return null;

  const isOffline = offline;
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        isOffline
          ? "flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 md:px-8"
          : "flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 md:px-8"
      }
    >
      <div className="flex items-center gap-2">
        {isOffline ? <WifiOff className="h-3.5 w-3.5 shrink-0" /> : <CloudOff className="h-3.5 w-3.5 shrink-0" />}
        <span className="font-black">{isOffline ? t.offline.title : t.offline.reconnected}</span>
        {isOffline ? <span className="hidden font-semibold opacity-80 sm:inline">— {t.offline.message}</span> : null}
      </div>

      {isOffline && (
        <Link
          to="/offline-library"
          className="inline-flex items-center gap-1 rounded-md bg-amber-200/60 px-2.5 py-0.5 text-xs font-bold text-amber-900 hover:bg-amber-300 dark:bg-amber-900/60 dark:text-amber-100"
        >
          <Download className="h-3 w-3" />
          My Offline Library
        </Link>
      )}
    </div>
  );
}
