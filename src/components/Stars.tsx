import { StarIcon } from './Icons'

export function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="stars" role={onChange ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= value ? 'on' : ''}
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onChange?.(n === value ? 0 : n)
          }}
        >
          <StarIcon filled={n <= value} width={size} height={size} />
        </button>
      ))}
    </div>
  )
}
