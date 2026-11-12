import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Backend } from './lib/backend'
import { cloudBackend } from './lib/cloudBackend'
import { localBackend } from './lib/localBackend'
import { ALL_KEYS, camelot } from './lib/keys'
import { configurePlayer, player } from './lib/player'
import { supabase } from './lib/supabase'
import { STATUSES, type Demo, type Status } from './types'
import { DemoCard } from './components/DemoCard'
import { DemoModal } from './components/DemoModal'
import { FilterIcon, HeartIcon, LogoMark, PlusIcon, SearchIcon, SendIcon } from './components/Icons'
import { LabelsView } from './components/LabelsView'
import { Login } from './components/Login'
import { PlayerBar } from './components/PlayerBar'
import { UploadModal } from './components/UploadModal'

type Sort = 'newest' | 'oldest' | 'title' | 'bpm' | 'rating'
type View = 'vault' | 'labels'

interface Filters {
  q: string
  genre: string | null
  status: Status | null
  key: string | null
  bpmMin: string
  bpmMax: string
  favorites: boolean
  minRating: number
}

const EMPTY: Filters = { q: '', genre: null, status: null, key: null, bpmMin: '', bpmMax: '', favorites: false, minRating: 0 }

function readPref<T extends string>(k: string, fallback: T): T {
  try {
    return (localStorage.getItem(k) as T) || fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const backend = useMemo<Backend | null>(() => {
    if (!supabase) return localBackend
    return session ? cloudBackend(supabase) : null
  }, [session])

  if (!authReady) return <div className="splash"><div className="spinner" /></div>
  if (supabase && !session) return <Login sb={supabase} />
  return backend && <Library backend={backend} />
}

function Library({ backend }: { backend: Backend }) {
  const [demos, setDemos] = useState<Demo[]>([])
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState<Sort>(() => readPref('dv.sort', 'newest'))
  const [openId, setOpenId] = useState<string | null>(null)
  const [uploading, setUploading] = useState<File[] | null>(null)
  const [dragging, setDragging] = useState(false)
  const [localNote, setLocalNote] = useState(() => readPref('dv.localNote', 'show') === 'show')
  const [view, setView] = useState<View>(() => readPref<View>('dv.view', 'vault'))
  const [labelQuery, setLabelQuery] = useState('')
  const [pitchId, setPitchId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('dv.pitchDemo')
    } catch {
      return null
    }
  })

  const refresh = useCallback(async () => {
    try {
      const list = await backend.list()
      setDemos(list)
      setCovers(await backend.coverUrls(list))
      setLoadError('')
    } catch (e) {
      console.error(e)
      setLoadError(e instanceof Error ? e.message : 'Could not load your demos')
    } finally {
      setLoaded(true)
    }
  }, [backend])

  useEffect(() => {
    void refresh()
    // Pick up changes made on another device when you come back to the app.
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  useEffect(() => {
    if (loaded) player.sync(demos)
  }, [demos, loaded])

  useEffect(() => {
    configurePlayer({ resolveUrl: (d) => backend.audioUrl(d), coverFor: (d) => covers[d.id] })
  }, [backend, covers])

  useEffect(() => {
    try {
      localStorage.setItem('dv.sort', sort)
      localStorage.setItem('dv.view', view)
      if (pitchId) localStorage.setItem('dv.pitchDemo', pitchId)
      else localStorage.removeItem('dv.pitchDemo')
    } catch { /* storage unavailable */ }
  }, [sort, view, pitchId])


  // Drop audio anywhere on the page to start an upload.
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const leave = () => {
      depth = Math.max(0, depth - 1)
      if (!depth) setDragging(false)
    }
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault()
    const drop = (e: DragEvent) => {
      e.preventDefault()
      depth = 0
      setDragging(false)
      const files = [...(e.dataTransfer?.files ?? [])]
      if (files.length) setUploading((u) => u ?? files)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])

  const genres = useMemo(
    () => [...new Set(demos.map((d) => d.genre).filter((g): g is string => !!g))].sort(),
    [demos],
  )
  const tags = useMemo(() => [...new Set(demos.flatMap((d) => d.tags))].sort(), [demos])

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    const min = Number(filters.bpmMin) || 0
    const max = Number(filters.bpmMax) || Infinity
    const list = demos.filter((d) => {
      if (filters.favorites && !d.favorite) return false
      if (filters.genre && d.genre !== filters.genre) return false
      if (filters.status && d.status !== filters.status) return false
      if (filters.key && d.key !== filters.key) return false
      if (filters.minRating && d.rating < filters.minRating) return false
      if ((min || max < Infinity) && (d.bpm == null || d.bpm < min || d.bpm > max)) return false
      if (q) {
        const hay = [d.title, d.artist, d.genre, d.notes, ...d.collabs, ...d.tags.map((t) => '#' + t), d.key, camelot(d.key)]
          .join(' ')
          .toLowerCase()
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false
      }
      return true
    })
    const by: Record<Sort, (a: Demo, b: Demo) => number> = {
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      oldest: (a, b) => a.created_at.localeCompare(b.created_at),
      title: (a, b) => a.title.localeCompare(b.title),
      bpm: (a, b) => (a.bpm ?? 999) - (b.bpm ?? 999),
      rating: (a, b) => b.rating - a.rating || b.created_at.localeCompare(a.created_at),
    }
    return list.sort(by[sort])
  }, [demos, filters, sort])

  const activeFilters =
    (filters.status ? 1 : 0) + (filters.key ? 1 : 0) + (filters.bpmMin || filters.bpmMax ? 1 : 0) + (filters.minRating ? 1 : 0)
  const anyFilter = activeFilters > 0 || !!filters.q || !!filters.genre || filters.favorites

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const d of demos) c[d.status] = (c[d.status] ?? 0) + 1
    return c
  }, [demos])

  function upsert(demo: Demo) {
    setDemos((list) =>
      list.some((d) => d.id === demo.id) ? list.map((d) => (d.id === demo.id ? demo : d)) : [demo, ...list],
    )
    void backend.coverUrls([demo]).then((u) => setCovers((c) => ({ ...c, ...u })))
  }

  async function toggleFavorite(demo: Demo) {
    upsert({ ...demo, favorite: !demo.favorite })
    try {
      upsert(await backend.update(demo.id, { favorite: !demo.favorite }))
    } catch {
      upsert(demo)
    }
  }

  // Logging a submission moves a WIP/Ready demo to "Sent".
  async function markDemoSent(demo: Demo) {
    if (demo.status === 'Sent' || demo.status === 'Signed') return
    try {
      upsert(await backend.update(demo.id, { status: 'Sent' }))
    } catch (e) {
      console.error(e)
    }
  }

  function pitchDemo(id: string) {
    setPitchId(id)
    setOpenId(null)
    setView('labels')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const open = demos.find((d) => d.id === openId)
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }))

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <LogoMark width={36} height={36} />
          <span className="brand-name">
            <b className="gold-text">Demo Vault</b>
            <small>Private members</small>
          </span>
        </div>
        <nav className="tabs" aria-label="Sections">
          <button className={view === 'vault' ? 'active' : ''} onClick={() => setView('vault')}>
            The Vault
          </button>
          <button className={view === 'labels' ? 'active' : ''} onClick={() => setView('labels')}>
            <SendIcon width={14} height={14} /> Label Room
          </button>
        </nav>
        <div className="search">
          <SearchIcon width={18} height={18} />
          {view === 'vault' ? (
            <input
              type="search"
              placeholder="Search title, artist, #tag, key…"
              value={filters.q}
              onChange={(e) => set('q', e.target.value)}
            />
          ) : (
            <input
              type="search"
              placeholder="Search labels, cities, founders…"
              value={labelQuery}
              onChange={(e) => setLabelQuery(e.target.value)}
            />
          )}
        </div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={() => setUploading([])}>
            <PlusIcon width={18} height={18} />
            <span className="hide-sm">Upload</span>
          </button>
          {supabase && (
            <button className="btn ghost hide-sm" onClick={() => supabase!.auth.signOut()}>
              Sign out
            </button>
          )}
        </div>
      </header>

      {backend.mode === 'local' && localNote && (
        <div className="banner">
          <span>
            <strong>Private vault.</strong> Your demos and full-size WAVs stay on this device. Nothing is uploaded
            anywhere.
          </span>
          <button
            className="link-btn"
            onClick={() => {
              setLocalNote(false)
              try {
                localStorage.setItem('dv.localNote', 'hide')
              } catch { /* storage unavailable */ }
            }}
          >
            Got it
          </button>
        </div>
      )}

      <main className="content">
        {view === 'labels' ? (
          <LabelsView
            demos={demos}
            covers={covers}
            demoId={demos.some((d) => d.id === pitchId) ? pitchId : null}
            onDemoChange={setPitchId}
            query={labelQuery}
            onSent={(d) => void markDemoSent(d)}
          />
        ) : (
        <>
        <section className="summary">
          <div>
            <p className="eyebrow">Your collection</p>
            <h1>The Vault</h1>
            <p className="muted">
              {demos.length} {demos.length === 1 ? 'demo' : 'demos'}
              {STATUSES.filter((s) => counts[s]).map((s) => (
                <span key={s}> · {counts[s]} {s.toLowerCase()}</span>
              ))}
            </p>
          </div>
          <div className="summary-controls">
            <button className={`btn ghost ${showFilters || activeFilters ? 'active' : ''}`} onClick={() => setShowFilters((v) => !v)}>
              <FilterIcon width={18} height={18} />
              Filters{activeFilters ? ` (${activeFilters})` : ''}
            </button>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title A–Z</option>
              <option value="bpm">BPM</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </section>

        <nav className="chips" aria-label="Genres">
          <button className={!filters.genre && !filters.favorites ? 'active' : ''} onClick={() => setFilters((f) => ({ ...f, genre: null, favorites: false }))}>
            All
          </button>
          <button className={filters.favorites ? 'active' : ''} onClick={() => set('favorites', !filters.favorites)}>
            <HeartIcon filled={filters.favorites} width={14} height={14} /> Favorites
          </button>
          {genres.map((g) => (
            <button key={g} className={filters.genre === g ? 'active' : ''} onClick={() => set('genre', filters.genre === g ? null : g)}>
              {g}
            </button>
          ))}
        </nav>

        {showFilters && (
          <section className="filter-panel">
            <div className="field">
              <span>Status</span>
              <div className="segmented">
                <button className={!filters.status ? 'active' : ''} onClick={() => set('status', null)}>Any</button>
                {STATUSES.map((s) => (
                  <button key={s} className={`status-${s.toLowerCase()} ${filters.status === s ? 'active' : ''}`} onClick={() => set('status', filters.status === s ? null : s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>Key</span>
              <select value={filters.key ?? ''} onChange={(e) => set('key', e.target.value || null)}>
                <option value="">Any key</option>
                {ALL_KEYS.map((k) => (
                  <option key={k} value={k}>{k} · {camelot(k)}</option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>BPM range</span>
              <div className="range">
                <input type="number" inputMode="numeric" placeholder="Min" value={filters.bpmMin} onChange={(e) => set('bpmMin', e.target.value)} />
                <span>–</span>
                <input type="number" inputMode="numeric" placeholder="Max" value={filters.bpmMax} onChange={(e) => set('bpmMax', e.target.value)} />
              </div>
            </div>
            <label className="field">
              <span>Min rating</span>
              <select value={filters.minRating} onChange={(e) => set('minRating', Number(e.target.value))}>
                <option value={0}>Any</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{'★'.repeat(n)}{n < 5 ? ' & up' : ''}</option>
                ))}
              </select>
            </label>
            {anyFilter && (
              <button className="link-btn" onClick={() => setFilters(EMPTY)}>
                Clear all
              </button>
            )}
          </section>
        )}

        {loadError && <p className="error">{loadError}</p>}

        {!loaded ? (
          <div className="grid">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="card skeleton" />)}
          </div>
        ) : demos.length === 0 ? (
          <button className="empty" onClick={() => setUploading([])}>
            <span className="empty-icon"><PlusIcon width={28} height={28} /></span>
            <strong>Upload your first demo</strong>
            <span className="muted">Drop an MP3 or WAV anywhere, or tap here. Title, cover art, BPM and key fill in automatically.</span>
          </button>
        ) : visible.length === 0 ? (
          <div className="empty static">
            <strong>No demos match</strong>
            <button className="link-btn" onClick={() => setFilters(EMPTY)}>Clear filters</button>
          </div>
        ) : (
          <div className="grid">
            {visible.map((d) => (
              <DemoCard
                key={d.id}
                demo={d}
                coverUrl={covers[d.id]}
                queue={visible}
                onOpen={() => setOpenId(d.id)}
                onFavorite={() => void toggleFavorite(d)}
              />
            ))}
          </div>
        )}
        </>
        )}
      </main>

      <PlayerBar coverUrls={covers} onOpen={setOpenId} />

      {open && (
        <DemoModal
          key={open.id}
          demo={open}
          coverUrl={covers[open.id]}
          queue={visible}
          backend={backend}
          genres={genres}
          tags={tags}
          onClose={() => setOpenId(null)}
          onPitch={() => pitchDemo(open.id)}
          onChanged={upsert}
          onDeleted={(d) => {
            setOpenId(null)
            setDemos((list) => list.filter((x) => x.id !== d.id))
          }}
        />
      )}

      {uploading && (
        <UploadModal
          backend={backend}
          genres={genres}
          tags={tags}
          initialFiles={uploading}
          onClose={() => setUploading(null)}
          onCreated={upsert}
        />
      )}

      {dragging && !uploading && (
        <div className="drop-overlay">
          <div>
            <strong>Drop to upload</strong>
            <span>MP3 or WAV, plus an image for cover art</span>
          </div>
        </div>
      )}
    </div>
  )
}
