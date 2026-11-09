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
          bg: "#F4F7FB",
          sidebar: "#14243A",
          sidebarHover: "#1E3553",
          primaryText: "#172B4D",
          secondaryText: "#64748B",
          primaryAccent: "#14B8A6",
          primaryAccentHover: "#0D9488",
          secondaryAccent: "#334E68",
          card: "#FFFFFF",
          border: "#E2E8F0",
          success: "#16A34A",
          warning: "#F59E0B",
          critical: "#DC2626",
        }
      },
      borderRadius: {
        'enterprise': '12px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
