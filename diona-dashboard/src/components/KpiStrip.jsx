import { useEffect, useRef, useState } from 'react'

// Counts up from the previous value to the new one (ease-out cubic).
function useCountUp(target, ms = 700) {
  const [value, setValue] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const begin = from.current
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(begin + (target - begin) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}

function Num({ n }) {
  return <>{useCountUp(n)}</>
}

function Delta({ now, prev, days }) {
  if (!prev) return <span className="text-muted">no prior {days}d to compare</span>
  const pct = Math.round(((now - prev) / prev) * 100)
  if (pct === 0) return <span className="text-muted">unchanged vs prior {days}d</span>
  const up = pct > 0
  return (
    <span className={up ? 'text-severityHigh' : 'text-online'}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% vs prior {days}d
    </span>
  )
}

function Cell({ label, value, tone = 'text-ink', foot }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${tone}`}>
        {typeof value === 'number' ? <Num n={value} /> : value}
      </p>
      <p className="mt-1 text-[11px] text-muted">{foot}</p>
    </div>
  )
}

export default function KpiStrip({ stats, nodes, days = 7 }) {
  const total = stats.total ?? 0
  const high = (stats.by_severity || []).find((s) => s.severity === 'High')?.count ?? 0
  const online = nodes.filter((n) => n.status === 'online').length
  const allUp = nodes.length > 0 && online === nodes.length
  const otx = stats.otx_flagged ?? 0

  return (
    <div className="grid grid-cols-2 divide-x divide-line border border-line border-t-2 border-t-amber bg-panel/70 md:grid-cols-5">
      <Cell label={`Alerts · ${days}d`} value={total} foot={<Delta now={total} prev={stats.prev_total} days={days} />} />
      <Cell
        label="High severity"
        value={high}
        tone={high > 0 ? 'text-severityHigh' : 'text-ink'}
        foot={total ? `${Math.round((high / total) * 100)}% of all alerts` : 'no alerts yet'}
      />
      <Cell label="Unique sources" value={stats.unique_sources ?? 0} foot="distinct source IPs" />
      <Cell
        label="OTX matches"
        value={otx}
        tone={otx > 0 ? 'text-severityMedium' : 'text-ink'}
        foot="seen in threat-intel pulses"
      />
      <Cell
        label="Nodes online"
        value={`${online}/${nodes.length}`}
        tone={allUp ? 'text-online' : 'text-severityMedium'}
        foot={allUp ? 'all sensors reporting' : 'check observer nodes'}
      />
    </div>
  )
}
