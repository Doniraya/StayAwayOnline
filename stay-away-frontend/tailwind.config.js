/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gameBg: '#0f172a',
        tableBg: '#1e293b',
        cardBg: '#334155',
      }
    },
  },
  plugins: [],
}