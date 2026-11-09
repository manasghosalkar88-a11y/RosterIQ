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
          bg: "#F5F2EB",
          secondaryBg: "#EAE6DC",
          sidebar: "#202B35",
          sidebarHover: "#263B45",
          primaryText: "#202B35",
          secondaryText: "#66736F",
          primaryAccent: "#397C70",
          primaryAccentHover: "#2D6359",
          secondaryAccent: "#A4B9A9",
          sage: "#DCE7DC",
          card: "#FFFDF8",
          border: "#E5DED2",
          warning: "#D99A42",
          critical: "#C65C52",
          success: "#56866B",
          navy: "#263B45",
        }
      },
      borderRadius: {
        'enterprise': '12px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(32, 43, 53, 0.04), 0 1px 2px 0 rgba(32, 43, 53, 0.02)',
        'card': '0 4px 8px -1px rgba(32, 43, 53, 0.05), 0 2px 4px -1px rgba(32, 43, 53, 0.03)',
        'elevated': '0 12px 24px -4px rgba(32, 43, 53, 0.08), 0 4px 8px -2px rgba(32, 43, 53, 0.04)',
      }
    },
  },
  plugins: [],
}
