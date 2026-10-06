import { camelot } from '../lib/keys'
import { player, usePlayer } from '../lib/player'
import type { Demo } from '../types'
import { Cover } from './Cover'
import { HeartIcon, PauseIcon, PlayIcon, StarIcon } from './Icons'

interface Props {
  demo: Demo
  coverUrl?: string
  queue: Demo[]
  onOpen: () => void
  onFavorite: () => void
}

export function DemoCard({ demo, coverUrl, queue, onOpen, onFavorite }: Props) {
  const { current, playing, loading } = usePlayer()
  const isCurrent = current?.id === demo.id
  const credit = [demo.artist, ...demo.collabs].filter(Boolean).join(', ')

  return (
    <article className={`card ${isCurrent ? 'current' : ''}`}>
      <div className="card-art" onClick={onOpen}>
        <Cover demo={demo} url={coverUrl} />
        <span className={`status-pill status-${demo.status.toLowerCase()}`}>{demo.status}</span>
        <button
          className={`fav-btn ${demo.favorite ? 'on' : ''}`}
          aria-label={demo.favorite ? 'Unfavorite' : 'Favorite'}
          onClick={(e) => {
            e.stopPropagation()
            onFavorite()
          }}
        >
          <HeartIcon filled={demo.favorite} width={18} height={18} />
        </button>
        <button
          className={`play-fab ${isCurrent ? 'show' : ''}`}
          aria-label={isCurrent && playing ? 'Pause' : 'Play'}
          onClick={(e) => {
            e.stopPropagation()
            if (isCurrent) player.toggle()
            else player.play(demo, queue)
          }}
        >
          {isCurrent && loading ? <span className="spinner sm" /> : isCurrent && playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        {isCurrent && playing && (
          <span className="eq" aria-hidden>
            <i /><i /><i />
          </span>
        )}
      </div>
      <div className="card-body" onClick={onOpen}>
        <h3 title={demo.title}>{demo.title}</h3>
        <p className="muted" title={credit}>{credit || ' '}</p>
        <div className="card-meta">
          {demo.bpm && <span>{demo.bpm}</span>}
          {demo.key && <span>{camelot(demo.key)}</span>}
          {demo.genre && <span className="genre">{demo.genre}</span>}
          {demo.rating > 0 && (
            <span className="rating">
              <StarIcon filled width={12} height={12} />
              {demo.rating}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
