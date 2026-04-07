/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        bebas: ['"Bebas Neue"', 'cursive'],
        barlow: ['Barlow', 'sans-serif'],
        condensed: ['"Barlow Condensed"', 'sans-serif'],
      },
      colors: {
        'nba-bg': '#0a0a0f',
        'nba-surface': '#13131a',
        'nba-surface-2': '#1c1c26',
        'nba-gold': '#c8963c',
        'nba-gold-light': '#e8b45a',
        'nba-text': '#f0f0f0',
        'nba-muted': '#888899',
        'nba-east': '#4a90d9',
        'nba-west': '#e05c3a',
        'nba-success': '#2ecc71',
        'nba-danger': '#e74c3c',
      },
    },
  },
  plugins: [],
}
