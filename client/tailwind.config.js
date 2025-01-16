import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1D2D25',    // dark green
        secondary: '#91524B',  // medium rose
        accent1: '#CCD2D2',    // light gray
        accent2: '#BA7D66',    // light rose
        accent3: '#C09E94',    // light rose
      },
    },
  },
  plugins: [
    typography,
  ],
}

