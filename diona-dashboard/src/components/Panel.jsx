import { HEX } from '../utils/hex'

export default function Panel({ title, meta, children, className = '', id, flush = false }) {
  return (
    <section id={id} className={`border border-line bg-panel/70 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          <span className="h-2 w-2 shrink-0 bg-amber" style={{ clipPath: HEX }} />
          {title}
        </h3>
        {meta && <div className="text-[11px] text-muted">{meta}</div>}
      </header>
      <div className={flush ? '' : 'p-4'}>{children}</div>
    </section>
  )
}
