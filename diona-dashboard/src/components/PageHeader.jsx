export default function PageHeader({ crumb, title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.16em] text-amber">
          DIONA <span className="text-muted">/ {crumb}</span>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}
