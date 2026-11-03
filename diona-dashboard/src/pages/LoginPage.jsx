import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Globe, Lock, Radio, Send, ShieldAlert, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import HoneycombBackdrop from '../components/HoneycombBackdrop'
import ThemeToggle from '../components/ThemeToggle'
import { HEX } from '../utils/hex'

// Edit these for your defense.
const PROPONENTS = ['Felix Miguel M. Eleazar', 'Gezelle Franz D. Maranan']

const FEATURES = [
  {
    icon: Radio,
    title: 'Passive by design',
    text: 'Out-of-band SPAN monitoring. Never in the traffic path, so it cannot cause downtime.',
  },
  {
    icon: ShieldAlert,
    title: 'Signature-based detection',
    text: 'Suricata rules for port scans and SSH brute force on Raspberry Pi 4 sensors.',
  },
  {
    icon: Send,
    title: 'Real-time alerting',
    text: 'Telegram push notifications reach IT staff the moment a threat is detected.',
  },
  {
    icon: Globe,
    title: 'Threat-intel enrichment',
    text: 'Source IPs are checked against AlienVault OTX for known-bad reputation.',
  },
]

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</label>
      <div className="flex h-12 items-center gap-3 border border-line bg-panel/60 px-3.5 transition-colors focus-within:border-amber">
        <Icon size={16} className="shrink-0 text-muted" />
        {children}
      </div>
    </div>
  )
}

const INPUT = 'h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/60'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [errorCount, setErrorCount] = useState(0)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Can't reach the DIONA hub. Is the backend running?"
          : 'Incorrect username or password.',
      )
      setErrorCount((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-obsidian lg:grid-cols-[1.15fr_1fr]">
      {/* Brand panel - always dark, even in light mode */}
      <aside className="theme-dark relative hidden overflow-hidden bg-obsidian text-ink lg:flex lg:flex-col lg:justify-between lg:p-14">
        <HoneycombBackdrop id="hc-brand" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 18% 8%, rgb(var(--c-amber) / 0.16), transparent 55%), linear-gradient(to bottom, rgb(var(--c-bg)) 0%, transparent 16%, transparent 72%, rgb(var(--c-bg)) 100%)',
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <Logo size={44} />
          <span className="font-mono text-2xl font-semibold tracking-wide">DIONA</span>
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-amber">
            Distributed IoT-based Observer for Network Attacks
          </p>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">
            See the traffic your perimeter <span className="text-amber">can&apos;t.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-inkSoft">
            A low-cost network of Raspberry Pi observers that watches East-West traffic inside the LAN, flags port scans
            and brute-force attempts, and alerts administrators in real time.
          </p>

          <ul className="mt-10 grid gap-x-8 gap-y-6 xl:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center bg-amber/15 text-amber"
                  style={{ clipPath: HEX }}
                >
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-[15px] font-medium">{title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="relative z-10 border-t border-line pt-5 text-[13px] leading-relaxed text-muted">
          <p className="font-medium text-inkSoft">Capstone Project 2 · BS Information Technology, Network Technology</p>
          <p>Batangas State University – The National Engineering University · Lipa City</p>
          <p className="mt-1 font-mono text-[12px]">{PROPONENTS.join('  ·  ')}</p>
        </footer>
      </aside>

      {/* Sign-in */}
      <main className="relative flex items-center justify-center overflow-hidden px-6 py-12">
        <HoneycombBackdrop lineClass="text-amber/10" pulse={false} id="hc-form" />
        <div className="absolute right-6 top-6 z-10">
          <ThemeToggle />
        </div>

        <div className="relative z-10 w-full max-w-md animate-fade-up">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Logo size={40} />
            <span className="font-mono text-2xl font-semibold tracking-wide text-ink">DIONA</span>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber">Secure access</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-ink">Welcome back</h2>
          <p className="mt-2 text-[15px] text-muted">Sign in to the DIONA operations console.</p>

          <form onSubmit={submit} className="mt-9 space-y-5">
            <Field label="Username" icon={User}>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={INPUT}
                placeholder="admin"
                autoComplete="username"
                autoFocus
              />
            </Field>

            <Field label="Password" icon={Lock}>
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="shrink-0 text-muted transition-colors hover:text-amber"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Field>

            {error && (
              <div
                key={errorCount}
                role="alert"
                className="animate-shake border border-severityHigh/40 bg-severityHigh/10 px-3.5 py-2.5 text-[13px] text-severityHigh"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !username || !password}
              className="group flex h-12 w-full items-center justify-center gap-2 bg-amber text-[15px] font-medium text-onAmber transition-colors hover:bg-amberDeep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-onAmber/30 border-t-onAmber" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 flex items-center gap-2 border-t border-line pt-5 text-[12px] text-muted">
            <span className="h-2 w-2 shrink-0 bg-amber" style={{ clipPath: HEX }} />
            Authorized IT personnel only · out-of-band monitoring, no inline blocking
          </div>
        </div>
      </main>
    </div>
  )
}
