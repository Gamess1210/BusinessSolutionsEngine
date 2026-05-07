/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1A3B66',
        'navy-light': '#1e4a80',
        cgreen: '#8CC240',
        cblue: '#4DBFED',
        cred: '#D61C5E',
        'grey-light': '#F5F7FA',
        'grey-mid': '#D8D8D8',
        'grey-dark': '#5A5A5A',
      },
    },
  },
  plugins: [],
}