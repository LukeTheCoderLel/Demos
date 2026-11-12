import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { audio, player, usePlayer } from '../lib/player'
import type { Demo } from '../types'

interface Props {
  demo: Demo
  queue?: Demo[]
  height?: number
}

/**
 * Scrubbable waveform drawn from the peaks saved at upload time (no download
 * needed to render). When this demo is the one playing it follows the shared
 * player; otherwise clicking it starts playback from that spot.
 */
export function Waveform({ demo, queue, height = 56 }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const { current } = usePlayer()
  const bound = current?.id === demo.id
  const queueRef = useRef(queue)
  useEffect(() => {
    queueRef.current = queue
  })

  useEffect(() => {
    if (!el.current) return
    const ws = WaveSurfer.create({
      container: el.current,
      height,
      waveColor: '#3a3631',
      progressColor: '#d4af37',
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1.5,
      barRadius: 2,
      normalize: true,
      peaks: [demo.peaks.length ? demo.peaks : [0]],
      duration: demo.duration || 1,
      ...(bound ? { media: audio } : {}),
    })
    if (!bound) {
      ws.on('interaction', (t) => player.play(demo, queueRef.current, t))
    }
    return () => ws.destroy()
  }, [demo.id, demo.peaks, demo.duration, bound, height])

  return <div ref={el} className="waveform" />
}
