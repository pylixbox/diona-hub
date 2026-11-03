export default function NodeHealthCard({ node }) {
  const isOnline = node.status === 'online'
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-100">{node.node_name}</span>
        <span className="relative flex h-2.5 w-2.5">
          {isOnline && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-online opacity-60" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-online' : 'bg-offline'}`}
          />
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">{node.location_room || 'Unassigned location'}</p>
      <div className="mt-3 flex items-center justify-between text-xs font-mono text-muted">
        <span>{node.ip_address || '—'}</span>
        <span>{node.alert_count} alerts</span>
      </div>
    </div>
  )
}
