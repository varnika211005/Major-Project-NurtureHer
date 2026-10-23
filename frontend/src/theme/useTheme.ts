import { useCallback, useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme, toggleTheme, type ThemeMode } from "./themeStore";

export type { ThemeMode };

/**
 * Subscribe to the shared theme singleton. Because the store is global, this
 * works with or without a surrounding provider, which lets the landing page
 * (rendered outside the authenticated shell) share the exact same state.
 */
export function useTheme(): { theme: ThemeMode; setTheme: (theme: ThemeMode) => void; toggleTheme: () => void } {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "light" as ThemeMode);
  const set = useCallback((next: ThemeMode) => setTheme(next), []);
  const toggle = useCallback(() => toggleTheme(), []);
  return { theme, setTheme: set, toggleTheme: toggle };
}
