/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d6e4ff',
          200: '#adc6ff',
          300: '#84a9ff',
          400: '#6690ff',
          500: '#3d6dff',
          600: '#1d4ed8',
          700: '#1e3a8a',
          800: '#172554',
          900: '#0f172a',
        },
        accent: '#f97316',
        surface: '#f8fafc',
        card: '#ffffff',
      },
      boxShadow: {
        'card': '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
      },
    },
  },
  plugins: [],
}
