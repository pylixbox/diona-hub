const TONE = { High: 'text-severityHigh', Medium: 'text-severityMedium', Low: 'text-severityLow' }
const DOT = { High: 'bg-severityHigh', Medium: 'bg-severityMedium', Low: 'bg-severityLow' }

export default function SeverityBadge({ level }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider ${TONE[level] || 'text-muted'}`}>
      <span className={`h-1.5 w-1.5 ${DOT[level] || 'bg-muted'}`} />
      {level || 'Unknown'}
    </span>
  )
}
