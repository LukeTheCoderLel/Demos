import { useSyncExternalStore } from 'react'
import type { Demo } from '../types'

// One shared <audio> element for the whole app, so playback keeps going while
// you browse, and every waveform on screen can bind to the same stream.

export interface PlayerState {
  current: Demo | null
  queue: Demo[]
  playing: boolean
  loading: boolean
}

export const audio = new Audio()
audio.preload = 'auto'

let state: PlayerState = { current: null, queue: [], playing: false, loading: false }
const listeners = new Set<() => void>()
let resolveUrl: (demo: Demo) => Promise<string> = async () => ''
let coverFor: (demo: Demo) => string | undefined = () => undefined
let retried = false

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function configurePlayer(opts: {
  resolveUrl: (demo: Demo) => Promise<string>
  coverFor: (demo: Demo) => string | undefined
}) {
  resolveUrl = opts.resolveUrl
  coverFor = opts.coverFor
}

export function usePlayer() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

async function load(demo: Demo, at = 0) {
  set({ current: demo, loading: true })
  retried = false
  const url = await resolveUrl(demo)
  if (state.current?.id !== demo.id) return // user skipped while resolving
  audio.src = url
  audio.currentTime = at
  updateMediaSession(demo)
  try {
    await audio.play()
  } catch {
    set({ playing: false, loading: false })
  }
}

export const player = {
  play(demo: Demo, queue?: Demo[], at?: number) {
    if (queue) set({ queue })
    if (state.current?.id === demo.id && audio.src) {
      if (at != null) audio.currentTime = at
      void audio.play()
      return
    }
    void load(demo, at)
  },
  toggle() {
    if (!state.current) return
    if (audio.paused) void audio.play()
    else audio.pause()
  },
  step(dir: 1 | -1) {
    const { queue, current } = state
    if (!current || !queue.length) return
    if (dir === -1 && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    const i = queue.findIndex((d) => d.id === current.id)
    const next = queue[i + dir]
    if (next) void load(next)
    else if (dir === 1) {
      audio.pause()
      audio.currentTime = 0
    }
  },
  /** Keep the playing demo's details fresh after an edit (or stop if deleted). */
  sync(demos: Demo[]) {
    if (!state.current) return
    const fresh = demos.find((d) => d.id === state.current!.id)
    if (!fresh) {
      audio.pause()
      audio.removeAttribute('src')
      set({ current: null, playing: false })
      return
    }
    set({
      current: fresh,
      queue: state.queue.map((q) => demos.find((d) => d.id === q.id) ?? q),
    })
  },
}

audio.addEventListener('play', () => set({ playing: true }))
audio.addEventListener('playing', () => set({ playing: true, loading: false }))
audio.addEventListener('pause', () => set({ playing: false }))
audio.addEventListener('waiting', () => set({ loading: true }))
audio.addEventListener('canplay', () => set({ loading: false }))
audio.addEventListener('ended', () => player.step(1))
audio.addEventListener('error', async () => {
  // Cloud links expire after a few hours — fetch a fresh one once and resume.
  const cur = state.current
  if (!cur || retried) return set({ playing: false, loading: false })
  retried = true
  const t = audio.currentTime
  audio.src = await resolveUrl(cur)
  audio.currentTime = t
  void audio.play().catch(() => set({ playing: false, loading: false }))
})

function updateMediaSession(demo: Demo) {
  if (!('mediaSession' in navigator)) return
  const art = coverFor(demo)
  navigator.mediaSession.metadata = new MediaMetadata({
    title: demo.title,
    artist: [demo.artist, ...demo.collabs].filter(Boolean).join(', '),
    album: 'Demo Vault',
    artwork: art ? [{ src: art, sizes: '1000x1000', type: 'image/jpeg' }] : [],
  })
}

if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => void audio.play())
  navigator.mediaSession.setActionHandler('pause', () => audio.pause())
  navigator.mediaSession.setActionHandler('previoustrack', () => player.step(-1))
  navigator.mediaSession.setActionHandler('nexttrack', () => player.step(1))
  navigator.mediaSession.setActionHandler('seekto', (e) => {
    if (e.seekTime != null) audio.currentTime = e.seekTime
  })
}
