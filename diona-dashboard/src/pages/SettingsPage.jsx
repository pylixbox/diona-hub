import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { api } from '../api/client'

const EMPTY_FORM = { telegram_bot_token: '', telegram_chat_id: '', otx_api_key: '' }
const INPUT =
  'w-full border border-line bg-obsidian px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-amber focus:outline-none'

export default function SettingsPage() {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [status, setStatus] = useState('')
  const [testStatus, setTestStatus] = useState(null)
  const [otxTestStatus, setOtxTestStatus] = useState(null)

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {})
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setStatus('Saving…')
    try {
      await api.saveSettings(form)
      const fresh = await api.getSettings()
      setSettings(fresh)
      setForm(EMPTY_FORM)
      setStatus('Saved - takes effect immediately, no restart needed.')
    } catch (err) {
      setStatus(`Could not save: ${err.message}`)
    }
  }

  const handleTest = async () => {
    setTestStatus('sending')
    try {
      await api.testTelegram()
      setTestStatus('ok')
    } catch (err) {
      setTestStatus(err.message || 'Test failed.')
    }
  }

  const handleTestOtx = async () => {
    setOtxTestStatus({ checking: true })
    try {
      setOtxTestStatus(await api.testOtx())
    } catch (err) {
      setOtxTestStatus({ error: err.message || 'OTX test failed.' })
    }
  }

  const current = (key) =>
    settings?.[key]?.configured ? <span className="ml-2 text-online">currently {settings[key].masked}</span> : null

  return (
    <>
      <Reveal>
        <PageHeader crumb="Settings" title="Settings" subtitle="Notification and threat-intel configuration" />
      </Reveal>

      <Reveal delay={60}>
        <form onSubmit={handleSave} className="max-w-xl space-y-5 border border-line bg-panel/70 p-5">
          <div>
            <h2 className="mb-1 text-sm font-medium text-ink">Telegram alerts</h2>
            <p className="mb-3 text-xs text-muted">
              Message <span className="font-mono text-amber">@BotFather</span> on Telegram to create a bot and get a
              token. Message your new bot once, then check{' '}
              <span className="font-mono text-amber">api.telegram.org/bot&lt;token&gt;/getUpdates</span> for your chat ID.
            </p>
            <label className="mb-1 block text-xs text-muted">Bot token{current('telegram_bot_token')}</label>
            <input
              value={form.telegram_bot_token}
              onChange={(e) => setForm({ ...form, telegram_bot_token: e.target.value })}
              placeholder={settings?.telegram_bot_token?.configured ? 'Leave blank to keep current token' : '123456:ABC-DEF...'}
              className={`${INPUT} mb-3`}
            />
            <label className="mb-1 block text-xs text-muted">Chat ID{current('telegram_chat_id')}</label>
            <input
              value={form.telegram_chat_id}
              onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })}
              placeholder={settings?.telegram_chat_id?.configured ? 'Leave blank to keep current chat ID' : '-100123456789'}
              className={INPUT}
            />
          </div>

          <div className="border-t border-line pt-4">
            <h2 className="mb-1 text-sm font-medium text-ink">OTX threat intelligence</h2>
            <p className="mb-3 text-xs text-muted">
              Free key from <span className="font-mono text-amber">otx.alienvault.com</span> under account settings.
              Enrichment just skips itself without one - nothing else breaks.
            </p>
            <label className="mb-1 block text-xs text-muted">API key{current('otx_api_key')}</label>
            <input
              value={form.otx_api_key}
              onChange={(e) => setForm({ ...form, otx_api_key: e.target.value })}
              placeholder={settings?.otx_api_key?.configured ? 'Leave blank to keep current key' : 'your OTX API key'}
              className={INPUT}
            />
            <p className="mt-2 text-xs text-muted">
              Test uses public IP 8.8.8.8. A successful lookup with zero pulses still confirms the key works.
            </p>
            <button
              type="button"
              onClick={handleTestOtx}
              disabled={otxTestStatus?.checking}
              className="mt-3 border border-line px-3 py-1.5 text-xs text-inkSoft transition-colors hover:border-amber hover:text-amber disabled:cursor-wait disabled:opacity-50"
            >
              {otxTestStatus?.checking ? 'Checking OTX…' : 'Test OTX connection'}
            </button>
            {otxTestStatus?.pulse_count != null && (
              <p role="status" className="mt-2 text-xs text-online">
                OTX connection verified. {otxTestStatus.pulse_count} pulse(s) found for {otxTestStatus.test_ip}.
              </p>
            )}
            {otxTestStatus?.error && <p role="alert" className="mt-2 text-xs text-severityHigh">{otxTestStatus.error}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button type="submit" className="bg-amber px-4 py-2 text-sm font-medium text-onAmber hover:bg-amberDeep">
              Save
            </button>
            <button
              type="button"
              onClick={handleTest}
              className="border border-line px-4 py-2 text-sm text-inkSoft hover:border-amber hover:text-amber"
            >
              Send test alert
            </button>
            {status && <span className="text-xs text-muted">{status}</span>}
          </div>

          {testStatus === 'sending' && <p className="text-xs text-muted">Sending…</p>}
          {testStatus === 'ok' && <p className="text-xs text-online">Test alert sent - check Telegram.</p>}
          {testStatus && testStatus !== 'ok' && testStatus !== 'sending' && (
            <p className="text-xs text-severityHigh">{testStatus}</p>
          )}
        </form>
      </Reveal>
    </>
  )
}
