import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import SeverityBadge from './SeverityBadge'
import { formatStamp, timeAgo } from '../utils/time'
import { api } from '../api/client'

const ruleLabel = (t) => (t || '').replace(/^DIONA (Possible )?/, '')

const ADVICE = [
  {
    match: /port scan/i,
    title: 'Likely reconnaissance',
    steps: [
      'Confirm whether the source is an authorized scanner or vulnerability-management host.',
      'Check the target for newly exposed or unexpected listening services.',
      'If unauthorized, isolate the source switch port or host and watch for follow-up brute-force attempts.',
    ],
  },
  {
    match: /brute force/i,
    title: 'Likely credential attack',
    steps: [
      'Review authentication logs on the target for failed and successful logins from this source.',
      'Enforce key-based SSH or rate limiting (for example fail2ban) on the target.',
      'If any login succeeded, treat the account as compromised and rotate its credentials.',
    ],
  },
]

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-0.5 break-all font-mono text-[13px] text-ink">{children}</dd>
    </div>
  )
}

function Intel({ alert }) {
  if (alert.otx_pulse_count == null)
    return (
      <p className="text-[13px] text-muted">
        No OTX result is saved for this alert. It may predate your API key or the earlier lookup may have failed.
      </p>
    )
  if (alert.otx_flagged)
    return (
      <p className="text-[13px] text-severityHigh">
        Seen in {alert.otx_pulse_count} OTX threat pulse{alert.otx_pulse_count === 1 ? '' : 's'}.
      </p>
    )
  return (
    <p className="text-[13px] text-muted">
      Not found in any OTX threat pulse. Absence from threat intel is not proof the source is benign.
    </p>
  )
}

export default function AlertDrawer({ alert: a, onClose }) {
  const [displayAlert, setDisplayAlert] = useState(a)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setDisplayAlert(a)
    setRetryError('')
  }, [a])

  const retryOtx = async () => {
    setRetrying(true)
    setRetryError('')
    try {
      setDisplayAlert(await api.enrichAlert(a.alert_id))
    } catch (error) {
      setRetryError(error.message)
    } finally {
      setRetrying(false)
    }
  }

  const advice = ADVICE.find((x) => x.match.test(displayAlert.attack_type || ''))

  return (
    <>
      <div className="fixed inset-0 z-40 animate-fade-in bg-black/50" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-[440px] animate-slide-in overflow-y-auto border-l border-line bg-panel">
        <header className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <SeverityBadge level={a.severity_level} />
            <h2 className="mt-2 text-lg font-semibold leading-snug text-ink">{ruleLabel(displayAlert.attack_type)}</h2>
            <p className="mt-1 font-mono text-[11px] text-muted">alert #{displayAlert.alert_id}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="border border-line p-1.5 text-muted hover:border-amber hover:text-amber"
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-6 p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field label="Detected">
              {formatStamp(displayAlert.timestamp)}
              <span className="block text-[11px] text-muted">{timeAgo(displayAlert.timestamp)}</span>
            </Field>
            <Field label="Observer node">{displayAlert.node_name}</Field>
            <Field label="Source IP">{displayAlert.source_ip}</Field>
            <Field label="Target IP">{displayAlert.target_ip || '—'}</Field>
          </dl>

          <section>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Threat intelligence</h3>
            <Intel alert={displayAlert} />
            {displayAlert.otx_pulse_count == null && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={retryOtx}
                  disabled={retrying}
                  className="inline-flex items-center gap-1.5 border border-line px-2.5 py-1.5 text-xs text-inkSoft transition-colors hover:border-amber hover:text-amber disabled:cursor-wait disabled:opacity-50"
                >
                  <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
                  {retrying ? 'Checking OTX…' : 'Retry OTX lookup'}
                </button>
                {retryError && <p role="alert" className="mt-2 text-xs text-severityHigh">{retryError}</p>}
              </div>
            )}
            <a
              href={`https://otx.alienvault.com/indicator/ip/${displayAlert.source_ip}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-[13px] text-amber hover:underline"
            >
              Open {a.source_ip} in AlienVault OTX ↗
            </a>
          </section>

          {advice && (
            <section>
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                Suggested response · {advice.title}
              </h3>
              <ol className="space-y-2 text-[13px] leading-relaxed text-inkSoft">
                {advice.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-mono text-amber">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
            DIONA observes passively through a SPAN/mirror port and never blocks traffic, so any response action is
            taken by your team on the affected host or switch.
          </p>
        </div>
      </aside>
    </>
  )
}
