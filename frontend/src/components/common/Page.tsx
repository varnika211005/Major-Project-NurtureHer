import { ReactNode } from "react";
import { motion } from "framer-motion";

export function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="gradient-border surface-shine rounded-[28px] bg-surface/60 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-primary/70">NurtureHer</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </motion.section>
  );
}
