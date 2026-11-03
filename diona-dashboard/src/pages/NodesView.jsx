import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import Panel from '../components/Panel'
import SeverityBadge from '../components/SeverityBadge'
import AlertDrawer from '../components/AlertDrawer'
import { api } from '../api/client'
import { timeAgo, formatStamp } from '../utils/time'
import { HEX } from '../utils/hex'

// Honeycomb geometry for flat-top hexagons: columns sit 0.75 widths apart,
// odd columns drop half a cell, so neighbours interlock like a real comb.
const W = 132
const H = Math.round(W * 0.866)
const GAP = 4
const COLS = 4
const MIN_CELLS = 7

const cellPos = (i) => {
  const col = i % COLS
  const row = Math.floor(i / COLS)
  return {
    x: col * (W * 0.75 + GAP),
    y: row * (H + GAP) + (col % 2 ? (H + GAP) / 2 : 0),
  }
}

const ruleLabel = (t) => (t || '').replace(/^DIONA (Possible )?/, '')

function Cell({ node, index, selected, onSelect }) {
  const { x, y } = cellPos(index)
  const style = { left: x, top: y, width: W, height: H }

  if (!node) {
    return (
      <div
        className="absolute"
        style={style}
        title="Available segment - deploy another observer here"
        aria-hidden="true"
      >
        <span className="absolute inset-0 bg-line/50" style={{ clipPath: HEX }} />
        <span className="absolute inset-[2px] bg-obsidian" style={{ clipPath: HEX }} />
        <span className="relative flex h-full items-center justify-center font-mono text-lg text-line">+</span>
      </div>
    )
  }

  const online = node.status === 'online'
  const outer = selected ? 'bg-amber' : online ? 'bg-online' : 'bg-offline'
  return (
    <button
      onClick={onSelect}
      style={style}
      aria-pressed={selected}
      className="group absolute transition-transform duration-200 hover:z-10 hover:scale-[1.05]"
    >
      <span className={`absolute inset-0 transition-colors ${outer}`} style={{ clipPath: HEX }} />
      <span
        className={`absolute inset-[3px] ${selected ? 'bg-amber/10' : 'bg-panel'} bg-clip-padding`}
        style={{ clipPath: HEX }}
      />
      <span className="relative flex h-full flex-col items-center justify-center gap-1 px-7 text-center">
        <span className="relative flex h-2.5 w-2.5">
          {online && <span className="absolute inset-0 animate-ping rounded-full bg-online opacity-60" />}
          <span className={`relative h-2.5 w-2.5 rounded-full ${online ? 'bg-online' : 'bg-offline'}`} />
        </span>
        <span className="w-full truncate font-mono text-[11px] text-ink">{node.node_name}</span>
        <span className="text-[10px] text-muted">{node.alert_count} alerts</span>
      </span>
    </button>
  )
}

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-[13px] text-ink">{children}</dd>
    </div>
  )
}

export default function NodesView() {
  const [nodes, setNodes] = useState([])
  const [selId, setSelId] = useState(null)
  const [recent, setRecent] = useState([])
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    const load = () =>
      api
        .getNodes()
        .then((n) => {
          setNodes(n)
          setSelId((id) => id ?? n[0]?.node_id ?? null)
        })
        .catch(() => {})
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (selId == null) return undefined
    const load = () =>
      api
        .getAlerts({ node_id: selId, per_page: 6 })
        .then((r) => setRecent(r.items))
        .catch(() => {})
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [selId])

  const sel = nodes.find((n) => n.node_id === selId)
  const online = nodes.filter((n) => n.status === 'online').length
  const total = Math.max(nodes.length, MIN_CELLS)
  const rows = Math.ceil(total / COLS)
  const mapW = (COLS - 1) * (W * 0.75 + GAP) + W
  const mapH = rows * (H + GAP) + (H + GAP) / 2

  return (
    <>
      <Reveal>
        <PageHeader
          crumb="Observer nodes"
          title="Observer nodes"
          subtitle={`${online} of ${nodes.length} sensors reporting. Each cell is one monitored network segment.`}
        />
      </Reveal>

      <Reveal delay={60} className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
        <Panel
          title="Hive map"
          meta={
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-online" />
                online
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-offline" />
                offline
              </span>
            </span>
          }
        >
          <div className="overflow-x-auto py-2">
            <div className="relative mx-auto" style={{ width: mapW, height: mapH }}>
              {Array.from({ length: total }, (_, i) => (
                <Cell
                  key={i}
                  index={i}
                  node={nodes[i]}
                  selected={nodes[i] && nodes[i].node_id === selId}
                  onSelect={() => setSelId(nodes[i].node_id)}
                />
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted">
            Empty cells are free segments: deploy another Raspberry Pi observer and it joins the hive automatically.
          </p>
        </Panel>

        <Panel title={sel ? sel.node_name : 'Node details'}>
          {sel ? (
            <div className="space-y-6">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                <Detail label="Status">
                  <span className={sel.status === 'online' ? 'text-online' : 'text-muted'}>● {sel.status}</span>
                </Detail>
                <Detail label="Last heartbeat">
                  {sel.last_heartbeat ? timeAgo(sel.last_heartbeat) : 'never'}
                </Detail>
                <Detail label="Alerts raised">{sel.alert_count}</Detail>
                <Detail label="IP address">{sel.ip_address || '—'}</Detail>
                <Detail label="Location">{sel.location_room || 'Unassigned'}</Detail>
                <Detail label="Mode">passive / SPAN</Detail>
              </dl>

              <section>
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                  Recent alerts from this node
                </h3>
                <ul className="divide-y divide-line border border-line">
                  {recent.map((a) => (
                    <li key={a.alert_id}>
                      <button
                        onClick={() => setAlert(a)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-amber/5"
                      >
                        <SeverityBadge level={a.severity_level} />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{ruleLabel(a.attack_type)}</span>
                        <span className="shrink-0 font-mono text-[11px] text-muted" title={formatStamp(a.timestamp)}>
                          {timeAgo(a.timestamp)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {recent.length === 0 && <li className="px-3 py-4 text-[13px] text-muted">No alerts from this node.</li>}
                </ul>
              </section>
            </div>
          ) : (
            <p className="text-[13px] text-muted">No observer nodes registered yet. Start a sensor and it appears here.</p>
          )}
        </Panel>
      </Reveal>

      {alert && <AlertDrawer alert={alert} onClose={() => setAlert(null)} />}
    </>
  )
}
