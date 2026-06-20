import type { Config } from "tailwindcss";

/** Design tokens translated from the spec (Booking-derived, not cloned). */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0A3D8F", deep: "#062A66" },
        accent: "#009FE3",
        cta: { DEFAULT: "#F4A300", deep: "#D98E00" },
        success: "#0E9F6E",
        warning: "#E8590C",
        danger: "#D92D20",
        ink: "#1A1A2E",
        muted: "#5B6472",
        surface: "#FFFFFF",
        canvas: "#F2F6FA",
        border: "#E2E8F0",
      },
      borderRadius: {
        DEFAULT: "12px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.06)",
        lift: "0 8px 24px rgba(16,24,40,.12)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      fontFeatureSettings: {
        tnum: '"tnum" 1',
      },
    },
  },
  plugins: [],
} satisfies Config;
