import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Charts (recharts) need literal color values, so each theme also has a
// JS palette that mirrors the CSS variables in index.css.
const PALETTES = {
  dark: {
    panel: '#211A12',
    line: '#3A2C1A',
    muted: '#9C8B6E',
    ink: '#F3ECDD',
    high: '#E4483A',
    medium: '#EA9E1F',
    low: '#D4B06B',
    hiTop: '#EE6A5D',
    hiBot: '#C93B2E',
    medTop: '#F4B655',
    medBot: '#D4860F',
    lowTop: '#E0C48F',
    lowBot: '#BE9A5C',
    cursor: 'rgba(240,169,59,0.06)',
    tipLabel: '#E8C77A',
  },
  light: {
    panel: '#FFFBF2',
    line: '#E0D3B8',
    muted: '#7A6A4D',
    ink: '#2A2014',
    high: '#D13B2E',
    medium: '#E0900F',
    low: '#C9A55C',
    hiTop: '#E2584B',
    hiBot: '#B8301F',
    medTop: '#F0B04A',
    medBot: '#C97F0A',
    lowTop: '#DDBE80',
    lowBot: '#B8933F',
    cursor: 'rgba(176,102,0,0.07)',
    tipLabel: '#8A5A00',
  },
}

const ThemeContext = createContext(null)

function initialTheme() {
  try {
    const saved = localStorage.getItem('diona-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* storage unavailable - fall through to default */
  }
  return 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('diona-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      colors: PALETTES[theme],
      toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
