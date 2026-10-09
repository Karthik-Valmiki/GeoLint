/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "google-blue": "#1a73e8",
        "google-blue-hover": "#1557b0",
        "google-surface": "#ffffff",
        "google-bg": "#f8fafd",
        "google-card": "#ffffff",
        "google-border": "#e3e8ee",
        "google-text-main": "#202124",
        "google-text-muted": "#5f6368",
        "google-light-blue": "#e8f0fe",
        primary: "#1c49c2",
        "primary-hover": "#163ca7",
        "primary-container": "#eff4ff",
        "primary-light": "#eff4ff",
        "primary-fixed": "#dce1ff",
        "on-primary": "#ffffff",
        "secondary": "#0284c7",
        "surface": "#f8fafc",
        "surface-card": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f1f5f9",
        "surface-container": "#e2e8f0",
        "surface-container-high": "#cbd5e1",
        "border-subtle": "#e2e8f0",
        "on-surface": "#0f172a",
        "on-surface-variant": "#64748b",
        "outline": "#94a3b8",
        "outline-variant": "#e2e8f0",
        "success": "#16a34a",
        "success-container": "#dcfce7",
        "badge-blue-bg": "#ebf3ff",
        "badge-blue-text": "#1c49c2",
        "accent-success": "#10b981",
        brand: {
          50: '#eff4ff',
          100: '#dce1ff',
          200: '#b6c4ff',
          500: '#2b54cd',
          600: '#1c49c2',
          700: '#00329c',
          800: '#002575',
          900: '#0b1c30',
        }
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      boxShadow: {
        "card": "0 10px 30px -4px rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.03)",
      }
    }
  },
  plugins: [],
}
