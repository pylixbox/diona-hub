import { LayoutGrid, Radio, TrendingUp, ShieldAlert, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { HEX } from '../utils/hex'

const NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'nodes', label: 'Observer nodes', icon: Radio },
  { key: 'trends', label: 'Threat analysis', icon: TrendingUp },
  { key: 'alerts', label: 'Alert log', icon: ShieldAlert },
]

const ITEM =
  'group flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left text-[13px] transition-colors hover:border-amber hover:bg-obsidian/60 hover:text-amber'

function NavButton({ item, active, onClick }) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`${ITEM} ${active ? 'border-amber bg-obsidian/70 text-amber' : 'border-transparent text-inkSoft'}`}
    >
      <Icon size={15} className="shrink-0" />
      {item.label}
      {active && <span className="ml-auto h-1.5 w-1.5 bg-amber" style={{ clipPath: HEX }} />}
    </button>
  )
}

export default function Layout({ children, view = 'overview', onNavigate = () => {} }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-line bg-panel px-3 py-5">
        <div className="mb-6 flex items-center gap-3 border-b border-line px-1 pb-5">
          <Logo size={34} />
          <div>
            <p className="font-mono text-base font-semibold leading-tight tracking-wide text-ink">DIONA</p>
            <p className="text-[11px] leading-tight text-muted">The hive observer</p>
          </div>
        </div>

        <nav className="space-y-0.5">
          {NAV.map((item) => (
            <NavButton key={item.key} item={item} active={view === item.key} onClick={() => onNavigate(item.key)} />
          ))}
          <div className="my-3 border-t border-line" />
          <NavButton
            item={{ key: 'settings', label: 'Settings', icon: SettingsIcon }}
            active={view === 'settings'}
            onClick={() => onNavigate('settings')}
          />
        </nav>

        <div className="mt-auto space-y-1 border-t border-line px-1 pt-4 text-[11px] text-muted">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-online opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-online" />
            </span>
            Hub connected
          </div>
          <p className="font-mono text-[10px] opacity-70">v0.1 · Capstone Project 2</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-8 py-3">
          <p className="text-[13px] text-muted">Batangas State University · Lipa Campus</p>
          <div className="flex items-center gap-3 text-[13px]">
            <ThemeToggle />
            <span className="text-inkSoft">{user?.username}</span>
            <span className="border border-line px-2 py-0.5 text-[11px] text-muted">{user?.role}</span>
            <button
              onClick={logout}
              className="border border-line px-3 py-1 text-xs text-inkSoft transition-colors hover:border-severityHigh hover:text-severityHigh"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 px-8 py-7">
          <div key={view} className="mx-auto w-full max-w-[1240px] space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
