import Panel from './Panel'

const label = (t) => (t || '').replace(/^DIONA (Possible )?/, '')

export default function RuleBreakdown({ data, days = 7 }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1
  return (
    <Panel title="Detection rules" meta={`${days}d`}>
      <ul className="space-y-4">
        {data.map((r) => {
          const pct = Math.round((r.count / total) * 100)
          return (
            <li key={r.attack_type}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-[13px] leading-snug text-ink">{label(r.attack_type)}</span>
                <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink">
                  {r.count}
                  <span className="ml-1.5 text-[11px] text-muted">{pct}%</span>
                </span>
              </div>
              <div className="h-1 bg-line/60">
                <div className="h-1 bg-amber transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
        {data.length === 0 && <li className="text-[13px] text-muted">No detections yet.</li>}
      </ul>
    </Panel>
  )
}
