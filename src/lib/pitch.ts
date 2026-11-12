import { useSyncExternalStore } from 'react'
import type { Label } from '../data/labels'
import { camelot } from './keys'
import type { Demo } from '../types'

// Everything here stays in this browser (localStorage). There is no cloud.

export interface PitchProfile {
  artist: string
  city: string
  bio: string
  links: string
  signature: string
  /** Gmail account to compose from, for people signed into several. */
  gmailAccount: string
}

export interface Submission {
  demoId: string
  demoTitle: string
  at: string
  via: 'gmail' | 'trackstack' | 'portal'
}

interface PitchState {
  profile: PitchProfile
  /** demo id -> private stream/download link */
  shareLinks: Record<string, string>
  /** label id -> submissions */
  log: Record<string, Submission[]>
}

const KEY = 'dv.pitch'
const EMPTY_PROFILE: PitchProfile = { artist: '', city: 'Miami', bio: '', links: '', signature: '', gmailAccount: '' }

function load(): PitchState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<PitchState>
    return {
      profile: { ...EMPTY_PROFILE, ...raw.profile },
      shareLinks: raw.shareLinks ?? {},
      log: raw.log ?? {},
    }
  } catch {
    return { profile: EMPTY_PROFILE, shareLinks: {}, log: {} }
  }
}

let state = load()
const subs = new Set<() => void>()

function commit(next: PitchState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch { /* storage unavailable: keep it in memory for this session */ }
  subs.forEach((f) => f())
}

export const pitch = {
  get: () => state,
  subscribe(f: () => void) {
    subs.add(f)
    return () => subs.delete(f)
  },
  setProfile(p: PitchProfile) {
    commit({ ...state, profile: p })
  },
  setShareLink(demoId: string, url: string) {
    commit({ ...state, shareLinks: { ...state.shareLinks, [demoId]: url.trim() } })
  },
  record(labelId: string, s: Submission) {
    const prev = state.log[labelId] ?? []
    commit({ ...state, log: { ...state.log, [labelId]: [s, ...prev] } })
  },
  undo(labelId: string, demoId: string) {
    const prev = state.log[labelId] ?? []
    commit({ ...state, log: { ...state.log, [labelId]: prev.filter((s) => s.demoId !== demoId) } })
  },
}

export function usePitch() {
  return useSyncExternalStore(pitch.subscribe, pitch.get)
}

/** Most recent submission of this demo to this label, if any. */
export function sentTo(log: PitchState['log'], labelId: string, demoId?: string) {
  const list = log[labelId] ?? []
  return demoId ? list.find((s) => s.demoId === demoId) : list[0]
}

const credit = (d: Demo, p: PitchProfile) => [d.artist || p.artist, ...d.collabs].filter(Boolean).join(', ')

export function subjectFor(d: Demo | undefined, p: PitchProfile) {
  if (!d) return `Demo submission: ${p.artist || '[Artist name]'}`
  const facts = [d.genre, d.bpm ? `${d.bpm} BPM` : null].filter(Boolean).join(', ')
  return `Demo submission: ${credit(d, p) || p.artist} - ${d.title}${facts ? ` (${facts})` : ''}`
}

export function bodyFor(label: Label, d: Demo | undefined, p: PitchProfile, link: string) {
  const artist = (d && credit(d, p)) || p.artist || '[Your artist name]'
  const who = `${p.artist || artist}${p.city ? `, a house music producer from ${p.city}` : ', a house music producer'}`
  const lines = [
    `Hi ${label.name} A&R team,`,
    '',
    `I'm ${who}. I've been following ${label.name} for a while and I think this record is right for the label.`,
    '',
  ]
  if (d) {
    const facts = [
      d.genre,
      d.bpm ? `${d.bpm} BPM` : null,
      d.key ? `${d.key} (${camelot(d.key)})` : null,
    ].filter(Boolean)
    lines.push(`Track: ${artist} - ${d.title}`)
    if (facts.length) lines.push(facts.join(' · '))
  } else {
    lines.push('Track: [Artist] - [Title]')
  }
  lines.push(`Private stream / WAV download: ${link || '[paste your private SoundCloud / Dropbox / Drive link]'}`)
  lines.push('', 'The track is unreleased, finished and has never been signed to another label.')
  if (p.bio.trim()) lines.push('', p.bio.trim())
  if (p.links.trim()) lines.push('', p.links.trim())
  lines.push('', 'Thank you for listening.', '', p.signature.trim() || `Best,\n${p.artist || artist}`)
  return lines.join('\n')
}

/** Opens a Gmail compose window with the label's address already in "To". */
export function gmailUrl(to: string, subject: string, body: string, account?: string) {
  const q = new URLSearchParams({ view: 'cm', fs: '1', to, su: subject, body })
  if (account?.trim()) q.set('authuser', account.trim())
  return `https://mail.google.com/mail/?${q.toString()}`
}
