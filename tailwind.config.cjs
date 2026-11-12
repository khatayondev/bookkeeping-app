// tailwind.config.cjs
module.exports = {
  darkMode: 'media', // follow system preference
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#EA580C', // warm honey-orange primary matching design
          hover: '#C2410C',
          light: '#FFF7ED',
          dark: '#9A3412',
        },
        honey: {
          50: '#FFFDF7',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#FFA200', // Honey Palace Africa primary brand color
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        base: ['1rem', '1.5rem'],
      },
    },
  },
  plugins: [],
};



