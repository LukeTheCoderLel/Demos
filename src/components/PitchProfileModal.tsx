import { useEffect, useState } from 'react'
import { LABELS } from '../data/labels'
import { bodyFor, pitch, subjectFor, usePitch, type PitchProfile } from '../lib/pitch'
import type { Demo } from '../types'
import { CloseIcon } from './Icons'

interface Props {
  demo?: Demo
  link: string
  onClose: () => void
}

/** The details that go into every Gmail pitch, with a live preview. */
export function PitchProfileModal({ demo, link, onClose }: Props) {
  const { profile } = usePitch()
  const [p, setP] = useState<PitchProfile>(profile)
  const set = <K extends keyof PitchProfile>(k: K, v: string) => setP((x) => ({ ...x, [k]: v }))
  const sample = LABELS.find((l) => l.method === 'email' && l.miami) ?? LABELS[0]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Pitch profile">
        <div className="modal-head">
          <h2>Pitch profile <small>goes into every email</small></h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>
        <form
          className="profile-body"
          onSubmit={(e) => {
            e.preventDefault()
            pitch.setProfile(p)
            onClose()
          }}
        >
          <div className="fields">
            <label className="field">
              <span>Artist name</span>
              <input value={p.artist} onChange={(e) => set('artist', e.target.value)} placeholder="Your artist name" />
            </label>
            <label className="field">
              <span>Based in</span>
              <input value={p.city} onChange={(e) => set('city', e.target.value)} placeholder="Miami" />
            </label>
            <label className="field span-2">
              <span>Short bio (1–2 lines)</span>
              <textarea
                rows={2}
                value={p.bio}
                onChange={(e) => set('bio', e.target.value)}
                placeholder="Tech & Latin house producer. Support from …, played at …"
              />
            </label>
            <label className="field span-2">
              <span>Links</span>
              <textarea
                rows={3}
                value={p.links}
                onChange={(e) => set('links', e.target.value)}
                placeholder={'Instagram: instagram.com/you\nSoundCloud: soundcloud.com/you\nSpotify: …'}
              />
            </label>
            <label className="field">
              <span>Sign-off</span>
              <textarea rows={2} value={p.signature} onChange={(e) => set('signature', e.target.value)} placeholder={'Best,\nYour Name'} />
            </label>
            <label className="field">
              <span>Gmail account (optional)</span>
              <input
                type="email"
                value={p.gmailAccount}
                onChange={(e) => set('gmailAccount', e.target.value)}
                placeholder="Only needed if you use several Gmail accounts"
              />
            </label>
          </div>

          <div className="preview">
            <span className="eyebrow">Preview · {sample.name}</span>
            <p className="preview-subject">{subjectFor(demo, p)}</p>
            <pre>{bodyFor(sample, demo, p, link)}</pre>
          </div>

          <footer className="modal-foot">
            <span className="muted small">Saved on this device only.</span>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn gold">Save profile</button>
          </footer>
        </form>
      </div>
    </div>
  )
}
