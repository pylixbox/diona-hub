import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(username, password)
    } catch (err) {
      setError('Invalid username or password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-line bg-panel p-6">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={44} />
          <div>
            <p className="font-mono text-xl font-semibold text-slate-100">DIONA</p>
            <p className="text-xs text-muted">Distributed IoT-based Observer for Network Attacks</p>
          </div>
        </div>

        <label className="mb-1 block text-xs text-muted">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded border border-line bg-obsidian px-3 py-2 text-sm text-slate-200 focus:border-amber focus:outline-none"
          autoFocus
        />

        <label className="mb-1 block text-xs text-muted">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-line bg-obsidian px-3 py-2 text-sm text-slate-200 focus:border-amber focus:outline-none"
        />

        {error && <p className="mb-4 text-xs text-severityHigh">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-amber py-2 text-sm font-medium text-obsidian transition hover:bg-amberDeep disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="mt-6 flex justify-center gap-2 opacity-40">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 w-3 bg-amber" style={{ clipPath: HEX_CLIP }} />
          ))}
        </div>
      </form>
    </div>
  )
}
