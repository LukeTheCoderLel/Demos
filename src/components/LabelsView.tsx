import { useMemo, useState } from 'react'
import { EXCLUDED, GENRES, LABELS, METHOD_LABEL, type Genre, type Label, type Method } from '../data/labels'
import { bodyFor, gmailUrl, pitch, sentTo, subjectFor, usePitch } from '../lib/pitch'
import type { Demo } from '../types'
import { Cover } from './Cover'
import { CheckIcon, CopyIcon, ExternalIcon, MailIcon, PinIcon } from './Icons'
import { PitchProfileModal } from './PitchProfileModal'

interface Props {
  demos: Demo[]
  covers: Record<string, string>
  demoId: string | null
  onDemoChange: (id: string | null) => void
  query: string
  onSent: (demo: Demo) => void
}

type Scope = 'all' | 'miami' | Genre

const TIER_ORDER = { Icon: 0, Elite: 1, Rising: 2 }

export function LabelsView({ demos, covers, demoId, onDemoChange, query, onSent }: Props) {
  const { profile, shareLinks, log } = usePitch()
  const [scope, setScope] = useState<Scope>('all')
  const [method, setMethod] = useState<Method | 'all'>('all')
  const [hideSent, setHideSent] = useState(false)
  const [editProfile, setEditProfile] = useState(false)

  const demo = demos.find((d) => d.id === demoId)
  const link = demo ? shareLinks[demo.id] ?? '' : ''

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LABELS.filter((l) => {
      if (scope === 'miami' && !l.miami) return false
      if (scope !== 'all' && scope !== 'miami' && !l.genres.includes(scope)) return false
      if (method !== 'all' && l.method !== method) return false
      if (hideSent && demo && sentTo(log, l.id, demo.id)) return false
      if (q) {
        const hay = [l.name, l.city, l.by, l.note, ...l.genres, l.miami ? 'miami' : ''].join(' ').toLowerCase()
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false
      }
      return true
    }).sort((a, b) => Number(!!b.miami) - Number(!!a.miami) || TIER_ORDER[a.tier] - TIER_ORDER[b.tier])
  }, [query, scope, method, hideSent, demo, log])

  const sentCount = demo ? LABELS.filter((l) => sentTo(log, l.id, demo.id)).length : 0
  const totalSent = Object.values(log).reduce((n, l) => n + l.length, 0)
  const counts = {
    miami: LABELS.filter((l) => l.miami).length,
    latin: LABELS.filter((l) => l.genres.includes('Latin House')).length,
  }

  function markSent(l: Label, via: 'gmail' | 'trackstack' | 'portal') {
    if (!demo) return
    pitch.record(l.id, { demoId: demo.id, demoTitle: demo.title, at: new Date().toISOString(), via })
    onSent(demo)
  }

  return (
    <>
      <section className="lux-hero">
        <p className="eyebrow">Members only · Private A&amp;R access</p>
        <h1 className="lux-title">The Label Room</h1>
        <p className="lux-sub">
          {LABELS.length} hand-picked tech, deep, Latin and minimal house labels. Every one takes demos through
          Trackstack, its own demo page or a direct A&amp;R inbox. No LabelRadar.
        </p>
        <div className="lux-stats">
          <div><strong>{LABELS.length}</strong><span>Labels</span></div>
          <div><strong>{counts.miami}</strong><span>Miami</span></div>
          <div><strong>{counts.latin}</strong><span>Latin house</span></div>
          <div><strong>{totalSent}</strong><span>Sent</span></div>
        </div>
      </section>

      <section className="pitch-bar">
        <div className="pitch-demo">
          <div className="pitch-cover">
            {demo ? <Cover demo={demo} url={covers[demo.id]} /> : <span className="pitch-cover-empty">♪</span>}
          </div>
          <label className="field">
            <span>Now pitching</span>
            <select value={demoId ?? ''} onChange={(e) => onDemoChange(e.target.value || null)}>
              <option value="">{demos.length ? 'Choose a demo from your vault…' : 'Upload a demo to your vault first'}</option>
              {demos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}{d.genre ? ` · ${d.genre}` : ''}{d.bpm ? ` · ${d.bpm} BPM` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field pitch-link">
          <span>Private link for this demo</span>
          <input
            type="url"
            placeholder="https://soundcloud.com/you/track/s-xxxx (private)"
            value={link}
            disabled={!demo}
            onChange={(e) => demo && pitch.setShareLink(demo.id, e.target.value)}
          />
        </label>
        <div className="pitch-side">
          {demo && <span className="sent-meter"><b>{sentCount}</b>/{LABELS.length} sent</span>}
          <button className="btn ghost" onClick={() => setEditProfile(true)}>
            {profile.artist ? 'Pitch profile' : 'Set up pitch profile'}
          </button>
        </div>
        <p className="pitch-hint">
          WAVs are too large to attach, so every Gmail draft includes your private stream or download link instead.
          Trackstack and demo pages let you upload the full file.
        </p>
      </section>

      <nav className="chips" aria-label="Filter labels">
        <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>All</button>
        <button className={scope === 'miami' ? 'active' : ''} onClick={() => setScope(scope === 'miami' ? 'all' : 'miami')}>
          <PinIcon width={14} height={14} /> Miami
        </button>
        {GENRES.map((g) => (
          <button key={g} className={scope === g ? 'active' : ''} onClick={() => setScope(scope === g ? 'all' : g)}>
            {g}
          </button>
        ))}
      </nav>

      <div className="label-tools">
        <div className="segmented">
          {(['all', 'trackstack', 'portal', 'email'] as const).map((m) => (
            <button key={m} className={method === m ? 'active' : ''} onClick={() => setMethod(m)}>
              {m === 'all' ? 'Every route' : METHOD_LABEL[m]}
            </button>
          ))}
        </div>
        {demo && (
          <label className="toggle">
            <input type="checkbox" checked={hideSent} onChange={(e) => setHideSent(e.target.checked)} />
            <span>Hide labels already sent this demo</span>
          </label>
        )}
        <span className="muted small">{visible.length} shown</span>
      </div>

      {visible.length === 0 ? (
        <div className="empty static"><strong>No labels match</strong></div>
      ) : (
        <div className="label-grid">
          {visible.map((l) => (
            <LabelCard
              key={l.id}
              label={l}
              demo={demo}
              sent={demo ? sentTo(log, l.id, demo.id) : undefined}
              gmail={
                l.email
                  ? gmailUrl(l.email, subjectFor(demo, profile), bodyFor(l, demo, profile, link), profile.gmailAccount)
                  : ''
              }
              onSent={(via) => markSent(l, via)}
              onUndo={() => demo && pitch.undo(l.id, demo.id)}
            />
          ))}
        </div>
      )}

      <section className="excluded">
        <h3>Left out on purpose</h3>
        <p className="muted small">These labels only take demos through LabelRadar, where big WAV files go over the upload limit.</p>
        <ul>
          {EXCLUDED.map((x) => (
            <li key={x.name}><strong>{x.name}</strong><span>{x.reason}</span></li>
          ))}
        </ul>
        <p className="muted small">
          Demo routes were checked in November 2026 against label sites, label bios and demo directories. Labels change
          their policies, so give each one a quick look before you send.
        </p>
      </section>

      {editProfile && <PitchProfileModal demo={demo} link={link} onClose={() => setEditProfile(false)} />}
    </>
  )
}

