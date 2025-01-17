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
        primary: '#0f1923',    // darker navy
        secondary: '#1e3a5f',  // deeper ocean blue
        accent1: '#e3e8ed',    // soft white
        accent2: '#6b8bb5',    // desaturated blue
        accent3: '#60a5fa',    // adjusted light blue
      },
    },
  },
  plugins: [
    typography,
  ],
}

