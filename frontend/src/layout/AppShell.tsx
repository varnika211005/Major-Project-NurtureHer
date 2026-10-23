import { ReactNode, useState } from "react";
import { OfflineBanner } from "@/layout/OfflineBanner";
import { Sidebar } from "@/layout/Sidebar";
import { Topbar } from "@/layout/Topbar";

const SIDEBAR_KEY = "nurtureher_sidebar_collapsed";

function readCollapsedPreference(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsedPreference);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable — preference still applies for this visit */
      }
      return next;
    });
  };

  return (
    <div className="premium-gradient min-h-screen text-ink lg:flex">
      <Sidebar
        open={open}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onToggle={() => setOpen((value) => !value)}
        onClose={() => setOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <Topbar />
        <OfflineBanner />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-5 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
