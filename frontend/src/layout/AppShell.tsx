import { ReactNode, useState } from "react";
import { Sidebar } from "@/layout/Sidebar";
import { Topbar } from "@/layout/Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="premium-gradient min-h-screen text-ink dark:text-white lg:flex">
      <Sidebar open={open} onToggle={() => setOpen((value) => !value)} onClose={() => setOpen(false)} />
      <div className="min-w-0 flex-1 lg:pl-0">
        <Topbar />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-5 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
