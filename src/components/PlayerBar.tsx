import { useEffect, useState } from 'react'
import { formatTime } from '../lib/format'
import { camelot } from '../lib/keys'
import { audio, player, usePlayer } from '../lib/player'
import { Cover } from './Cover'
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from './Icons'
import { Waveform } from './Waveform'

export function PlayerBar({ coverUrls, onOpen }: { coverUrls: Record<string, string>; onOpen: (id: string) => void }) {
  const { current, queue, playing, loading } = usePlayer()
  const [time, setTime] = useState(0)

  useEffect(() => {
    const tick = () => setTime(audio.currentTime)
    audio.addEventListener('timeupdate', tick)
    audio.addEventListener('seeked', tick)
    return () => {
      audio.removeEventListener('timeupdate', tick)
      audio.removeEventListener('seeked', tick)
    }
  }, [])

  // Space bar toggles playback (unless typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(t.tagName)) return
      e.preventDefault()
      player.toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!current) return null
  const i = queue.findIndex((d) => d.id === current.id)
  const meta = [current.bpm && `${current.bpm} BPM`, current.key && camelot(current.key)].filter(Boolean).join(' · ')

  return (
    <div className="player">
      <button className="player-track" onClick={() => onOpen(current.id)}>
        <Cover demo={current} url={coverUrls[current.id]} />
        <span className="player-text">
          <strong>{current.title}</strong>
          <span className="muted">{[current.artist, meta].filter(Boolean).join(' · ')}</span>
        </span>
      </button>

      <div className="player-controls">
        <button className="icon-btn" onClick={() => player.step(-1)} aria-label="Previous">
          <PrevIcon />
        </button>
        <button className="play-main" onClick={() => player.toggle()} aria-label={playing ? 'Pause' : 'Play'}>
          {loading && !playing ? <span className="spinner sm light" /> : playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className="icon-btn" onClick={() => player.step(1)} disabled={i >= queue.length - 1} aria-label="Next">
          <NextIcon />
        </button>
      </div>

      <div className="player-wave">
        <span className="time">{formatTime(time)}</span>
        <Waveform demo={current} height={36} />
        <span className="time">{formatTime(current.duration)}</span>
      </div>
    </div>
  )
}
