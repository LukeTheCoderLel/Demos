export const STATUSES = ['WIP', 'Ready', 'Sent', 'Signed'] as const
export type Status = (typeof STATUSES)[number]

export interface Demo {
  id: string
  title: string
  artist: string
  collabs: string[]
  bpm: number | null
  key: string | null
  genre: string | null
  tags: string[]
  notes: string
  status: Status
  rating: number
  favorite: boolean
  duration: number
  peaks: number[]
  audio_path: string
  audio_name: string
  audio_format: string
  audio_size: number
  cover_path: string | null
  created_at: string
  updated_at: string
}

/** Fields the user can edit after a demo exists. */
export type DemoPatch = Partial<
  Pick<
    Demo,
    | 'title'
    | 'artist'
    | 'collabs'
    | 'bpm'
    | 'key'
    | 'genre'
    | 'tags'
    | 'notes'
    | 'status'
    | 'rating'
    | 'favorite'
  >
>

export type NewDemo = Omit<
  Demo,
  'id' | 'audio_path' | 'cover_path' | 'created_at' | 'updated_at'
>
