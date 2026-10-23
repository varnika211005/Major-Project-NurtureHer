import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

/**
 * Palette is backed by `--nh-*` CSS custom properties defined in
 * `index.css` (and re-applied at runtime by `@/theme/themeStore`). The
 * `rgb(var(--nh-…) / <alpha-value>)` form keeps Tailwind opacity modifiers
 * (`bg-surface/80`, `border-line/60`, …) working while the underlying values
 * swap between the landing page's light and dark palettes.
 */
const token = (name: string, fallback: string) => `rgb(var(--nh-${name}, ${fallback}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: token("bg", "255 248 250"),
        surface: token("surface", "255 255 255"),
        card: token("surface", "255 255 255"),
        ink: token("ink", "58 39 80"),
        muted: token("muted", "110 92 134"),
        line: token("line", "238 221 230"),
        blush: token("blush", "248 221 229"),
        blush2: token("blush2", "246 217 210"),
        lav: token("lav", "227 217 248"),
        lav2: token("lav2", "241 235 252"),
        lilac: token("lilac", "185 165 236"),
        rose: { ...colors.rose, DEFAULT: token("rose", "201 133 120") },
        rosedeep: token("rosedeep", "154 85 96"),
        onink: token("onink", "255 248 250"),
        onbrand: token("onbrand", "255 255 255"),
        accent: token("accent", "122 95 196"),
        primary: {
          DEFAULT: token("primary", "154 85 96"),
          hover: token("primary-hover", "135 73 83"),
          light: token("primary-light", "241 235 252"),
        },
        secondary: {
          DEFAULT: token("secondary", "185 165 236"),
          hover: token("secondary-hover", "169 143 227"),
          light: token("secondary-light", "227 217 248"),
        },
        // Semantic status colours keep their own hues but adapt per theme.
        // Default numeric scales are spread in so utilities like `bg-rose-50/50`
        // and `text-amber-700` keep resolving; `DEFAULT` remains the brand token.
        mint: token("mint", "13 148 136"),
        teal: { ...colors.teal, DEFAULT: token("teal", "15 118 110") },
        sky: { ...colors.sky, DEFAULT: token("sky", "56 189 248") },
        amber: { ...colors.amber, DEFAULT: token("amber", "217 119 6") },
        success: token("success", "16 185 129"),
        warning: token("warning", "245 158 11"),
        danger: token("danger", "220 38 38"),
        // Rose/blush-tinted neutral scale replacing the old purple lavender.
        lavender: {
          50: token("lavender-50", "250 243 247"),
          100: token("lavender-100", "245 231 238"),
          200: token("lavender-200", "234 211 224"),
          300: token("lavender-300", "217 178 198"),
          400: token("lavender-400", "196 143 169"),
          500: token("lavender-500", "185 165 236"),
          600: token("lavender-600", "169 143 227"),
          700: token("lavender-700", "154 85 96"),
          800: token("lavender-800", "126 68 80"),
          900: token("lavender-900", "92 51 80"),
          950: token("lavender-950", "58 39 80"),
        },
      },
      borderRadius: {
        card: "32px",
      },
      boxShadow: {
        glow: "0 22px 54px -34px rgb(var(--nh-glow, 201 133 120) / 0.55)",
        card: "0 30px 60px -36px rgb(var(--nh-glow, 201 133 120) / 0.42)",
        soft: "0 18px 40px -30px rgb(var(--nh-glow, 201 133 120) / 0.35)",
        emergency: "0 10px 30px rgb(220 38 38 / 0.22)",
      },
      fontFamily: {
        sans: [
          "Manrope",
          "Noto Sans Devanagari",
          "Noto Sans Kannada",
          "Noto Sans Tamil",
          "Noto Sans Telugu",
          "Noto Sans Malayalam",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "Bricolage Grotesque",
          "Manrope",
          "Noto Sans Devanagari",
          "Noto Sans Kannada",
          "Noto Sans Tamil",
          "Noto Sans Telugu",
          "Noto Sans Malayalam",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
