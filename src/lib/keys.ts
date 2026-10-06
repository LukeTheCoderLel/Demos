// Musical keys, Camelot notation, and a lightweight key detector.

const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

// Camelot wheel number for each pitch class (index = semitone above C).
const CAMELOT_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1]
const CAMELOT_MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10]

/** All 24 keys in the form "C", "Am", "F#m", ordered for a dropdown. */
export const ALL_KEYS = [...NOTES, ...NOTES.map((n) => n + 'm')]

const ALIASES: Record<string, string> = {
  'Db': 'C#', 'D#': 'Eb', 'Gb': 'F#', 'G#': 'Ab', 'A#': 'Bb',
}

/** Normalise free-form key text ("A minor", "Amin", "8A", "f#") to "F#m"-style. */
export function normalizeKey(raw: string | undefined | null): string | null {
  if (!raw) return null
  const s = raw.trim()
  const camelot = /^(\d{1,2})\s*([AB])$/i.exec(s)
  if (camelot) {
    const n = Number(camelot[1])
    const minor = camelot[2].toUpperCase() === 'A'
    const pc = (minor ? CAMELOT_MINOR : CAMELOT_MAJOR).indexOf(n)
    return pc < 0 ? null : NOTES[pc] + (minor ? 'm' : '')
  }
  const m = /^([A-Ga-g])([#b♯♭]?)\s*(m|min|minor|maj|major)?$/i.exec(s.replace(/\s+/g, ' '))
  if (!m) return null
  let note = m[1].toUpperCase() + (m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : m[2])
  note = ALIASES[note] ?? note
  if (!NOTES.includes(note)) {
    // e.g. "Cb", "E#", "Fb"
    return null
  }
  const minor = !!m[3] && m[3].toLowerCase().startsWith('m') && !m[3].toLowerCase().startsWith('maj')
  return note + (minor ? 'm' : '')
}

export function camelot(key: string | null): string | null {
  if (!key) return null
  const minor = key.endsWith('m')
  const pc = NOTES.indexOf(minor ? key.slice(0, -1) : key)
  if (pc < 0) return null
  return (minor ? CAMELOT_MINOR : CAMELOT_MAJOR)[pc] + (minor ? 'A' : 'B')
}

// Krumhansl–Kessler key profiles.
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k
        const b = a + len / 2
        const tr = re[b] * cr - im[b] * ci
        const ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }
}

function correlate(a: number[], b: number[]) {
  const ma = a.reduce((s, x) => s + x, 0) / 12
  const mb = b.reduce((s, x) => s + x, 0) / 12
  let num = 0, da = 0, db = 0
  for (let i = 0; i < 12; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return num / Math.sqrt(da * db || 1)
}

/**
 * Estimates the key of an audio buffer from a chroma profile of (up to) 90
 * seconds from the middle of the track. A best guess — always editable.
 */
export function detectKey(buffer: AudioBuffer): string | null {
  const decim = Math.max(1, Math.round(buffer.sampleRate / 11025))
  const sr = buffer.sampleRate / decim
  const chans = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
  const total = buffer.length
  const span = Math.min(total, Math.round(buffer.sampleRate * 90))
  const start = Math.floor((total - span) / 2)

  // Mono + decimate (box filter as a cheap low-pass).
  const mono = new Float32Array(Math.floor(span / decim))
  for (let i = 0; i < mono.length; i++) {
    let s = 0
    for (let j = 0; j < decim; j++) {
      const idx = start + i * decim + j
      for (const c of chans) s += c[idx]
    }
    mono[i] = s / (decim * chans.length)
  }

  const N = 4096
  const re = new Float64Array(N)
  const im = new Float64Array(N)
  const chroma = new Array(12).fill(0)
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N))
  const binPc: number[] = []
  for (let k = 0; k < N / 2; k++) {
    const f = (k * sr) / N
    binPc[k] = f < 60 || f > 2100 ? -1 : (((Math.round(12 * Math.log2(f / 440)) + 9) % 12) + 12) % 12
  }

  for (let off = 0; off + N <= mono.length; off += N) {
    for (let i = 0; i < N; i++) {
      re[i] = mono[off + i] * win[i]
      im[i] = 0
    }
    fft(re, im)
    for (let k = 1; k < N / 2; k++) {
      const pc = binPc[k]
      if (pc >= 0) chroma[pc] += Math.sqrt(Math.hypot(re[k], im[k]))
    }
  }
  if (chroma.every((x) => x === 0)) return null

  let best = -Infinity
  let bestKey: string | null = null
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotated = chroma.map((_, i) => chroma[(i + tonic) % 12])
    const maj = correlate(rotated, MAJOR)
    const min = correlate(rotated, MINOR)
    if (maj > best) { best = maj; bestKey = NOTES[tonic] }
    if (min > best) { best = min; bestKey = NOTES[tonic] + 'm' }
  }
  return bestKey
}
