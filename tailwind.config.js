/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* IRCTC navy — sampled from the reference header, login panel, primary buttons */
        navy: {
          50: '#eef1f9',
          100: '#d8dff0',
          200: '#b0bee1',
          300: '#7e91c9',
          400: '#4d63ab',
          500: '#2c4291',
          600: '#1f3178',
          700: '#1a2b6d',
          800: '#152257',
          900: '#0f1940',
        },
        /* Warm orange accent — "Starts Here", active Assistant nav, send button, Tatkal */
        saffron: {
          50: '#fff5eb',
          100: '#ffe6cc',
          200: '#ffcb99',
          300: '#fdaa5c',
          400: '#f9902f',
          500: '#f5821f',
          600: '#dd6c0d',
          700: '#b5530a',
          800: '#8a3f0c',
          900: '#6b330d',
        },
        /* Surfaces — light grey-blue page, white cards */
        page: '#f5f7fb',
        surface: {
          DEFAULT: '#ffffff',
          sunk: '#f8fafc',
          tint: '#eef2fa',
        },
        line: {
          DEFAULT: '#e5e9f2',
          strong: '#d3daea',
        },
        ink: {
          DEFAULT: '#1a2233',
          muted: '#5b6779',
          faint: '#8b95a7',
        },
        /* Semantic — matched to the reference badges */
        confirmed: { DEFAULT: '#16a34a', soft: '#dcfce7', ink: '#166534' },
        attention: { DEFAULT: '#ea580c', soft: '#ffedd5', ink: '#9a3412' },
        critical: { DEFAULT: '#dc2626', soft: '#fee2e2', ink: '#991b1b' },
        info: { DEFAULT: '#2563eb', soft: '#dbeafe', ink: '#1e40af' },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        label: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        'label-lg': ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        card: '0.75rem',
        tile: '0.625rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(26, 43, 109, 0.04), 0 1px 3px rgba(26, 43, 109, 0.06)',
        lift: '0 6px 16px rgba(26, 43, 109, 0.10), 0 2px 6px rgba(26, 43, 109, 0.06)',
        panel: '0 12px 40px rgba(15, 25, 64, 0.16)',
      },
      transitionTimingFunction: {
        rail: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'shine-slide': {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(320%) skewX(-18deg)' },
        },
        'live-pulse': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(2.1)', opacity: '0' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        /* Login hero: the locomotive drawing into the platform, then idling */
        'train-arrive': {
          '0%': { transform: 'translateX(-46%) scale(1.02)' },
          '100%': { transform: 'translateX(0) scale(1)' },
        },
        'train-idle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-1.5px)' },
        },
        'rail-sweep': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-180px)' },
        },
        'wire-drift': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-240px)' },
        },
        'steam-rise': {
          '0%': { opacity: '0', transform: 'translateY(4px) scale(0.7)' },
          '35%': { opacity: '0.5' },
          '100%': { opacity: '0', transform: 'translateY(-26px) scale(1.5)' },
        },
        'sun-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '0.8' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'shine-slide': 'shine-slide 0.6s ease-out',
        'live-pulse': 'live-pulse 1.8s ease-out infinite',
        'rise-in': 'rise-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-left': 'slide-in-left 0.18s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 0.18s cubic-bezier(0.22, 1, 0.36, 1) both',
        'train-arrive': 'train-arrive 5.5s cubic-bezier(0.16, 0.8, 0.24, 1) both',
        'train-idle': 'train-idle 3.2s ease-in-out 5.5s infinite',
        'rail-sweep': 'rail-sweep 1.1s linear infinite',
        'wire-drift': 'wire-drift 6s linear infinite',
        'steam-rise': 'steam-rise 3.4s ease-out infinite',
        'sun-glow': 'sun-glow 6s ease-in-out infinite',
        'spin-slow': 'spin-slow 1.1s linear infinite',
      },
    },
  },
  plugins: [],
};