interface CardProps {
  label: Label
  demo?: Demo
  sent?: { at: string }
  gmail: string
  onSent: (via: 'gmail' | 'trackstack' | 'portal') => void
  onUndo: () => void
}

function LabelCard({ label: l, demo, sent, gmail, onSent, onUndo }: CardProps) {
  const [opened, setOpened] = useState(false)
  const [copied, setCopied] = useState(false)
  const initials = l.name.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const primaryHref = l.method === 'email' ? gmail : l.url!
  const primaryText = l.method === 'email' ? 'Compose in Gmail' : l.method === 'trackstack' ? 'Submit on Trackstack' : 'Open demo page'
  const via = l.method === 'email' ? 'gmail' : l.method

  async function copyEmail() {
    if (!l.email) return
    try {
      await navigator.clipboard.writeText(l.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked */ }
  }

  return (
    <article className={`label-card tier-${l.tier.toLowerCase()} ${sent ? 'is-sent' : ''}`}>
      <header>
        <span className="monogram">{initials}</span>
        <div className="label-id">
          <h3>{l.name}</h3>
          <p>{l.city}{l.by ? ` · ${l.by}` : ''}</p>
        </div>
        <span className={`tier tier-${l.tier.toLowerCase()}`}>{l.tier}</span>
      </header>

      <div className="label-tags">
        {l.miami && <span className="tag miami"><PinIcon width={11} height={11} /> Miami</span>}
        {l.genres.map((g) => <span key={g} className="tag">{g}</span>)}
      </div>

      <p className="label-note">{l.note}</p>

      <div className="route">
        <span className={`route-badge m-${l.method}`}>{METHOD_LABEL[l.method]}</span>
        <span className="route-target">{l.method === 'email' ? l.email : l.url!.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
        {l.email && (
          <button className="icon-btn sm" onClick={copyEmail} title={`Copy ${l.email}`} aria-label="Copy email">
            {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
          </button>
        )}
      </div>

      <footer>
        <a
          className="btn gold"
          href={primaryHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpened(true)}
        >
          {l.method === 'email' ? <MailIcon width={16} height={16} /> : <ExternalIcon width={16} height={16} />}
          {primaryText}
        </a>
        {sent ? (
          <button className="sent-chip" onClick={onUndo} title="Undo">
            <CheckIcon width={14} height={14} /> Sent {new Date(sent.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </button>
        ) : (
          <button
            className={`btn ghost mark ${opened ? 'nudge' : ''}`}
            disabled={!demo}
            title={demo ? 'Log this submission' : 'Choose a demo above to track submissions'}
            onClick={() => onSent(via)}
          >
            Mark sent
          </button>
        )}
      </footer>
    </article>
  )
}
