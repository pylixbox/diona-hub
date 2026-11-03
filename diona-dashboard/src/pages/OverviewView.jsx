import { useEffect, useState, useCallback } from 'react'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import KpiStrip from '../components/KpiStrip'
import NodePanel from '../components/NodePanel'
import AlertsTable from '../components/AlertsTable'
import AlertDrawer from '../components/AlertDrawer'
import TopAttackers from '../components/TopAttackers'
import RuleBreakdown from '../components/RuleBreakdown'
import { SeverityChart, TrendChart } from '../components/Charts'
import { api } from '../api/client'

const POLL_MS = 5000
const EMPTY_STATS = {
  total: 0,
  prev_total: 0,
  unique_sources: 0,
  otx_flagged: 0,
  by_severity: [],
  by_day: [],
  by_attack_type: [],
}

export default function OverviewView({ onNavigate }) {
  const [nodes, setNodes] = useState([])
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState(EMPTY_STATS)
  const [topSources, setTopSources] = useState([])
  const [selected, setSelected] = useState(null)
  const [updated, setUpdated] = useState(null)

  const refresh = useCallback(() => {
    api
      .getNodes()
      .then((n) => {
        setNodes(n)
        setUpdated(new Date())
      })
      .catch(() => {})
    api
      .getAlerts({ per_page: 8 })
      .then((res) => setAlerts(res.items))
      .catch(() => {})
    api.getStatsSummary(7).then((s) => setStats({ ...EMPTY_STATS, ...s })).catch(() => {})
    api.getTopSources(7).then(setTopSources).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  return (
    <>
      <Reveal>
        <PageHeader
          crumb="Overview"
          title="Network overview"
          subtitle={`East-West traffic seen by ${nodes.length} observer node(s)`}
          right={
            <p className="font-mono text-[11px] text-muted">
              {updated ? `updated ${updated.toLocaleTimeString([], { hour12: false })}` : 'connecting…'}
            </p>
          }
        />
      </Reveal>

      <Reveal delay={60}>
        <KpiStrip stats={stats} nodes={nodes} days={7} />
      </Reveal>

      <Reveal delay={120} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChart data={stats.by_day} />
        </div>
        <SeverityChart data={stats.by_severity} />
      </Reveal>

      <Reveal delay={180} className="grid gap-6 lg:grid-cols-3">
        <NodePanel nodes={nodes} onOpen={() => onNavigate('nodes')} />
        <TopAttackers data={topSources} />
        <RuleBreakdown data={stats.by_attack_type} />
      </Reveal>

      <Reveal delay={240}>
        <AlertsTable
          title="Latest alerts"
          alerts={alerts}
          onSelect={setSelected}
          selectedId={selected?.alert_id}
          scrollClass=""
          meta={
            <button onClick={() => onNavigate('alerts')} className="text-amber hover:underline">
              View all →
            </button>
          }
          emptyText="No alerts yet."
        />
      </Reveal>

      {selected && <AlertDrawer alert={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
