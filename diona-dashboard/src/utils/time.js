// The backend stores UTC, but SQLite hands timestamps back without a "Z",
// so treat any zone-less timestamp as UTC. Display timestamps in Philippines time.
export const PHILIPPINES_TIME_ZONE = 'Asia/Manila'

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
  return `${d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: PHILIPPINES_TIME_ZONE,
  })} PHT`
}

export function formatPhilippinesClock(date) {
  return `${date.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: PHILIPPINES_TIME_ZONE,
  })} PHT`
}

export function formatPhilippinesDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: PHILIPPINES_TIME_ZONE,
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function formatPhilippinesTimestamp(iso) {
  const d = parseUtc(iso)
  if (!d) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: PHILIPPINES_TIME_ZONE,
  }).formatToParts(d)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+08:00`
}
