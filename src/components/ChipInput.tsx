import { useState } from 'react'
import { CloseIcon } from './Icons'

interface Props {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  prefix?: string
  suggestions?: string[]
  listId?: string
}

/** Type and press Enter or comma to add a chip; Backspace on empty removes the last. */
export function ChipInput({ value, onChange, placeholder, prefix = '', suggestions, listId }: Props) {
  const [text, setText] = useState('')

  function commit(raw: string) {
    const items = raw
      .split(',')
      .map((s) => s.trim().replace(/^#/, ''))
      .filter(Boolean)
      .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    if (items.length) onChange([...value, ...items])
    setText('')
  }

  return (
    <div className="chip-input">
      {value.map((v) => (
        <span className="chip" key={v}>
          {prefix}
          {v}
          <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>
            <CloseIcon width={12} height={12} />
          </button>
        </span>
      ))}
      <input
        value={text}
        list={listId}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => {
          const t = e.target.value
          if (t.includes(',')) commit(t)
          else setText(t)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(text)
          } else if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => text && commit(text)}
      />
      {listId && suggestions && (
        <datalist id={listId}>
          {suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
    </div>
  )
}
