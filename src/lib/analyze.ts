import { parseBlob, selectCover } from 'music-metadata'
import { prepareCover } from './image'
import { detectKey, normalizeKey } from './keys'
import { detectBpm } from './tempo'

export interface Analysis {
  title: string
  artist: string
  genre: string | null
  bpm: number | null
  key: string | null
  duration: number
  peaks: number[]
  cover: Blob | null
  format: string
}

const PEAK_COUNT = 600

function computePeaks(buffer: AudioBuffer): number[] {
  const chans = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
  const block = Math.max(1, Math.floor(buffer.length / PEAK_COUNT))
  const peaks: number[] = []
  let max = 0
  for (let p = 0; p < PEAK_COUNT; p++) {
    let peak = 0
    const end = Math.min(buffer.length, (p + 1) * block)
    // Stride through the block; checking every sample isn't needed for a picture.
    for (let i = p * block; i < end; i += 4) {
      for (const c of chans) {
        const v = Math.abs(c[i])
        if (v > peak) peak = v
      }
    }
    peaks.push(peak)
    if (peak > max) max = peak
  }
  return peaks.map((v) => Math.round((v / (max || 1)) * 1000) / 1000)
}

function titleFromFilename(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Reads tags and embedded art, then decodes the audio to compute duration, a
 * waveform, BPM and key. Tag values (if present) win over detected ones.
 */
export async function analyzeAudio(file: File, onStep?: (msg: string) => void): Promise<Analysis> {
  onStep?.('Reading tags…')
  const meta = await parseBlob(file, { skipPostHeaders: true }).catch(() => null)
  const common = meta?.common

  let cover: Blob | null = null
  const pic = selectCover(common?.picture)
  if (pic) {
    try {
      cover = await prepareCover(new Blob([pic.data as BlobPart], { type: pic.format }))
    } catch {
      cover = null
    }
  }

  let title = common?.title?.trim() || ''
  let artist = common?.artist?.trim() || ''
  if (!title) {
    // "Artist - Title.wav" is a common export naming scheme.
    const base = titleFromFilename(file.name)
    const parts = base.split(/\s+[-–]\s+/)
    if (parts.length >= 2 && !artist) {
      artist = parts[0]
      title = parts.slice(1).join(' - ')
    } else {
      title = base
    }
  }

  onStep?.('Decoding audio…')
  const ctx = new AudioContext()
  let buffer: AudioBuffer
  try {
    buffer = await ctx.decodeAudioData(await file.arrayBuffer())
  } finally {
    void ctx.close()
  }

  onStep?.('Drawing waveform…')
  const peaks = computePeaks(buffer)

  let bpm = common?.bpm ? Math.round(common.bpm) : null
  if (!bpm) {
    onStep?.('Detecting BPM…')
    const detected = detectBpm(buffer)
    bpm = detected ? Math.round(detected) : null
  }

  let key = normalizeKey(common?.key)
  if (!key) {
    onStep?.('Detecting key…')
    key = detectKey(buffer)
  }

  return {
    title,
    artist,
    genre: common?.genre?.[0] ?? null,
    bpm,
    key,
    duration: buffer.duration,
    peaks,
    cover,
    format: (file.name.includes('.') ? file.name.split('.').pop()! : meta?.format.container || '').toUpperCase(),
  }
}
