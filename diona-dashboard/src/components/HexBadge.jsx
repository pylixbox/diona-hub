export default function HexBadge({ children, size = 40, className = '' }) {
  return (
    <div
      className={`flex items-center justify-center bg-amber font-semibold text-obsidian ${className}`}
      style={{
        width: size,
        height: size,
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
      }}
    >
      {children}
    </div>
  )
}
