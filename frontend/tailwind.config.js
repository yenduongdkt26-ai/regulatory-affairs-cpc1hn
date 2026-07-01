/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          bg: '#f4f7f6',
          sidebar: 'rgba(255, 255, 255, 0.85)',
          card: 'rgba(255, 255, 255, 0.9)',
          blue: '#e0f2fe',
          green: '#dcfce7',
          yellow: '#fef9c3',
          red: '#fee2e2',
          purple: '#f3e8ff',
          pink: '#fce7f3',
          orange: '#ffedd5',
          teal: '#ccfbf1'
        },
        brand: {
          blue: '#0284c7',
          green: '#16a34a',
          yellow: '#ca8a04',
          red: '#dc2626',
          purple: '#7c3aed',
          orange: '#ea580c',
          teal: '#0d9488'
        }
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
