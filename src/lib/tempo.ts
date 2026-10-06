// Tempo detection: onset-strength envelope → autocorrelation. The coarse beat
// period is refined by measuring the autocorrelation peak 8 beats out, which
// gives roughly ±0.2 BPM precision instead of ±3.

type Audio = Pick<AudioBuffer, 'sampleRate' | 'length' | 'numberOfChannels' | 'getChannelData'>

const MIN_BPM = 85
const MAX_BPM = 175

export function detectBpm(buffer: Audio): number | null {
  const sr = buffer.sampleRate
  const hop = Math.round(sr / 200) // ~5ms frames
  const fps = sr / hop
  const chans = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))

  // Analyse up to 2 minutes from the middle of the track.
  const span = Math.min(buffer.length, sr * 120)
  const start = Math.floor((buffer.length - span) / 2)
  const frames = Math.floor(span / hop)
  if (frames < fps * 6) return null

  // Per-frame energy in two bands: lows (kick/bass) and highs (hats/snares).
  const low = new Float32Array(frames)
  const high = new Float32Array(frames)
  let lp = 0
  let prev = 0
  const a = Math.exp((-2 * Math.PI * 150) / sr)
  for (let f = 0; f < frames; f++) {
    let el = 0
    let eh = 0
    for (let i = 0; i < hop; i++) {
      const idx = start + f * hop + i
      let s = 0
      for (const c of chans) s += c[idx]
      lp = a * lp + (1 - a) * s
      const hp = s - prev // crude high-pass (first difference)
      prev = s
      el += lp * lp
      eh += hp * hp
    }
    low[f] = el
    high[f] = eh
  }

  // Onset strength: rise in log energy against a short moving average, so
  // sustained notes and beating between bass tones don't register as hits.
  const onset = new Float32Array(frames)
  const W = 4
  for (const band of [low, high]) {
    let peak = 0
    for (let f = 0; f < frames; f++) peak = Math.max(peak, band[f])
    const env = band.map((e) => Math.log1p((100 * e) / (peak || 1)))
    let total = 0
    for (let f = W; f < frames; f++) total += env[f]
    for (let f = W; f < frames; f++) {
      let avg = 0
      for (let k = 1; k <= W; k++) avg += env[f - k]
      onset[f] += Math.max(0, env[f] - avg / W) / (total / frames || 1)
    }
  }
  let mean = 0
  for (let f = 0; f < frames; f++) mean += onset[f]
  mean /= frames
  for (let f = 0; f < frames; f++) onset[f] -= mean

  const ac = (lag: number) => {
    let s = 0
    for (let f = 0; f + lag < frames; f++) s += onset[f] * onset[f + lag]
    return s / (frames - lag)
  }

  // Coarse search: score each beat period with its multiples too, which
  // favours the true beat over half/double-time candidates.
  const minLag = Math.floor((60 * fps) / MAX_BPM)
  const maxLag = Math.ceil((60 * fps) / MIN_BPM)
  let best = -Infinity
  let bestLag = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    const score = ac(lag) + 0.5 * ac(lag * 2) + 0.25 * ac(lag * 4)
    if (score > best) {
      best = score
      bestLag = lag
    }
  }
  if (!bestLag || best <= 0) return null

  // Refine: find the exact peak near 8 beats and interpolate.
  const beats = 8
  const centre = bestLag * beats
  let peakLag = centre
  let peakVal = -Infinity
  for (let lag = centre - beats; lag <= centre + beats; lag++) {
    if (lag + 1 >= frames) break
    const v = ac(lag)
    if (v > peakVal) {
      peakVal = v
      peakLag = lag
    }
  }
  const y0 = ac(peakLag - 1)
  const y2 = ac(peakLag + 1)
  const denom = y0 - 2 * peakVal + y2
  const offset = denom ? (0.5 * (y0 - y2)) / denom : 0
  const period = (peakLag + Math.max(-0.5, Math.min(0.5, offset))) / beats

  let bpm = (60 * fps) / period
  while (bpm < MIN_BPM) bpm *= 2
  while (bpm >= MAX_BPM + 1) bpm /= 2
  return Math.round(bpm * 10) / 10
}
