/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          950: '#0d3b2a',
          900: '#14532d',
          800: '#166534',
        },
      },
    },
  },
  plugins: [],
};
