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
          secondaryBg: "#0C0D0E",
          sidebar: "#0C0D0E",
          sidebarHover: "#16181A",
          primaryText: "#FFFFFF",
          secondaryText: "#9CA3AF",
          mutedText: "#6B7280",
          primaryAccent: "#397C70",
          primaryAccentHover: "#2D6359",
          secondaryAccent: "#A4B9A9",
          teal: "#14B8A6",
          card: "#151719",
          cardHover: "#1C1F22",
          border: "#23262A",
          borderSubtle: "rgba(255, 255, 255, 0.08)",
          warning: "#D99A42",
          critical: "#C65C52",
          success: "#10B981",
          navy: "#0C0D0E",
        }
      },
      borderRadius: {
        'enterprise': '12px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'card': '0 4px 12px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'elevated': '0 12px 24px -4px rgba(0, 0, 0, 0.6), 0 4px 8px -2px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
