import type { Demo } from '../types'

// Black-and-gold gradients for demos without art — picked deterministically from the id
// so a track always gets the same one.
const GRADIENTS = [
  ['#3a2f12', '#0b0b0c'],
  ['#5a4517', '#121212'],
  ['#2a2416', '#000000'],
  ['#6b5420', '#1a1407'],
  ['#1c1c1e', '#3d3015'],
  ['#4a3a14', '#0e0e10'],
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
