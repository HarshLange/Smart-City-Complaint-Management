/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: "#0f2942",
          "navy-dark": "#0a1c2e",
          "navy-light": "#163b5f",
          blue: "#1d4ed8",
          "blue-hover": "#1e40af",
          "blue-light": "#eff6ff",
        },
        navy: {
          950: "#080e1a",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
        },
        civic: {
          blue: "#1d4ed8",
          "blue-hover": "#1e40af",
          teal: "#0f766e",
          "teal-hover": "#115e59",
          bg: "#f8fafc",
          surface: "#ffffff",
          subtle: "#f1f5f9",
          border: "#e2e8f0",
          "border-strong": "#cbd5e1",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        panel: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        elevated: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        modal: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        sm: "0.25rem",   // 4px
        DEFAULT: "0.375rem", // 6px
        md: "0.5rem",    // 8px
        lg: "0.625rem",  // 10px
      },
    },
  },
  plugins: [],
}
