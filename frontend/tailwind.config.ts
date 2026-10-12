import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FFFCFA",
        primary: {
          DEFAULT: "#633B73",
          hover: "#4E2C5C",
          light: "#EDE4F3",
        },
        secondary: {
          DEFAULT: "#835AA6",
          hover: "#633B73",
          light: "#F6EFF7",
        },
        accent: "#AB8FC7",
        surface: "#FFFFFF",
        ink: "#492653",
        muted: "#766B7B",
        mint: "#0D9488",
        teal: "#0F766E",
        sky: "#38BDF8",
        amber: "#D97706",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#DC2626",
        lavender: {
          50: "#FBF7FB",
          100: "#EDE4F3",
          200: "#E2D2E4",
          300: "#CDAED2",
          400: "#B28ABC",
          500: "#94699F",
          600: "#7A4F86",
          700: "#633B73",
          800: "#4E2C5C",
          900: "#3E2349",
          950: "#2A1732",
        },
      },
      borderRadius: {
        card: "24px",
      },
      boxShadow: {
        glow: "0 20px 60px rgba(99, 59, 115, 0.16)",
        card: "0 10px 30px rgba(73, 38, 83, 0.08)",
        soft: "0 6px 20px rgba(73, 38, 83, 0.05)",
        emergency: "0 10px 30px rgba(220, 38, 38, 0.22)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
