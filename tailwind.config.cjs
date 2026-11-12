// tailwind.config.cjs
module.exports = {
  darkMode: 'media', // follow system preference
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6E00', // vibrant signature orange from design
          hover: '#E56300',
          light: '#FFF4EB',
          dark: '#CC5800',
        },
        dark: {
          card: '#111111', // deep charcoal black from design
          cardHover: '#1A1A1A',
        },
        honey: {
          50: '#FFF9F5',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF6E00', // core vibrant orange
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        base: ['1rem', '1.5rem'],
      },
      borderRadius: {
        '2xl': '1.25rem', // 20px
        '3xl': '1.75rem', // 28px
      },
    },
  },
  plugins: [],
};




