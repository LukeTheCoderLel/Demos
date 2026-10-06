import { useEffect, useRef, useState } from 'react'
import type { Analysis } from '../lib/analyze'
import { formatSize, formatTime } from '../lib/format'
import { prepareCover } from '../lib/image'
import type { Backend } from '../lib/backend'
import type { Demo } from '../types'
import { DemoFields, type FieldValues } from './DemoFields'
import { CloseIcon, ImageIcon, UploadIcon } from './Icons'

interface Props {
  backend: Backend
  genres: string[]
  tags: string[]
  initialFiles?: File[]
  onClose: () => void
  onCreated: (demo: Demo) => void
}

const AUDIO_EXT = /\.(mp3|wav|wave|aiff?|flac|m4a|aac|ogg)$/i
const isAudio = (f: File) => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name)
const isImage = (f: File) => f.type.startsWith('image/')

function lastArtist() {
  try {
    return localStorage.getItem('dv.artist') ?? ''
  } catch {
    return ''
  }
}

export function UploadModal({ backend, genres, tags, initialFiles, onClose, onCreated }: Props) {
  const [queue, setQueue] = useState<File[]>([])
  const [done, setDone] = useState(0)
  const [pendingCover, setPendingCover] = useState<Blob | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [cover, setCover] = useState<Blob | null>(null)
  const [coverUrl, setCoverUrl] = useState<string>()
  const [fields, setFields] = useState<FieldValues | null>(null)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)
  const file = queue[0]

  async function accept(files: File[]) {
    setError('')
    const audios = files.filter(isAudio)
    const img = files.find(isImage)
    if (img) {
      const c = await prepareCover(img).catch(() => null)
      if (analysis) setCover(c)
      else setPendingCover(c)
    }
    if (audios.length) setQueue((q) => [...q, ...audios])
    else if (!img) setError('That doesn’t look like an audio file. Try an MP3 or WAV.')
  }

  useEffect(() => {
    if (initialFiles?.length) void accept(initialFiles)
  }, [])

  // Analyse whichever file is at the front of the queue.
  useEffect(() => {
    if (!file) return
    let cancelled = false
    setAnalysis(null)
    setFields(null)
    // Loaded on demand: the tag reader and BPM detector are only needed here.
    import('../lib/analyze')
      .then(({ analyzeAudio }) => analyzeAudio(file, setStep))
      .then((a) => {
        if (cancelled) return
        setAnalysis(a)
        setCover((c) => pendingCover ?? a.cover ?? c)
        setPendingCover(null)
        setFields({
          title: a.title,
          artist: a.artist || lastArtist(),
          collabs: [],
          bpm: a.bpm,
          key: a.key,
          genre: a.genre,
          tags: [],
          notes: '',
          status: 'WIP',
          rating: 0,
        })
      })
      .catch((e) => {
        if (cancelled) return
        console.error(e)
        setError(`Couldn’t read “${file.name}”. The browser may not support this format.`)
        setQueue((q) => q.slice(1))
      })
    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    if (!cover) return setCoverUrl(undefined)
    const u = URL.createObjectURL(cover)
    setCoverUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [cover])

  async function save() {
    if (!file || !analysis || !fields) return
    setSaving(true)
    setError('')
    try {
      const demo = await backend.create(
        {
          ...fields,
          title: fields.title.trim() || 'Untitled',
          artist: fields.artist.trim(),
          favorite: false,
          duration: analysis.duration,
          peaks: analysis.peaks,
          audio_name: file.name,
          audio_format: analysis.format,
          audio_size: file.size,
        },
        file,
        cover,
        setStep,
      )
      try {
        if (fields.artist.trim()) localStorage.setItem('dv.artist', fields.artist.trim())
      } catch { /* storage unavailable */ }
      onCreated(demo)
      setDone((n) => n + 1)
      setCover(null)
      if (queue.length <= 1) onClose()
      setQueue((q) => q.slice(1))
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Upload failed — check your connection and try again.')
    } finally {
      setSaving(false)
      setStep('')
    }
  }

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(true)
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      void accept([...e.dataTransfer.files])
    },
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal upload" role="dialog" aria-label="Upload demo" {...dropProps}>
        <header className="modal-head">
          <h2>
            New demo
            {queue.length + done > 1 && (
              <small>
                {done + 1} of {queue.length + done}
              </small>
            )}
          </h2>
          <button className="icon-btn" onClick={onClose} disabled={saving} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <input
          ref={fileInput}
          type="file"
          accept="audio/*,.wav,.mp3,.aif,.aiff,.flac,image/*"
          multiple
          hidden
          onChange={(e) => {
            void accept([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) setCover(await prepareCover(f))
          }}
        />

        {!file && (
          <button className={`dropzone ${dragging ? 'over' : ''}`} onClick={() => fileInput.current?.click()}>
            <span className="dropzone-icon">
              <UploadIcon width={28} height={28} />
            </span>
            <strong>Drop your demo here</strong>
            <span>or tap to choose · MP3 or WAV (add an image to use as cover art)</span>
            {pendingCover && <span className="pill">Cover art ready ✓</span>}
          </button>
        )}

        {file && !fields && (
          <div className="analyzing">
            <div className="spinner" />
            <strong>{file.name}</strong>
            <span>{step || 'Getting ready…'}</span>
          </div>
        )}

        {file && fields && analysis && (
          <div className="upload-body">
            <aside className="upload-side">
              <button
                type="button"
                className={`cover-pick ${coverUrl ? 'has' : ''}`}
                onClick={() => coverInput.current?.click()}
              >
                {coverUrl ? <img src={coverUrl} alt="Cover art" /> : <ImageIcon width={32} height={32} />}
                <span>{coverUrl ? 'Change cover' : 'Add cover art'}</span>
              </button>
              {coverUrl && (
                <button type="button" className="link-btn" onClick={() => setCover(null)}>
                  Remove cover
                </button>
              )}
              <MiniWave peaks={analysis.peaks} />
              <dl className="file-meta">
                <div><dt>File</dt><dd title={file.name}>{file.name}</dd></div>
                <div><dt>Format</dt><dd>{analysis.format}</dd></div>
                <div><dt>Length</dt><dd>{formatTime(analysis.duration)}</dd></div>
                <div><dt>Size</dt><dd>{formatSize(file.size)}</dd></div>
              </dl>
            </aside>
            <form
              className="upload-form"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <DemoFields
                value={fields}
                onChange={setFields}
                genres={genres}
                tags={tags}
                detected={{ bpm: analysis.bpm != null, key: analysis.key != null }}
              />
              <footer className="modal-foot">
                {step && saving && <span className="muted">{step}</span>}
                <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? 'Saving…' : queue.length > 1 ? 'Save & next' : 'Save demo'}
                </button>
              </footer>
            </form>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}

export function MiniWave({ peaks }: { peaks: number[] }) {
  const bars = 90
  const step = Math.max(1, Math.floor(peaks.length / bars))
  const vals = Array.from({ length: bars }, (_, i) => {
    const slice = peaks.slice(i * step, (i + 1) * step)
    return slice.length ? Math.max(...slice) : 0
  })
  return (
    <svg className="mini-wave" viewBox={`0 0 ${bars * 3} 40`} preserveAspectRatio="none" aria-hidden>
      {vals.map((v, i) => {
        const h = Math.max(2, v * 38)
        return <rect key={i} x={i * 3} y={20 - h / 2} width={2} height={h} rx={1} />
      })}
    </svg>
  )
}
