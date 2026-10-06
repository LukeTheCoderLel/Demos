import type { Demo } from '../types'

// Soft gradients for demos without art — picked deterministically from the id
// so a track always gets the same one.
const GRADIENTS = [
  ['#c4b5fd', '#8b5cf6'],
  ['#a5b4fc', '#6366f1'],
  ['#f0abfc', '#a855f7'],
  ['#ddd6fe', '#7c3aed'],
  ['#c7d2fe', '#a78bfa'],
  ['#e9d5ff', '#9333ea'],
]

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function Cover({ demo, url, className = '' }: { demo: Demo; url?: string; className?: string }) {
  if (url) {
    return <img className={`cover ${className}`} src={url} alt="" loading="lazy" draggable={false} />
  }
  const [a, b] = GRADIENTS[hash(demo.id) % GRADIENTS.length]
  const initials = demo.title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  return (
    <div className={`cover cover-empty ${className}`} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      <span>{initials || '♪'}</span>
    </div>
  )
}
