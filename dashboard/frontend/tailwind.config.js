/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0a0a',
          50: '#111111',
          100: '#161616',
          200: '#1c1c1c',
          300: '#242424',
          400: '#2e2e2e',
        },
        accent: {
          DEFAULT: '#22d3ee',
          dim: '#0e7490',
        },
      },
    },
  },
  plugins: [],
};
