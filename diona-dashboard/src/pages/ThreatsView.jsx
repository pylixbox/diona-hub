import { useEffect, useState, useCallback } from 'react'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import KpiStrip from '../components/KpiStrip'
import TopAttackers from '../components/TopAttackers'
import RuleBreakdown from '../components/RuleBreakdown'
import { SeverityChart, TrendChart } from '../components/Charts'
import { api } from '../api/client'

const RANGES = [7, 14, 30]
const EMPTY_STATS = {
  total: 0,
  prev_total: 0,
  unique_sources: 0,
  otx_flagged: 0,
  by_severity: [],
  by_day: [],
  by_attack_type: [],
}

export default function ThreatsView() {
  const [days, setDays] = useState(7)
  const [nodes, setNodes] = useState([])
  const [stats, setStats] = useState(EMPTY_STATS)
  const [top, setTop] = useState([])

  const load = useCallback(() => {
    api.getNodes().then(setNodes).catch(() => {})
    api.getStatsSummary(days).then((s) => setStats({ ...EMPTY_STATS, ...s })).catch(() => {})
    api.getTopSources(days).then(setTop).catch(() => {})
  }, [days])

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load])

  const range = (
    <div className="flex border border-line" role="group" aria-label="Time range">
      {RANGES.map((d) => (
        <button
          key={d}
          onClick={() => setDays(d)}
          className={`px-3.5 py-1.5 font-mono text-xs transition-colors ${
            days === d ? 'bg-amber text-onAmber' : 'text-inkSoft hover:text-amber'
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  )

  return (
    <>
      <Reveal>
        <PageHeader
          crumb="Threat analysis"
          title="Threat analysis"
          subtitle="Who is attacking, with what, and how it is trending"
          right={range}
        />
      </Reveal>

      <Reveal delay={60}>
        <KpiStrip stats={stats} nodes={nodes} days={days} />
      </Reveal>

      <Reveal delay={120}>
        <TrendChart data={stats.by_day} height={300} />
      </Reveal>

      <Reveal delay={180} className="grid gap-6 lg:grid-cols-3">
        <SeverityChart data={stats.by_severity} days={days} />
        <RuleBreakdown data={stats.by_attack_type} days={days} />
        <TopAttackers data={top} limit={8} />
      </Reveal>
    </>
  )
}
