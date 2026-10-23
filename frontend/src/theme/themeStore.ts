/**
 * Single source of truth for the shared light/dark theme.
 *
 * Persistence uses the landing page's canonical key
 * `nurtureher_landing_theme` ("1" = dark). Two legacy keys written by earlier
 * builds are still honoured, with deterministic precedence:
 *
 *   1. `nurtureher_landing_theme` present  -> "1" = dark, "0" = light, any
 *      other stored value = light (invalid values never promote a legacy key).
 *   2. canonical key absent -> `nurtureher_theme` ("dark" = dark).
 *   3. still absent -> `nurtureher-theme` ("dark" = dark).
 *
 * A lower-precedence key is only consulted when the canonical key is absent.
 * On the first such read the resolved value is written back to the canonical
 * key so the preference becomes explicit. Existing legacy values are never
 * overwritten on read, so a conflict resolves deterministically without
 * silently discarding a stored preference. Only an explicit user action
 * (`setTheme`) rewrites every key so they stay in sync going forward.
 *
 * The resolved mode is applied to `<html>` as the `dark` class (driving
 * Tailwind's `dark:` variants) and as `--nh-*` CSS custom properties (driving
 * the token-backed palette). Because the store is a plain module singleton,
 * the landing page and the authenticated shell read the same state without a
 * React provider, and `useSyncExternalStore` keeps React in sync.
 */

import {
  APP_TOKEN_HEX,
  getAppTokenVars,
  LANDING_THEME_KEY,
  LEGACY_THEME_KEYS,
  type ThemeMode,
} from "./tokens";

export type { ThemeMode };

const subscribers = new Set<() => void>();

/** Mode currently written to the DOM, so repeated reads do not re-apply vars. */
let appliedTheme: ThemeMode | null = null;
let migratedLegacy = false;
let storageReady = false;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readKey(key: string): string | null {
  const store = storage();
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Deterministic resolution with the precedence documented above. Returns the
 * resolved mode plus which tier produced it, so callers can migrate without
 * overwriting an existing preference.
 */
export function resolveThemePreference(): {
  theme: ThemeMode;
  source: "canonical" | "legacy" | "default";
} {
  const raw = readKey(LANDING_THEME_KEY);
  if (raw === "1") return { theme: "dark", source: "canonical" };
  if (raw === null) {
    // Canonical key absent -> consult legacy keys in order.
    if (readKey(LEGACY_THEME_KEYS.underscore) === "dark") return { theme: "dark", source: "legacy" };
    if (readKey(LEGACY_THEME_KEYS.dash) === "dark") return { theme: "dark", source: "legacy" };
    return { theme: "light", source: "default" };
  }
  // Canonical key present but invalid -> light, never a legacy promotion.
  return { theme: "light", source: "canonical" };
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
  const vars = getAppTokenVars(theme);
  for (const [name, triplet] of Object.entries(vars)) {
    root.style.setProperty(name, triplet);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? APP_TOKEN_HEX.dark.bg : APP_TOKEN_HEX.light.bg);
  }
  appliedTheme = theme;
}

function handleStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== LANDING_THEME_KEY) return;
  const next = resolveThemePreference().theme;
  if (next === appliedTheme) return;
  applyTheme(next);
  notify();
}

function notify(): void {
  for (const subscriber of subscribers) subscriber();
}

function ensureStorageListener(): void {
  if (storageReady || typeof window === "undefined") return;
  window.addEventListener("storage", handleStorage);
  storageReady = true;
}

/**
 * Read the current theme. Always re-resolves from storage so a value changed
 * outside React (another tab, a direct `localStorage` edit, or a test) is
 * picked up; the DOM is only touched when the resolved mode differs from the
 * one already applied.
 */
export function getTheme(): ThemeMode {
  const { theme, source } = resolveThemePreference();
  if (source === "legacy" && !migratedLegacy) {
    migratedLegacy = true;
    const store = storage();
    if (store) {
      try {
        store.setItem(LANDING_THEME_KEY, theme === "dark" ? "1" : "0");
      } catch {
        /* storage unavailable — preference still applies for this visit */
      }
    }
  }
  if (theme !== appliedTheme) applyTheme(theme);
  ensureStorageListener();
  return theme;
}

export function setTheme(theme: ThemeMode): void {
  const store = storage();
  if (store) {
    try {
      store.setItem(LANDING_THEME_KEY, theme === "dark" ? "1" : "0");
      store.setItem(LEGACY_THEME_KEYS.underscore, theme === "dark" ? "dark" : "light");
      store.setItem(LEGACY_THEME_KEYS.dash, theme === "dark" ? "dark" : "light");
    } catch {
      /* storage unavailable — theme still applies for this visit */
    }
  }
  if (theme !== appliedTheme) applyTheme(theme);
  ensureStorageListener();
  notify();
}

export function toggleTheme(): void {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function subscribeTheme(subscriber: () => void): () => void {
  ensureStorageListener();
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

/** Test helper: drop cached DOM state and listeners so each test starts clean. */
export function resetThemeStoreForTests(): void {
  if (storageReady && typeof window !== "undefined") {
    window.removeEventListener("storage", handleStorage);
    storageReady = false;
  }
  appliedTheme = null;
  migratedLegacy = false;
  subscribers.clear();
}
