import { openDB, type IDBPDatabase } from 'idb'
import type { Demo } from '../types'
import { extOf, type Backend } from './backend'

// Stores everything in this browser's IndexedDB. Used until Supabase keys are
// configured, so the app is usable (and testable) right away.

let dbp: Promise<IDBPDatabase> | null = null
function db() {
  dbp ??= openDB('demo-vault', 1, {
    upgrade(d) {
      d.createObjectStore('demos', { keyPath: 'id' })
      d.createObjectStore('files')
    },
  })
  return dbp
}

const objectUrls = new Map<string, string>()
async function fileUrl(path: string) {
  const cached = objectUrls.get(path)
  if (cached) return cached
  const blob = (await (await db()).get('files', path)) as Blob | undefined
  if (!blob) return ''
  const url = URL.createObjectURL(blob)
  objectUrls.set(path, url)
  return url
}

export const localBackend: Backend = {
  mode: 'local',

  async list() {
    return (await (await db()).getAll('demos')) as Demo[]
  },

  async create(input, audio, cover) {
    const d = await db()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const audio_path = `${id}/audio.${extOf(audio.name)}`
    const cover_path = cover ? `${id}/cover.jpg` : null
    await d.put('files', audio, audio_path)
    if (cover && cover_path) await d.put('files', cover, cover_path)
    const demo: Demo = { ...input, id, audio_path, cover_path, created_at: now, updated_at: now }
    await d.put('demos', demo)
    return demo
  },

  async update(id, patch) {
    const d = await db()
    const cur = (await d.get('demos', id)) as Demo
    const next = { ...cur, ...patch, updated_at: new Date().toISOString() }
    await d.put('demos', next)
    return next
  },

  async setCover(demo, cover) {
    const d = await db()
    if (demo.cover_path) {
      await d.delete('files', demo.cover_path)
      objectUrls.delete(demo.cover_path)
    }
    // New path each time so cached URLs never show the old art.
    const cover_path = cover ? `${demo.id}/cover-${Date.now()}.jpg` : null
    if (cover && cover_path) await d.put('files', cover, cover_path)
    const next = { ...demo, cover_path, updated_at: new Date().toISOString() }
    await d.put('demos', next)
    return next
  },

  async remove(demo) {
    const d = await db()
    await d.delete('files', demo.audio_path)
    if (demo.cover_path) await d.delete('files', demo.cover_path)
    await d.delete('demos', demo.id)
  },

  audioUrl(demo) {
    return fileUrl(demo.audio_path)
  },

  async coverUrls(demos) {
    const out: Record<string, string> = {}
    for (const demo of demos) {
      if (demo.cover_path) out[demo.id] = await fileUrl(demo.cover_path)
    }
    return out
  },
}
