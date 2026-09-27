/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./styles/**/*.{css,scss}",
    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "15px",
        sm: "15px",
        lg: "15px",
        xl: "0",
        "2xl": "0",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1280px",
      },
    },
    extend: {
      screens: {
        "3xl": "1600px",
        "4xl": "1920px",
        "5xl": "2560px",
        "6xl": "3200px",
      },
      colors: {
        primary: {
          50: "#F6F8FF",
          100: "#EDF0FF",
          200: "#D1DAFE",
          300: "#B4C2FD",
          400: "#8092FF",
          500: "#4669fa",
          600: "#3F5EDF",
          700: "#2A3F96",
          800: "#203071",
          900: "#151F49",
        },
        secondary: {
          50: "#F9FAFB",
          100: "#F4F5F7",
          200: "#E5E7EB",
          300: "#D2D6DC",
          400: "#9FA6B2",
          500: "#A0AEC0",
          600: "#475569",
          700: "#334155",
          800: "#56ce84",
          // 800: "#1E293B",
          900: "#0F172A",
        },
        danger: {
          50: "#FFF7F7",
          100: "#FEEFEF",
          200: "#FCD6D7",
          300: "#FABBBD",
          400: "#F68B8D",
          500: "#F1595C",
          600: "#D75052",
          700: "#913638",
          800: "#6D292A",
          900: "#461A1B",
        },
        black: {
          50: "#F9FAFB",
          100: "#F4F5F7",
          200: "#E5E7EB",
          300: "#D2D6DC",
          400: "#9FA6B2",
          500: "#111112",
          600: "#475569",
          700: "#334155",
          800: "#56ce84",
          // 800: "#1E293B",
          900: "#0F172A",
        },
        warning: {
          50: "#FFFAF8",
          100: "#FFF4F1",
          200: "#FEE4DA",
          300: "#FDD2C3",
          400: "#FCB298",
          500: "#FA916B",
          600: "#DF8260",
          700: "#965741",
          800: "#714231",
          900: "#492B20",
        },
        info: {
          50: "#F3FEFF",
          100: "#E7FEFF",
          200: "#C5FDFF",
          300: "#A3FCFF",
          400: "#5FF9FF",
          500: "#0CE7FA",
          600: "#00B8D4",
          700: "#007A8D",
          800: "#005E67",
          900: "#003F42",
        },
        success: {
          50: "#F3FEF8",
          100: "#E7FDF1",
          200: "#C5FBE3",
          300: "#A3F9D5",
          400: "#5FF5B1",
          500: "#50C793",
          600: "#3F9A7A",
          700: "#2E6D61",
          800: "#1F4B47",
          900: "#0F2A2E",
        },
        gray: {
          50: "#F9FAFB",
          100: "#F4F5F7",
          200: "#E5E7EB",
          300: "#D2D6DC",
          400: "#9FA6B2",
          500: "#68768A",
          600: "#475569",
          700: "#334155",
          // 800: "#1E293B",
          800: "#56ce84",
          900: "#0F172A",
        },
      },

      /* ─── Type scale — ONE system ──────────────────────────────────────
       *  This codebase grew two competing scales: 1,592 arbitrary
       *  `text-[Npx]` and 1,050 Tailwind steps. They overlapped without
       *  matching — `text-xs` rendered 11.25px next to `text-[11px]`,
       *  `text-sm` 13.125px next to `text-[13px]` — which is why one page
       *  could look subtly unlike another while every file passed review.
       *
       *  Redefining the steps snaps Tailwind onto the px grid the feature
       *  code already used, so the two become one. The shift is sub-pixel:
       *  11.25→11, 13.125→13, 16.875→17, 18.75→19, 22.5→22, 28.125→28.
       *  `base` was already exactly 15px.
       *
       *  `2xs`/`3xs` have no Tailwind equivalent and are the two densest
       *  label sizes this UI needs — 10px alone carried 710 usages, more
       *  than any other size in the repo.
       *
       *  It lives here, not in globals.css's @theme block: this project
       *  loads a v3-style config via `@config`, and a `--text-*` @theme
       *  namespace is inert when that is present. Verified by measurement.
       *
       *  Nine steps, and that is the whole scale. Reach for a name, never a
       *  `text-[Npx]` — an arbitrary value is how the second scale started.
       * ───────────────────────────────────────────────────────────────── */
      fontSize: {
        "3xs": "9px",   // micro badges, densest meta
        "2xs": "10px",  // uppercase column headers, KPI labels
        xs: "11px",     // secondary and meta text
        sm: "13px",     // table cells, body copy
        base: "15px",   // emphasised body
        lg: "17px",     // card and panel headings
        xl: "19px",     // page headings
        "2xl": "22px",  // hero figures
        "3xl": "28px",  // display
      },

      fontFamily: {
        // Inter is loaded in the root layout through next/font.
        inter: ["var(--font-inter)", "Inter", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        base: "0px 0px 1px rgba(40, 41, 61, 0.08), 0px 0.5px 2px rgba(96, 97, 112, 0.16)",
        base2:
          "0px 2px 4px rgba(40, 41, 61, 0.04), 0px 8px 16px rgba(96, 97, 112, 0.16)",
        base3: "16px 10px 40px rgba(15, 23, 42, 0.22)",
        deep: "-2px 0px 8px rgba(0, 0, 0, 0.16)",
        dropdown: "0px 4px 8px rgba(0, 0, 0, 0.08)",

        testi: "0px 4px 24px rgba(0, 0, 0, 0.06)",
        todo: "rgba(235 233 241, 0.6) 0px 3px 10px 0px",
      },
      keyframes: {
        zoom: {
          "0%, 100%": { transform: "scale(0.5)" },
          "50%": { transform: "scale(1)" },
        },
        tada: {
          "0%": { transform: "scale3d(1, 1, 1)" },
          "10%, 20%": {
            transform: "scale3d(1, 1, 0.95) rotate3d(0, 0, 1, -10deg)",
          },
          "30%, 50%, 70%, 90%": {
            transform: "scale3d(1, 1, 1) rotate3d(0, 0, 1, 10deg)",
          },
          "40%, 60%, 80%": {
            transform: "rotate3d(0, 0, 1, -10deg)",
          },
          "100%": { transform: "scale3d(1, 1, 1)" },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        zoom: "zoom 1s ease-in-out infinite",
        tada: "tada 1.5s ease-in-out infinite",
        slideIn: 'slideIn 0.5s ease-in-out',
        slideOut: 'slideOut 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
};
