import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: "#080c14",
          panel: "#0d1321",
          card: "#111827",
          border: "#1e293b",
          cyan: "#00f0ff",
          emerald: "#10b981",
          amber: "#f59e0b",
          crimson: "#ef4444",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Consolas",
          "SF Mono",
          "Fira Code",
          "ui-monospace",
          "monospace",
        ],
      },
      boxShadow: {
        "cyan-glow": "0 0 15px -3px rgba(0, 240, 255, 0.3)",
        "emerald-glow": "0 0 15px -3px rgba(16, 185, 129, 0.3)",
        "crimson-glow": "0 0 15px -3px rgba(239, 68, 68, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
