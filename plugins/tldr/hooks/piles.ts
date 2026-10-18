// Copyright Ayers Electronics Inc. All rights reserved.

// Piles as sprites for the solitaire tables: a fanned column, one card or slot, and how a press on a pile's part
// is read back. A column's part ids are `<pile>:<i>` for face-up card i, `<pile>:d` for its face-down cards and
// `<pile>:f` for its folded cards; the column's drop zone and empty slot are the pile id itself.

import type { Card } from '../types'
import type { Fan } from './layout'
import { backRows, cardHeight, cardRows, cardWidth, fanLayout, partRows, slotRows } from './layout'
import type { Row } from './layout'
import type { Sprite } from './scene'
import { put } from './scene'

export type ColumnSpec = {
  pile: string
  x: number
  y: number
  // Rows down to the table's bottom: the column's drop zone reaches that far.
  zone: number
  down: Card[]
  up: Card[]
  isCompact: boolean
  fan: Fan
  pattern: number
  // Face-up cards from this index are drawn lifted; -1 for none.
  liftedFrom: number
  // Whether face-up card i may be pressed (taken, or put back), and where its run may be dragged (none: undefined).
  canTake: (i: number) => boolean
  dragTo: (i: number) => string[] | undefined
  // The pile is a legal place for what is lifted: its top shows the target look and a press drops there.
  isTarget: boolean
  mark?: string
}

export function columnSprites(c: ColumnSpec): Sprite[] {
  const w = cardWidth(c.isCompact)
  const zone: Sprite = { id: c.pile, x: c.x, y: c.y, w, h: Math.max(1, c.zone), hot: c.isTarget, pile: c.pile }
  if (c.down.length + c.up.length === 0) return [zone, put(c.pile, c.x, c.y, slotRows(c.isCompact, c.mark), { pile: c.pile, top: true, hot: c.isTarget, target: c.isTarget })]
  const { parts } = fanLayout(c.down.length, c.up.length, c.isCompact, c.fan)
  const upId = (i: number) => c.pile + ':' + i
  const sprites = parts.map((p, n): Sprite => {
    const rows = partRows(p, c.up, c.isCompact, c.liftedFrom, c.pattern)
    const isTop = n === parts.length - 1
    const base = { pile: c.pile, top: isTop, target: c.isTarget && isTop }
    if (p.kind !== 'up') return put(c.pile + (p.kind === 'fold' ? ':f' : ':d'), c.x, c.y + p.y, rows, { ...base, hot: c.isTarget })
    const to = c.dragTo(p.index)
    const drag = to ? { hide: c.up.slice(p.index).map((_, k) => upId(p.index + k)), to } : undefined

    return put(upId(p.index), c.x, c.y + p.y, rows, { ...base, hot: c.isTarget || c.canTake(p.index), drag })
  })

  return [zone, ...sprites]
}

// One card or an empty slot as a pile of its own (stock, waste, a cell, a foundation).
export function pileSprite(id: string, x: number, y: number, rows: Row[], extra: Partial<Sprite> = {}): Sprite {
  return put(id, x, y, rows, { pile: id, top: true, ...extra })
}

// A face-up card's rows, or an empty slot's.
export const faceOrSlot = (c: Card | undefined | null, isCompact: boolean, isLit = false, mark = ' '): Row[] =>
  c ? cardRows(c, isCompact, isLit) : slotRows(isCompact, mark)

// The pile and the face-up index a part id names: `c3:5` is pile `c3`, card 5; `c3` and `c3:d` are the pile alone.
export function partOf(id: string): { pile: string; index: number } {
  const [pile = '', rest] = id.split(':')
  const index = rest !== undefined && /^\d+$/.test(rest) ? Number(rest) : -1

  return { pile, index }
}

// Whether a row of columns needs compact cards: when the room is too narrow for full ones, or any column would
// not fit `room` rows in full cards even fanned tight.
export function sizeFor(cols: { down: number; up: number }[], room: number, wide: boolean): boolean {
  return !wide || cols.some(c => fanLayout(c.down, c.up, false, { down: 0, up: 1, fold: 0 }).height > room) || room < cardHeight(false)
}

// A hand laid left to right from x in `avail` columns, overlapping (each card's left edge, rank and suit showing)
// when it would not fit side by side. `hidden` cards are drawn face down; `ids`, `hot` and `lit` per card.
export function handSprites(
  cards: Card[],
  x: number,
  y: number,
  avail: number,
  isCompact: boolean,
  o: { pattern: number; hidden?: number; ids?: string[]; hot?: boolean[]; lit?: boolean[] },
): Sprite[] {
  const w = cardWidth(isCompact)
  const step = cards.length < 2 ? w + 1 : Math.max(3, Math.min(w + 1, Math.floor((avail - w) / (cards.length - 1))))

  return cards.map((c, i) => {
    const rows = i === o.hidden ? backRows(isCompact, o.pattern) : cardRows(c, isCompact, !!o.lit?.[i])

    return put(o.ids?.[i] ?? '', x + i * step, y, rows, { hot: !!o.hot?.[i] })
  })
}
