// tailwind.config.cjs
module.exports = {
  darkMode: 'media', // follow system preference
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000', // pure monochrome black
          hover: '#1F1F1F',
          light: '#F4F4F5',
          dark: '#FFFFFF',
        },
        dark: {
          card: '#121212', // deep monochrome charcoal
          cardHover: '#1C1C1C',
        },
        mono: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Poppins', 'monospace'],
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




