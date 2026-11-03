import Panel from './Panel'

const BAR_COLOR = { High: 'bg-severityHigh', Medium: 'bg-severityMedium', Low: 'bg-severityLow' }

export default function TopAttackers({ data, limit = 6 }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <Panel title="Top sources" meta="color = worst severity">
      <ul className="space-y-3">
        {data.slice(0, limit).map((row) => (
          <li key={row.source_ip} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate font-mono text-xs text-inkSoft">{row.source_ip}</span>
            <div className="h-1.5 flex-1 bg-line/60">
              <div
                className={`h-1.5 transition-all duration-700 ${BAR_COLOR[row.worst_severity] || 'bg-severityMedium'}`}
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right font-mono text-xs tabular-nums text-ink">{row.count}</span>
          </li>
        ))}
        {data.length === 0 && <li className="text-[13px] text-muted">No sources yet.</li>}
      </ul>
    </Panel>
  )
}
