/** @type {import('tailwindcss').Config} */
// Colors are CSS variables (defined in src/index.css) so the whole app can
// switch between dark and light themes without touching any component.
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: c('bg'),
        panel: c('panel'),
        line: c('line'),
        muted: c('muted'),
        ink: c('ink'),
        inkSoft: c('ink-soft'),
        amber: c('amber'),
        amberDeep: c('amber-deep'),
        onAmber: c('on-amber'),
        severityHigh: c('high'),
        severityMedium: c('medium'),
        severityLow: c('low'),
        online: c('online'),
        offline: c('offline'),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'hex-pulse': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '0.32' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
        'slide-in': 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        shake: 'shake 0.4s ease-in-out',
        'hex-pulse': 'hex-pulse 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
