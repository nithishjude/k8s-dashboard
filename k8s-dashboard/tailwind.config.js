/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        surface: {
          900: 'rgb(var(--surface-900) / <alpha-value>)',
          850: 'rgb(var(--surface-850) / <alpha-value>)',
          800: 'rgb(var(--surface-800) / <alpha-value>)',
          700: 'rgb(var(--surface-700) / <alpha-value>)',
          600: 'rgb(var(--surface-600) / <alpha-value>)',
          500: 'rgb(var(--surface-500) / <alpha-value>)',
          400: 'rgb(var(--surface-400) / <alpha-value>)',
          300: 'rgb(var(--surface-300) / <alpha-value>)',
        },
        status: {
          running: '#00F5A0',
          pending: '#FACC15',
          failed:  '#FF4D4F',
          unknown: '#94A3B8',
          warning: '#FACC15',
          healthy: '#00F5A0',
        },
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-in':   'slideIn 0.3s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateX(-16px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        slideUp: { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        'glow':       '0 0 20px rgba(99,102,241,0.3)',
        'glow-green': '0 0 16px rgba(34,197,94,0.25)',
        'glow-red':   '0 0 16px rgba(239,68,68,0.25)',
        'card':       '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-dark': 'radial-gradient(at 40% 20%, hsla(228,100%,15%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(263,100%,10%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(215,100%,10%,1) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
};
