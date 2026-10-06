import { ALL_KEYS, camelot } from '../lib/keys'
import { STATUSES, type DemoPatch } from '../types'
import { ChipInput } from './ChipInput'
import { Stars } from './Stars'

export type FieldValues = Required<Omit<DemoPatch, 'favorite'>>

interface Props {
  value: FieldValues
  onChange: (v: FieldValues) => void
  genres: string[]
  tags: string[]
  detected?: { bpm?: boolean; key?: boolean }
}

export function DemoFields({ value, onChange, genres, tags, detected }: Props) {
  const set = <K extends keyof FieldValues>(k: K, v: FieldValues[K]) => onChange({ ...value, [k]: v })

  return (
    <div className="fields">
      <label className="field span-2">
        <span>Title</span>
        <input value={value.title} onChange={(e) => set('title', e.target.value)} placeholder="Track title" required />
      </label>

      <label className="field">
        <span>Artist</span>
        <input value={value.artist} onChange={(e) => set('artist', e.target.value)} placeholder="Your artist name" />
      </label>

      <div className="field">
        <span>Collabs / feat.</span>
        <ChipInput value={value.collabs} onChange={(v) => set('collabs', v)} placeholder="Add artist, press Enter" />
      </div>

      <label className="field">
        <span>
          BPM {detected?.bpm && <em className="hint">auto-detected</em>}
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={40}
          max={250}
          value={value.bpm ?? ''}
          onChange={(e) => set('bpm', e.target.value ? Number(e.target.value) : null)}
          placeholder="128"
        />
      </label>

      <label className="field">
        <span>
          Key {detected?.key && <em className="hint">auto-detected</em>}
        </span>
        <select value={value.key ?? ''} onChange={(e) => set('key', e.target.value || null)}>
          <option value="">—</option>
          {ALL_KEYS.map((k) => (
            <option key={k} value={k}>
              {k} · {camelot(k)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Genre</span>
        <input
          value={value.genre ?? ''}
          list="genre-list"
          onChange={(e) => set('genre', e.target.value || null)}
          placeholder="Tech House"
        />
        <datalist id="genre-list">
          {genres.map((g) => <option key={g} value={g} />)}
        </datalist>
      </label>

      <div className="field">
        <span>Rating</span>
        <Stars value={value.rating} onChange={(v) => set('rating', v)} size={22} />
      </div>

      <div className="field span-2">
        <span>Status</span>
        <div className="segmented">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`status-${s.toLowerCase()} ${value.status === s ? 'active' : ''}`}
              onClick={() => set('status', s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="field span-2">
        <span>Tags</span>
        <ChipInput
          value={value.tags}
          onChange={(v) => set('tags', v)}
          placeholder="vocal, peaktime, label-ready…"
          prefix="#"
          suggestions={tags}
          listId="tag-list"
        />
      </div>

      <label className="field span-2">
        <span>Notes</span>
        <textarea
          rows={3}
          value={value.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Mix notes, ideas, feedback, which labels it fits…"
        />
      </label>
    </div>
  )
}
