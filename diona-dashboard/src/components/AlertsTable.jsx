import Panel from './Panel'
import SeverityBadge from './SeverityBadge'
import { formatStamp, timeAgo } from '../utils/time'

const STRIPE = {
  High: 'border-l-severityHigh',
  Medium: 'border-l-severityMedium',
  Low: 'border-l-severityLow',
}
const ruleLabel = (t) => (t || '').replace(/^DIONA (Possible )?/, '')

function Intel({ alert }) {
  if (alert.otx_pulse_count == null) return <span className="text-muted/70">not checked</span>
  if (alert.otx_flagged) return <span className="text-severityHigh">● {alert.otx_pulse_count} pulses</span>
  return <span className="text-muted">no match</span>
}

export default function AlertsTable({
  alerts,
  title = 'Alert log',
  meta,
  footer,
  onSelect,
  selectedId,
  scrollClass = 'max-h-[440px] overflow-y-auto',
  emptyText = 'No alerts match these filters.',
}) {
  return (
    <Panel title={title} meta={meta} flush>
      <div className={scrollClass}>
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-panel text-[11px] uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Detection</th>
              <th className="px-4 py-2 font-medium">Source → Target</th>
              <th className="px-4 py-2 font-medium">Severity</th>
              <th className="px-4 py-2 font-medium">Intel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {alerts.map((a) => (
              <tr
                key={a.alert_id}
                tabIndex={onSelect ? 0 : undefined}
                onClick={() => onSelect?.(a)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect?.(a)}
                className={`transition-colors hover:bg-amber/5 ${onSelect ? 'cursor-pointer' : ''} ${
                  selectedId === a.alert_id ? 'bg-amber/10' : ''
                }`}
              >
                <td
                  className={`border-l-2 px-4 py-2.5 font-mono text-xs text-inkSoft ${STRIPE[a.severity_level] || 'border-l-transparent'}`}
                  title={timeAgo(a.timestamp)}
                >
                  {formatStamp(a.timestamp)}
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-[13px] text-ink">{ruleLabel(a.attack_type)}</p>
                  <p className="font-mono text-[11px] text-muted">{a.node_name}</p>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-inkSoft">
                  {a.source_ip}
                  <span className="mx-1.5 text-muted">→</span>
                  {a.target_ip || '—'}
                </td>
                <td className="px-4 py-2.5">
                  <SeverityBadge level={a.severity_level} />
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <Intel alert={a} />
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-muted">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </Panel>
  )
}
