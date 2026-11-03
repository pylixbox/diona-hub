import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { HEX } from '../utils/hex'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative h-8 w-[58px] shrink-0 border border-line bg-obsidian/60 transition hover:border-amber ${className}`}
    >
      <Moon size={13} className="absolute left-[8px] top-[8px] text-muted" />
      <Sun size={13} className="absolute right-[8px] top-[8px] text-muted" />
      <span
        className={`absolute top-[3px] flex h-6 w-6 items-center justify-center bg-amber text-onAmber transition-all duration-300 ${
          dark ? 'left-[3px]' : 'left-[29px]'
        }`}
        style={{ clipPath: HEX }}
      >
        {dark ? <Moon size={12} /> : <Sun size={12} />}
      </span>
    </button>
  )
}
