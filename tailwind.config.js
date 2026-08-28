/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Canvas + ink — "cream paper surfaces" (Mossforge / Mosaic Press, uiverse)
        canvas: {
          DEFAULT: '#FBF9F4',
          sunk: '#F4F1E9',
          raised: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#12211E',
          muted: '#5A6B66',
          faint: '#8D9A96',
        },
        // Hairline rules instead of shadows — SearchSystem / North signage systems
        rule: {
          DEFAULT: '#E2DDD1',
          strong: '#CFC8B7',
        },
        // The single charged accent
        teal: {
          50: '#EAF3F1',
          100: '#CFE3DF',
          200: '#A2C8C1',
          300: '#6FA79E',
          400: '#3F857A',
          500: '#1F6A5E',
          600: '#0F5F53',
          700: '#0B4F45',
          800: '#083A33',
          900: '#052722',
        },
        // Semantic only — never decoration (master prompt §4)
        confirmed: { DEFAULT: '#1E7A4C', soft: '#E6F2EA', ink: '#0E4A2C' },
        attention: { DEFAULT: '#B8730A', soft: '#FBF0DC', ink: '#6E4404' },
        critical: { DEFAULT: '#B3261E', soft: '#FAE7E5', ink: '#6B1712' },
        info: { DEFAULT: '#1B5FA8', soft: '#E5EFF9', ink: '#0F3A67' },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Iowan Old Style', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Mono uppercase micro-labels — DEPARTS / PLATFORM / COACH
        label: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.12em' }],
        'label-lg': ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.1em' }],
      },
      borderRadius: {
        card: '0.875rem',
        finish: '1.25rem',
      },
      transitionTimingFunction: {
        // Fast and calm. Never sacrifice speed for animation (master prompt §1).
        rail: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'rail-shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'dot-pulse': {
          '0%, 100%': { opacity: '0.25', transform: 'scale(0.82)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'rail-shimmer': 'rail-shimmer 1.6s ease-in-out infinite',
        'dot-pulse': 'dot-pulse 1.1s ease-in-out infinite',
        'rise-in': 'rise-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
