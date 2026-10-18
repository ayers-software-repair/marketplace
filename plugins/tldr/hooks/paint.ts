// Copyright Ayers Electronics Inc. All rights reserved.

// A scene painted into rows of cells, each run of cells with one look merged into a segment. The painter is the
// one drawing of a table: the mouse module draws it with hover and drag, every other surface draws it still.

import type { Tone } from './layout'
import type { Scene } from './scene'

// `hover`: the sprite lit under the pointer (when it is pressable). `drag`: the sprite being dragged and its new
// top-left, the run it lifted drawn there, lit; `over`: the pile the drag is over, whose top lights when the drag
// may land there.
export type View = { hover?: string; drag?: { id: string; x: number; y: number }; over?: string }

// `lit`: under the pointer. `edge`: an outline cell of a legal target.
export type Seg = { text: string; tone: Tone; fx?: 'lit' | 'edge' }

const EDGES = new Set('┌┐└┘─│╌╎╭╮╰╯')
const LIFTED: Partial<Record<Tone, Tone>> = { red: 'redLit', black: 'blackLit' }

type Cell = { ch: string; tone: Tone; fx?: Seg['fx'] }

export function paint(scene: Scene, view: View = {}): Seg[][] {
  const grid: Cell[][] = Array.from({ length: scene.h }, () => Array.from({ length: scene.w }, () => ({ ch: ' ', tone: 'felt' as Tone })))
  const dragged = view.drag ? scene.sprites.find(s => s.id === view.drag!.id) : undefined
  const hidden = new Set(dragged?.drag?.hide ?? [])
  const lay = (rows: { text: string; tone: Tone }[], x: number, y: number, fx: (ch: string) => Seg['fx']) =>
    rows.forEach((r, i) => {
      const line = grid[y + i]
      if (!line) return
      ;[...r.text].forEach((ch, j) => {
        if (x + j >= 0 && x + j < scene.w) line[x + j] = { ch, tone: r.tone, fx: fx(ch) }
      })
    })

  for (const s of scene.sprites) {
    if (!s.rows || hidden.has(s.id)) continue
    const isLit = (s.hot && view.hover === s.id) || (view.over !== undefined && s.pile === view.over && s.top && !!dragged?.drag?.to.includes(view.over))
    lay(s.rows, s.x, s.y, ch => (isLit ? 'lit' : s.target && EDGES.has(ch) ? 'edge' : undefined))
  }
  if (dragged?.drag && view.drag) {
    const dx = view.drag.x - dragged.x
    const dy = view.drag.y - dragged.y
    for (const s of scene.sprites) {
      if (s.rows && hidden.has(s.id)) lay(s.rows.map(r => ({ text: r.text, tone: LIFTED[r.tone] ?? r.tone })), s.x + dx, s.y + dy, () => undefined)
    }
  }

  return grid.map(line => {
    const segs: Seg[] = []
    for (const c of line) {
      const last = segs[segs.length - 1]
      if (last && last.tone === c.tone && last.fx === c.fx) last.text += c.ch
      else segs.push(c.fx ? { text: c.ch, tone: c.tone, fx: c.fx } : { text: c.ch, tone: c.tone })
    }

    return segs
  })
}

// The painted rows as plain text: what a test or a report reads.
export const plain = (rows: Seg[][]) => rows.map(r => r.map(s => s.text).join(''))
