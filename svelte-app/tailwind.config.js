/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{svelte,ts,js}',
  ],
  theme: {
    extend: {
      colors: {
        miku: '#39C5BB',
        mikuDark: '#2AA198',
        mikuLight: '#7FDBCA',
        darkBg: '#090A0F',
        gradientStart: '#1B2735',
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'pulse-miku': 'pulse-miku 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-miku': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 20px 5px rgba(57, 197, 187, 0.7)' },
          '50%': { opacity: 0.7, boxShadow: '0 0 10px 2px rgba(57, 197, 187, 0.3)' },
        },
      },
      screens: {
        xs: '480px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
};
