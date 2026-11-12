import { useEffect, useMemo, useRef, useState } from 'react'
import { formatSize, formatTime } from '../lib/format'
import { prepareCover } from '../lib/image'
import type { Backend } from '../lib/backend'
import { camelot } from '../lib/keys'
import { player, usePlayer } from '../lib/player'
import type { Demo } from '../types'
import { Cover } from './Cover'
import { DemoFields, type FieldValues } from './DemoFields'
import { CloseIcon, DownloadIcon, HeartIcon, PauseIcon, PlayIcon, SendIcon, TrashIcon } from './Icons'
import { LABELS } from '../data/labels'
import { usePitch } from '../lib/pitch'
import { Waveform } from './Waveform'

interface Props {
  demo: Demo
  coverUrl?: string
  queue: Demo[]
  backend: Backend
  genres: string[]
  tags: string[]
  onClose: () => void
  onPitch: () => void
  onChanged: (demo: Demo) => void
  onDeleted: (demo: Demo) => void
}

const pick = (d: Demo): FieldValues => ({
  title: d.title,
  artist: d.artist,
  collabs: d.collabs,
  bpm: d.bpm,
  key: d.key,
  genre: d.genre,
  tags: d.tags,
  notes: d.notes,
  status: d.status,
  rating: d.rating,
})

export function DemoModal({ demo, coverUrl, queue, backend, genres, tags, onClose, onPitch, onChanged, onDeleted }: Props) {
  const { log } = usePitch()
  const sentLabels = LABELS.filter((l) => log[l.id]?.some((s) => s.demoId === demo.id))
  const [fields, setFields] = useState(() => pick(demo))
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const coverInput = useRef<HTMLInputElement>(null)
  const { current, playing } = usePlayer()
  const isPlaying = current?.id === demo.id && playing
  const dirty = useMemo(() => JSON.stringify(fields) !== JSON.stringify(pick(demo)), [fields, demo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !dirty && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, onClose])

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label)
    setError('')
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy('')
    }
  }

  const save = () =>
    run('Saving…', async () => {
      onChanged(await backend.update(demo.id, { ...fields, title: fields.title.trim() || 'Untitled' }))
    })

  const toggleFav = () =>
    run('', async () => {
      onChanged(await backend.update(demo.id, { favorite: !demo.favorite }))
    })

  const download = () =>
    run('Preparing download…', async () => {
      const url = await backend.audioUrl(demo)
      const blob = await (await fetch(url)).blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const ext = demo.audio_name.split('.').pop() || demo.audio_format.toLowerCase()
      a.download = `${[demo.artist, demo.title].filter(Boolean).join(' - ')}.${ext}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    })

  const remove = () => {
    if (!confirm(`Delete “${demo.title}”? This removes the audio and cover permanently.`)) return
    void run('Deleting…', async () => {
      await backend.remove(demo)
      onDeleted(demo)
    })
  }

  const credit = [demo.artist, ...demo.collabs].filter(Boolean).join(', ')

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !dirty && onClose()}>
      <div className="modal detail" role="dialog" aria-label={demo.title}>
        <button className="icon-btn close-float" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>

        <section className="detail-hero">
          <button className="detail-cover" onClick={() => coverInput.current?.click()} title="Change cover art">
            <Cover demo={demo} url={coverUrl} />
            <span className="detail-cover-hint">Change cover</span>
          </button>
          <input
            ref={coverInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f)
                void run('Uploading cover…', async () => {
                  onChanged(await backend.setCover(demo, await prepareCover(f)))
                })
            }}
          />
          <div className="detail-info">
            <span className={`status-pill status-${demo.status.toLowerCase()}`}>{demo.status}</span>
            <h2>{demo.title}</h2>
            {credit && <p className="muted">{credit}</p>}
            <div className="stat-row">
              {demo.bpm && <span>{demo.bpm} BPM</span>}
              {demo.key && <span>{demo.key} · {camelot(demo.key)}</span>}
              {demo.genre && <span>{demo.genre}</span>}
              <span>{formatTime(demo.duration)}</span>
              <span>{demo.audio_format} · {formatSize(demo.audio_size)}</span>
            </div>
            <div className="detail-actions">
              <button
                className="btn primary round"
                onClick={() => (current?.id === demo.id ? player.toggle() : player.play(demo, queue))}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button className="btn ghost round" onClick={onPitch}>
                <SendIcon width={16} height={16} />
                Submit to labels
              </button>
              <button className={`icon-btn fav ${demo.favorite ? 'on' : ''}`} onClick={toggleFav} aria-label="Favorite">
                <HeartIcon filled={demo.favorite} />
              </button>
              <button className="icon-btn" onClick={download} aria-label="Download" title="Download original file">
                <DownloadIcon />
              </button>
              <button className="icon-btn danger" onClick={remove} aria-label="Delete" title="Delete demo">
                <TrashIcon />
              </button>
            </div>
            {sentLabels.length > 0 && (
              <p className="detail-sent">
                Sent to <b>{sentLabels.length}</b> {sentLabels.length === 1 ? 'label' : 'labels'}:{' '}
                {sentLabels.map((l) => l.name).join(', ')}
              </p>
            )}
          </div>
        </section>

        <Waveform demo={demo} queue={queue} height={72} />

        <form
          className="detail-form"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <DemoFields value={fields} onChange={setFields} genres={genres} tags={tags} />
          <footer className="modal-foot">
            {busy && <span className="muted">{busy}</span>}
            {error && <span className="error">{error}</span>}
            <span className="muted small">Added {new Date(demo.created_at).toLocaleDateString()}</span>
            {dirty && (
              <>
                <button type="button" className="btn ghost" onClick={() => setFields(pick(demo))}>
                  Discard
                </button>
                <button type="submit" className="btn primary" disabled={!!busy}>
                  Save changes
                </button>
              </>
            )}
          </footer>
        </form>
      </div>
    </div>
  )
}
