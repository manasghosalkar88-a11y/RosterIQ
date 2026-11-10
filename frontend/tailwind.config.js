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
          // Primary Theme Colours (Section 3)
          bg: "#050505",
          secondaryBg: "#0A0F16",
          sidebar: "#080D12",
          sidebarHover: "#111820",
          navbar: "#0B1016",
          surface: "#111820",
          surfaceSecondary: "#151D25",
          card: "#141A21",
          cardHover: "#1A222B",
          inset: "#080D12",
          glass: "rgba(20, 26, 33, 0.78)",
          glassSecondary: "rgba(25, 33, 42, 0.68)",
          glassHover: "rgba(30, 40, 50, 0.88)",

          // Brand Colours
          primaryNavy: "#172B4D",
          secondaryNavy: "#29466B",
          teal: "#14B8A6",
          primaryAccent: "#14B8A6",
          primaryAccentHover: "#0D9488",
          brightTeal: "#2DD4BF",
          tealHover: "#0D9488",
          secondaryAccent: "#2DD4BF",
          cyan: "#06B6D4",
          softTeal: "#5EEAD4",

          // Typography Colours
          primaryText: "#F8FAFC",
          secondaryText: "#CBD5E1",
          mutedText: "#94A3B8",
          disabledText: "#64748B",

          // Borders & Surfaces
          border: "rgba(148, 163, 184, 0.16)",
          borderHover: "rgba(45, 212, 191, 0.45)",
          glassBorder: "rgba(255, 255, 255, 0.10)",
          borderSubtle: "rgba(255, 255, 255, 0.06)",
          borderStrong: "rgba(148, 163, 184, 0.28)",

          // Operational Status Colours
          morning: "#3B82F6",
          evening: "#8B5CF6",
          night: "#6366F1",
          off: "#64748B",
          leave: "#F59E0B",
          approved: "#22C55E",
          pending: "#EAB308",
          rejected: "#EF4444",
          critical: "#F43F5E",
          warning: "#F59E0B",
          success: "#22C55E",
          info: "#06B6D4",
        }
      },
      borderRadius: {
        'enterprise': '14px',
        'glass': '16px',
        'glass-lg': '20px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.55), 0 0 1px 1px rgba(45, 212, 191, 0.35)',
        'kpi': '0 4px 20px -2px rgba(0, 0, 0, 0.45), 0 0 1px 1px rgba(148, 163, 184, 0.12)',
        'kpi-hover': '0 12px 28px -4px rgba(0, 0, 0, 0.65), 0 0 1px 1px rgba(45, 212, 191, 0.45)',
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
      },
      animation: {
        'card-entrance': 'cardEntrance 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'page-fade': 'pageFade 200ms ease-out both',
        'dropdown': 'dropdownSlide 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'modal': 'modalScale 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast': 'toastSlide 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer': 'shimmer 1.5s infinite linear',
      },
      keyframes: {
        cardEntrance: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pageFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        dropdownSlide: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        modalScale: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        toastSlide: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
