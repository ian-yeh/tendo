/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['DM Mono', 'monospace'],
        serif: ['Instrument Serif', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        accent: '#c8f060',
      },
    },
  },
  plugins: [],
}