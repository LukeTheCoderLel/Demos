import type { Demo, DemoPatch, NewDemo } from '../types'

export interface Backend {
  mode: 'local' | 'cloud'
  list(): Promise<Demo[]>
  create(
    input: NewDemo,
    audio: File,
    cover: Blob | null,
    onProgress?: (msg: string) => void,
  ): Promise<Demo>
  update(id: string, patch: DemoPatch): Promise<Demo>
  setCover(demo: Demo, cover: Blob | null): Promise<Demo>
  remove(demo: Demo): Promise<void>
  audioUrl(demo: Demo): Promise<string>
  /** Returns a map of demo id -> displayable cover URL. */
  coverUrls(demos: Demo[]): Promise<Record<string, string>>
}

export function extOf(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : 'bin'
}
