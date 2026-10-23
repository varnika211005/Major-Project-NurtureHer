import { ReactNode } from "react";
import { getTheme } from "@/theme/themeStore";

/**
 * App-wide theme provider.
 *
 * The actual theme state lives in the global `@/theme/themeStore` singleton so
 * the landing page and the authenticated shell share one source of truth
 * (including the `<html>` class, the `--nh-*` CSS variables and the persisted
 * `nurtureher_landing_theme` preference). This provider only guarantees the
 * store is initialised before the first authenticated render; components read
 * the theme through `useTheme()` from `@/theme/useTheme`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  getTheme();
  return <>{children}</>;
}
