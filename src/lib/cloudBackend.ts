import type { SupabaseClient } from '@supabase/supabase-js'
import type { Demo } from '../types'
import { extOf, type Backend } from './backend'

const BUCKET = 'demos'
const URL_TTL = 60 * 60 * 6 // signed URLs last 6 hours

// Supabase-backed storage: metadata in the `demos` table, audio + cover files in
// the private `demos` storage bucket under `<user id>/<demo id>/...`.
export function cloudBackend(sb: SupabaseClient): Backend {
  async function uid() {
    const { data } = await sb.auth.getUser()
    if (!data.user) throw new Error('Not signed in')
    return data.user.id
  }

  async function upload(path: string, body: Blob, contentType: string) {
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, body, { contentType, upsert: true })
    if (error) throw error
  }

  return {
    mode: 'cloud',

    async list() {
      const { data, error } = await sb
        .from('demos')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Demo[]
    },

    async create(input, audio, cover, onProgress) {
      const id = crypto.randomUUID()
      const base = `${await uid()}/${id}`
      const audio_path = `${base}/audio.${extOf(audio.name)}`
      const cover_path = cover ? `${base}/cover.jpg` : null

      onProgress?.('Uploading audio…')
      await upload(audio_path, audio, audio.type || 'audio/mpeg')
      if (cover && cover_path) {
        onProgress?.('Uploading cover…')
        await upload(cover_path, cover, 'image/jpeg')
      }

      onProgress?.('Saving…')
      const { data, error } = await sb
        .from('demos')
        .insert({ ...input, id, audio_path, cover_path })
        .select()
        .single()
      if (error) {
        await sb.storage.from(BUCKET).remove([audio_path, ...(cover_path ? [cover_path] : [])])
        throw error
      }
      return data as Demo
    },

    async update(id, patch) {
      const { data, error } = await sb
        .from('demos')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Demo
    },

    async setCover(demo, cover) {
      const old = demo.cover_path
      const cover_path = cover ? `${await uid()}/${demo.id}/cover-${Date.now()}.jpg` : null
      if (cover && cover_path) await upload(cover_path, cover, 'image/jpeg')
      const { data, error } = await sb
        .from('demos')
        .update({ cover_path, updated_at: new Date().toISOString() })
        .eq('id', demo.id)
        .select()
        .single()
      if (error) throw error
      if (old) await sb.storage.from(BUCKET).remove([old])
      return data as Demo
    },

    async remove(demo) {
      const { error } = await sb.from('demos').delete().eq('id', demo.id)
      if (error) throw error
      await sb.storage
        .from(BUCKET)
        .remove([demo.audio_path, ...(demo.cover_path ? [demo.cover_path] : [])])
    },

    async audioUrl(demo) {
      const { data, error } = await sb.storage
        .from(BUCKET)
        .createSignedUrl(demo.audio_path, URL_TTL)
      if (error) throw error
      return data.signedUrl
    },

    async coverUrls(demos) {
      const withCover = demos.filter((d) => d.cover_path)
      if (!withCover.length) return {}
      const { data, error } = await sb.storage
        .from(BUCKET)
        .createSignedUrls(withCover.map((d) => d.cover_path!), URL_TTL)
      if (error) throw error
      const out: Record<string, string> = {}
      data.forEach((r, i) => {
        if (r.signedUrl) out[withCover[i].id] = r.signedUrl
      })
      return out
    },
  }
}
