// The backend stores UTC, but SQLite hands timestamps back without a "Z",
// so JavaScript would read them as LOCAL time (8 hours off in the
// Philippines). Treat any zone-less timestamp as UTC.
export function parseUtc(iso) {
  if (!iso) return null
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso)
  return new Date(hasZone ? iso : `${iso}Z`)
}

export function timeAgo(iso) {
  const d = parseUtc(iso)
  if (!d) return 'never'
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function formatStamp(iso) {
  const d = parseUtc(iso)
  if (!d) return '—'
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
