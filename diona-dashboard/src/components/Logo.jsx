export default function Logo({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="DIONA logo"
    >
      <path d="M30 10 L70 10 L90 50 L70 90 L30 90 L10 50 Z" className="fill-amber" />
      <path d="M39 28 L61 28 L72 50 L61 72 L39 72 L28 50 Z" className="fill-obsidian" />
    </svg>
  )
}
