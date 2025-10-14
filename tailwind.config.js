/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        miku: '#39C5BB',
        'miku-100': '#C0F2EF',
        'miku-200': '#9FEBE7',
        'miku-300': '#7FE5E0',
        'miku-400': '#39C5BB',
        'miku-500': '#2A9D95',
        'miku-600': '#1D706A',
        gradientStart: '#1B2735',
        darkBg: '#090A0F',
        'space-800': '#12161D',
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'pulse-miku': 'pulse-miku 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      screens: {
        xs: '480px',
        '3xl': '1920px',
      }
    },
  },
  plugins: [],
}
