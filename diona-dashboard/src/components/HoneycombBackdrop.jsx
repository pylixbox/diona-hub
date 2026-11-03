// Decorative honeycomb: a tiled hexagon outline plus a few cells that
// slowly glow. Pointy-top hexagons with side S; every pulsing cell sits
// on the same grid the pattern uses, so they line up exactly.
const S = 20
const W = Math.sqrt(3) * S

const pts = (cx, cy) => [
  [cx, cy - S],
  [cx + W / 2, cy - S / 2],
  [cx + W / 2, cy + S / 2],
  [cx, cy + S],
  [cx - W / 2, cy + S / 2],
  [cx - W / 2, cy - S / 2],
]
const hexPoints = (cx, cy) => pts(cx, cy).map((p) => p.map((n) => n.toFixed(2)).join(',')).join(' ')
const hexPath = (cx, cy) =>
  pts(cx, cy)
    .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(' ') + ' Z'

// Grid cell (row j, column k) -> center point.
const center = (j, k) => [(j % 2 === 0 ? W / 2 : 0) + k * W, S + 1.5 * S * j]

const TILE = `${hexPath(W / 2, S)} ${hexPath(0, S + 1.5 * S)} ${hexPath(W, S + 1.5 * S)}`
const PULSES = [
  [4, 6], [7, 13], [10, 4], [12, 17], [15, 9], [18, 14],
  [21, 5], [24, 12], [27, 18], [30, 8], [9, 21], [2, 16],
]

export default function HoneycombBackdrop({ lineClass = 'text-amber/20', pulse = true, id = 'hc' }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${lineClass}`}
      viewBox="0 0 840 1040"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width={W} height={3 * S} patternUnits="userSpaceOnUse">
          <path d={TILE} fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="840" height="1040" fill={`url(#${id})`} />
      {pulse &&
        PULSES.map(([j, k], i) => (
          <polygon
            key={`${j}-${k}`}
            points={hexPoints(...center(j, k))}
            className="animate-hex-pulse fill-amber"
            style={{ animationDelay: `${i * 0.9}s` }}
          />
        ))}
    </svg>
  )
}
