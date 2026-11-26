/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#111827',
        surfaceHover: '#1F2937',
        card: '#131B2E',
        accent: '#3B82F6',
        accentHover: '#2563EB',
        accentGlow: 'rgba(59, 130, 246, 0.25)',
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)' },
          '100%': { boxShadow: '0 0 25px rgba(59, 130, 246, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
