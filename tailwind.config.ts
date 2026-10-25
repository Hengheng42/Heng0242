import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#07060f", 900: "#0c0a1a", 800: "#141127", 700: "#1d1938" },
        neon: { purple: "#a855f7", violet: "#7c3aed", cyan: "#22d3ee", pink: "#f472b6" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-khmer)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-khmer)", "system-ui", "sans-serif"],
        khmer: ["var(--font-khmer)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(168,85,247,.45)",
        "glow-cyan": "0 0 24px rgba(34,211,238,.4)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0) rotate(0deg)" }, "50%": { transform: "translateY(-14px) rotate(4deg)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        ticker: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        ticker: "ticker 30s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
