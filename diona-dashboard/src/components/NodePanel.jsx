import Panel from './Panel'
import { timeAgo } from '../utils/time'
import { HEX } from '../utils/hex'

function Hex({ online }) {
  return (
    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
      {online && <span className="absolute inset-0 animate-ping bg-online/40" style={{ clipPath: HEX }} />}
      <span className={`h-6 w-6 ${online ? 'bg-online' : 'bg-offline'}`} style={{ clipPath: HEX }} />
    </span>
  )
}

export default function NodePanel({ nodes, onOpen }) {
  const online = nodes.filter((n) => n.status === 'online').length
  const meta = (
    <span className="flex items-center gap-3">
      <span>
        {online}/{nodes.length} online
      </span>
      {onOpen && (
        <button onClick={onOpen} className="text-amber hover:underline">
          Hive map →
        </button>
      )}
    </span>
  )
  return (
    <Panel title="Observer nodes" meta={meta}>
      <ul className="divide-y divide-line">
        {nodes.map((n) => {
          const isOnline = n.status === 'online'
          return (
            <li key={n.node_id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Hex online={isOnline} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[13px] text-ink">{n.node_name}</p>
                <p className="truncate text-[11px] text-muted">
                  {n.location_room || 'Unassigned'}
                  {n.ip_address ? ` · ${n.ip_address}` : ''}
                </p>
              </div>
              <div className="text-right text-[11px]">
                <p className={isOnline ? 'text-online' : 'text-muted'}>{isOnline ? 'online' : 'offline'}</p>
                <p className="text-muted">{n.last_heartbeat ? timeAgo(n.last_heartbeat) : 'never seen'}</p>
              </div>
            </li>
          )
        })}
        {nodes.length === 0 && <li className="text-[13px] text-muted">No observer nodes registered yet.</li>}
      </ul>
    </Panel>
  )
}
