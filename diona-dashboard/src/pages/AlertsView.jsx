import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import AlertsTable from '../components/AlertsTable'
import AlertDrawer from '../components/AlertDrawer'
import { api } from '../api/client'
import { downloadCsv } from '../utils/csv'
import { formatPhilippinesDate, formatPhilippinesTimestamp } from '../utils/time'

const PER_PAGE = 20
const SEVERITIES = [
  { value: '', label: 'All' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
]

export default function AlertsView() {
  const [filters, setFilters] = useState({ severity: '', attack_type: '' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, pages: 1 })
  const [selected, setSelected] = useState(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(
    () =>
      api
        .getAlerts({ ...filters, page, per_page: PER_PAGE })
        .then(setData)
        .catch(() => {}),
    [filters, page],
  )

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load])

  // If filtering leaves fewer pages than we're on, step back.
  useEffect(() => {
    if (data.pages > 0 && page > data.pages) setPage(data.pages)
  }, [data.pages, page])

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      let rows = []
      let p = 1
      let pages = 1
      do {
        const r = await api.getAlerts({ ...filters, page: p, per_page: 200 })
        rows = rows.concat(r.items)
        pages = r.pages
        p += 1
      } while (p <= pages && rows.length < 2000)
      downloadCsv(`diona-alerts-${formatPhilippinesDate(new Date())}.csv`, [
        ['timestamp_pht', 'node', 'detection', 'source_ip', 'target_ip', 'severity', 'otx_pulses'],
        ...rows.map((a) => [
          formatPhilippinesTimestamp(a.timestamp),
          a.node_name,
          a.attack_type,
          a.source_ip,
          a.target_ip,
          a.severity_level,
          a.otx_pulse_count,
        ]),
      ])
    } finally {
      setExporting(false)
    }
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex border border-line" role="group" aria-label="Severity">
        {SEVERITIES.map((s) => (
          <button
            key={s.label}
            onClick={() => setFilter({ severity: s.value })}
            className={`px-3 py-1 text-xs transition-colors ${
              filters.severity === s.value ? 'bg-amber text-onAmber' : 'text-inkSoft hover:text-amber'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <input
        value={filters.attack_type}
        onChange={(e) => setFilter({ attack_type: e.target.value })}
        placeholder="Search detection…"
        className="w-44 border border-line bg-obsidian px-2.5 py-1 text-xs text-ink placeholder:text-muted focus:border-amber focus:outline-none"
      />
      <button
        onClick={exportCsv}
        disabled={exporting || data.total === 0}
        className="flex items-center gap-1.5 border border-line px-2.5 py-1 text-xs text-inkSoft transition-colors hover:border-amber hover:text-amber disabled:opacity-40"
      >
        <Download size={13} />
        {exporting ? 'Exporting…' : 'Export CSV'}
      </button>
    </div>
  )

  const from = data.total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const to = Math.min(page * PER_PAGE, data.total)
  const footer = (
    <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted">
      <span className="font-mono">
        {from}–{to} of {data.total}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="border border-line p-1 hover:border-amber hover:text-amber disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="font-mono">
          {page} / {Math.max(1, data.pages)}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
          disabled={page >= data.pages}
          className="border border-line p-1 hover:border-amber hover:text-amber disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <>
      <Reveal>
        <PageHeader
          crumb="Alert log"
          title="Alert log"
          subtitle="Every detection from every observer node. Click a row for details and suggested response."
        />
      </Reveal>
      <Reveal delay={60}>
        <AlertsTable
          title={`${data.total} alerts`}
          alerts={data.items}
          meta={controls}
          footer={footer}
          onSelect={setSelected}
          selectedId={selected?.alert_id}
          scrollClass=""
        />
      </Reveal>
      {selected && <AlertDrawer alert={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
