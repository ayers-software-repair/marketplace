// Copyright Ayers Electronics Inc. All rights reserved.

// A table as placed pictures. One scene is what the pane draws, what the mouse hits and what the height
// budget counts, so the three cannot disagree.

import type { Row, Tone } from './layout'

// One placed thing: a card, a pile, a label, a chip stack or a drop zone (a zone has no rows).
export type Sprite = {
  // What a press on it means to the game; '' for decoration.
  id: string
  x: number
  y: number
  w: number
  h: number
  rows?: Row[]
  // Pressable now: it lights under the pointer.
  hot?: boolean
  // The pile it belongs to, for drops, and whether it is that pile's top (lit while a drag hovers the pile).
  pile?: string
  top?: boolean
  // Drawn with the legal-target look: its outline bright.
  target?: boolean
  // Dragging it lifts the sprites in `hide` (itself and the run on it) off the table, and it may land on the
  // piles in `to`.
  drag?: { hide: string[]; to: string[] }
}

export type Scene = { w: number; h: number; sprites: Sprite[] }

export type Point = { act: 'click' | 'double' | 'drop'; id: string; to?: string }

// A picture placed at x, y, as wide as its widest row.
// Fields left undefined are dropped: a scene crosses to the mouse module as plain data.
export function put(id: string, x: number, y: number, rows: Row[], extra: Partial<Sprite> = {}): Sprite {
  const set = Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined))

  return { id, x, y, w: Math.max(0, ...rows.map(r => r.text.length)), h: rows.length, rows, ...set }
}

// One line of text on the table.
export function text(x: number, y: number, s: string, tone: Tone = 'felt', id = '', extra: Partial<Sprite> = {}): Sprite {
  return put(id, x, y, [{ text: s, tone }], extra)
}

// A box of `w` by `h` with a centred label: the large pressable target for an action.
export function key(id: string, x: number, y: number, w: number, h: number, label: string, isHot: boolean): Sprite {
  const inner = Math.max(0, w - 2)
  const mid = Math.floor((h - 1) / 2)
  const rows: Row[] = Array.from({ length: h }, (_, i) => {
    if (h >= 3 && i === 0) return { text: '╭' + '─'.repeat(inner) + '╮', tone: 'key' }
    if (h >= 3 && i === h - 1) return { text: '╰' + '─'.repeat(inner) + '╯', tone: 'key' }
    const body = i === mid ? label : ''
    const left = Math.floor((inner - body.length) / 2)
    const fill = ' '.repeat(Math.max(0, left)) + body + ' '.repeat(Math.max(0, inner - left - body.length))

    return { text: (h >= 3 ? '│' : ' ') + fill.slice(0, inner) + (h >= 3 ? '│' : ' '), tone: isHot ? 'key' : 'dim' }
  })

  return put(id, x, y, rows, { hot: isHot })
}

// The sprite a press or a drop names.
export const byId = (scene: Scene, id: string) => scene.sprites.find(s => s.id === id)

// Every sprite moved by dx, dy: a block laid out on its own and set into a larger table.
export const shift = (sprites: Sprite[], dx: number, dy: number): Sprite[] => sprites.map(s => ({ ...s, x: s.x + dx, y: s.y + dy }))
