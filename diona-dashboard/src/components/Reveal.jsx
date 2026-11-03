// Fades/slides a section in; stagger sections with the `delay` prop (ms).
export default function Reveal({ delay = 0, className = '', children }) {
  return (
    <div className={`animate-fade-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
