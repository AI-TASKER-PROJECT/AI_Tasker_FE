/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14213d',
        brand: {
          50: '#fff0f3',
          100: '#ffe3eb',
          200: '#ffc1d7',
          300: '#ff90b9',
          400: '#ff4d94',
          500: '#df0e84',
          600: '#c50073',
          700: '#a30060',
          800: '#860051',
          900: '#6a0041',
        },
        mint: {
          50: '#effcf7',
          100: '#d9f8ea',
          500: '#26c281',
          600: '#14a96e',
        },
        coral: {
          50: '#fff4f1',
          100: '#ffe3dc',
          500: '#ff7966',
          600: '#f15e4b',
        },
        sun: '#ffd66b',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(223, 14, 132, 0.12)',
        card: '0 10px 30px rgba(223, 14, 132, 0.08)',
        glow: '0 0 0 8px rgba(223, 14, 132, 0.08)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
        display: ['Manrope', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.08)' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 2.8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
