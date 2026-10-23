/**
 * NurtureHer shared design tokens.
 *
 * The landing page is the visual source of truth. `LANDING_LIGHT_TOKENS` and
 * `LANDING_DARK_TOKENS` are the canonical light/dark palettes; they were moved
 * here from `pages/landing/landingContent.ts` (which re-exports them for
 * backwards compatibility) so the whole application can share one palette.
 *
 * `APP_TOKEN_HEX` maps the application's semantic CSS-variable names onto the
 * landing palette. The app-wide theme layer (`--nh-*` custom properties) is
 * derived from these values in `themeStore.ts`, which applies them to
 * `<html>` so the landing page and the authenticated shell render from the
 * exact same tokens in both modes.
 */

export const LANDING_LIGHT_TOKENS: Record<string, string> = {
  bg: "#FFF8FA",
  bg2: "#FDEFF3",
  surface: "#FFFFFF",
  ink: "#3A2750",
  muted: "#6E5C86",
  blush: "#F8DDE5",
  blush2: "#F6D9D2",
  lav: "#E3D9F8",
  lav2: "#F1EBFC",
  lilac: "#B9A5EC",
  rose: "#C98578",
  roseDeep: "#9A5560",
  line: "#EEDDE6",
  glow: "rgba(201,133,120,0.32)",
  onInk: "#FFF8FA",
  foot: "#3A2750",
  hdr: "rgba(255,248,250,0.88)",
  wbtn: "rgba(255,255,255,0.75)",
  orbHi: "#FFFFFF",
  orbRing: "rgba(255,255,255,0.7)",
  veil: "rgba(255,255,255,0.35)",
  blobOp: "0.9",
  g1: "#C98578",
  g2: "#9A5560",
  g3: "#7A5FC4",
};

export const LANDING_DARK_TOKENS: Record<string, string> = {
  bg: "#1B1430",
  bg2: "#241A3D",
  surface: "#2B2148",
  ink: "#F6EEFF",
  muted: "#C4B5DE",
  blush: "#4A2A4F",
  blush2: "#5A3358",
  lav: "#3A2C63",
  lav2: "#32265A",
  lilac: "#8F78D8",
  rose: "#E3A89C",
  roseDeep: "#F2A9B8",
  line: "#3F3162",
  glow: "rgba(183,156,242,0.30)",
  onInk: "#2A1D45",
  foot: "#120C22",
  hdr: "rgba(27,20,48,0.88)",
  wbtn: "rgba(20,12,38,0.45)",
  orbHi: "#5B4690",
  orbRing: "rgba(183,156,242,0.18)",
  veil: "rgba(255,255,255,0.08)",
  blobOp: "0.3",
  g1: "#F3B6A8",
  g2: "#F2A9B8",
  g3: "#BBA4FF",
};

export type ThemeMode = "light" | "dark";

/** Canonical persistence key for the shared light/dark preference ("1" = dark). */
export const LANDING_THEME_KEY = "nurtureher_landing_theme";

/** Legacy keys written by earlier builds. Read-only for precedence, never clobbered on read. */
export const LEGACY_THEME_KEYS = {
  underscore: "nurtureher_theme",
  dash: "nurtureher-theme",
} as const;

/**
 * Application semantic tokens, expressed as hex, derived from the landing
 * palette. Keys are the `--nh-*` custom-property suffixes used by Tailwind
 * (`rgb(var(--nh-<key>) / <alpha-value>)`) and by `index.css` utilities.
 */
const lightLanding = LANDING_LIGHT_TOKENS;
const darkLanding = LANDING_DARK_TOKENS;

export const APP_TOKEN_HEX: Record<ThemeMode, Record<string, string>> = {
  light: {
    bg: lightLanding.bg,
    bg2: lightLanding.bg2,
    surface: lightLanding.surface,
    ink: lightLanding.ink,
    muted: lightLanding.muted,
    blush: lightLanding.blush,
    blush2: lightLanding.blush2,
    lav: lightLanding.lav,
    lav2: lightLanding.lav2,
    lilac: lightLanding.lilac,
    rose: lightLanding.rose,
    rosedeep: lightLanding.roseDeep,
    line: lightLanding.line,
    // Base colour of the ambient glow (alpha is applied where it is used).
    glow: "#C98578",
    onink: lightLanding.onInk,
    onbrand: "#FFFFFF",
    accent: lightLanding.g3,
    primary: lightLanding.roseDeep,
    "primary-hover": "#874953",
    "primary-light": lightLanding.lav2,
    secondary: lightLanding.lilac,
    "secondary-hover": "#A98FE3",
    "secondary-light": lightLanding.lav,
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#DC2626",
    mint: "#0D9488",
    teal: "#0F766E",
    sky: "#38BDF8",
    amber: "#D97706",
    "lavender-50": "#FAF3F7",
    "lavender-100": "#F5E7EE",
    "lavender-200": "#EAD3E0",
    "lavender-300": "#D9B2C6",
    "lavender-400": "#C48FA9",
    "lavender-500": "#B9A5EC",
    "lavender-600": "#A98FE3",
    "lavender-700": "#9A5560",
    "lavender-800": "#7E4450",
    "lavender-900": "#5C3350",
    "lavender-950": "#3A2750",
  },
  dark: {
    bg: darkLanding.bg,
    bg2: darkLanding.bg2,
    surface: darkLanding.surface,
    ink: darkLanding.ink,
    muted: darkLanding.muted,
    blush: darkLanding.blush,
    blush2: darkLanding.blush2,
    lav: darkLanding.lav,
    lav2: darkLanding.lav2,
    lilac: darkLanding.lilac,
    rose: darkLanding.rose,
    rosedeep: darkLanding.roseDeep,
    line: darkLanding.line,
    glow: "#B79CF2",
    onink: darkLanding.onInk,
    onbrand: "#2A1D45",
    accent: darkLanding.g3,
    primary: darkLanding.roseDeep,
    "primary-hover": "#F7BEC5",
    "primary-light": darkLanding.lav2,
    secondary: darkLanding.lilac,
    "secondary-hover": "#7D63C9",
    "secondary-light": darkLanding.lav,
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
    mint: "#2DD4BF",
    teal: "#2DD4BF",
    sky: "#7DD3FC",
    amber: "#FBBF24",
    // Dark lavender ramp is tuned to current usage: 300 is used as text and
    // 950 as a surface, so they are intentionally light/dark respectively.
    "lavender-50": "#2A1F45",
    "lavender-100": "#332758",
    "lavender-200": "#3F3162",
    "lavender-300": "#C9B7F0",
    "lavender-400": "#A98FE3",
    "lavender-500": "#8F78D8",
    "lavender-600": "#7D63C9",
    "lavender-700": "#6B54A8",
    "lavender-800": "#D8CCEC",
    "lavender-900": "#EDE4F9",
    "lavender-950": "#2B2148",
  },
};

/** Convert `#RRGGBB` into the `R G B` triplet form required by `rgb(var(--x) / a)`. */
export function hexToTriplet(hex: string): string {
  const value = hex.replace("#", "").trim();
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const int = Number.parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `${r} ${g} ${b}`;
}

/** All `--nh-*` custom properties for a given mode, in `R G B` triplet form. */
export function getAppTokenVars(mode: ThemeMode): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, hex] of Object.entries(APP_TOKEN_HEX[mode])) {
    vars[`--nh-${key}`] = hexToTriplet(hex);
  }
  return vars;
}
