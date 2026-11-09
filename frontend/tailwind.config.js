/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#050505",
          secondaryBg: "#090B0E",
          sidebar: "#0B0E12",
          sidebarHover: "#13181F",
          glass: "rgba(23, 28, 34, 0.88)",
          glassSecondary: "rgba(30, 36, 43, 0.78)",
          glassHover: "rgba(35, 42, 50, 0.92)",
          inset: "#0B0E12",
          card: "#151719",
          cardHover: "#1C1F22",
          primaryText: "#F5F7FA",
          secondaryText: "#A0AAB5",
          mutedText: "#727E89",
          primaryAccent: "#397C70",
          primaryAccentHover: "#2D6359",
          secondaryAccent: "#57A394",
          softTeal: "#80B7AA",
          teal: "#14B8A6",
          border: "rgba(255, 255, 255, 0.10)",
          borderSubtle: "rgba(255, 255, 255, 0.06)",
          borderStrong: "rgba(255, 255, 255, 0.16)",
          warning: "#D99A42",
          critical: "#D45D63",
          success: "#59A78B",
        }
      },
      borderRadius: {
        'enterprise': '14px',
        'glass': '16px',
        'glass-lg': '20px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.55), 0 0 1px 1px rgba(255, 255, 255, 0.15)',
        'neumorph-raised': '4px 4px 10px rgba(0, 0, 0, 0.5), -2px -2px 6px rgba(255, 255, 255, 0.03)',
        'neumorph-btn': '0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.12)',
        'neumorph-inset': 'inset 2px 2px 5px rgba(0, 0, 0, 0.6), inset -1px -1px 3px rgba(255, 255, 255, 0.02)',
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'card': '0 4px 16px -1px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
        'elevated': '0 16px 36px -4px rgba(0, 0, 0, 0.7), 0 6px 12px -2px rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        'glass': '14px',
        'glass-deep': '18px',
      }
    },
  },
  plugins: [],
}
