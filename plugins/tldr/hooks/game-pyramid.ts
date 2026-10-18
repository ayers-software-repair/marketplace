// Copyright Ayers Electronics Inc. All rights reserved.

// Pyramid: 28 cards in seven overlapping rows, the stock and the waste beside them. Click two free cards that add
// up to 13 (a King goes alone); the waste's top card plays too. Three passes through the stock.

import type { PyrAt, Pyramid, Table } from '../types'
import { label } from './deck'
import { backRows, cardHeight, cardRows, cardWidth, slotRows, stripRow } from './layout'
import { pileSprite } from './piles'
import type { Point, Scene, Sprite } from './scene'
import { text } from './scene'
import type { Control, Rnd, Room, Screen } from './screen'
import { toMenu } from './screen'
import * as py from './pyramid'

const WON = 'You win. The pyramid is clear.'
const { rowOf } = py

function apply(t: Table, next: Pyramid, msg = ''): Table {
  return next === t.py ? t : { ...t, py: next, msg: py.isWon(next) ? WON : msg }
}

// The overlap between rows: two rows of each card showing, or one (its top edge with rank and suit) when short.
function stepFor(rows: number, isCompact: boolean): number {
  return 6 * 2 + cardHeight(isCompact) <= rows ? 2 : 1
}

function scene(t: Table, room: Room): Scene {
  const s = t.py!
  const isCompact = room.cols < 7 * 8 + 10 || 6 * 2 + cardHeight(false) > room.rows
  const w = cardWidth(isCompact)
  const ch = cardHeight(isCompact)
  const step = stepFor(room.rows, isCompact)
  const px = w + 3
  const span = 7 * (w + 1) - 1
  const cx = px + Math.floor(span / 2)
  const out: Sprite[] = []
  out.push(pileSprite('stock', 0, 0, s.stock.length > 0 ? backRows(isCompact, t.opts.back) : slotRows(isCompact, s.pass < 3 ? '↻' : ' '), { hot: s.stock.length > 0 || (s.pass < 3 && s.waste.length > 0) }))
  out.push(text(0, ch, 'PASS ' + s.pass + '/3', 'dim'))
  const top = s.waste[s.waste.length - 1]
  out.push(pileSprite('waste', 0, ch + 2, top ? cardRows(top, isCompact, s.lift === 'w') : slotRows(isCompact), { hot: !!top }))
  s.pyr.forEach((c, i) => {
    if (!c) return
    const r = rowOf(i)
    const k = i - (r * (r + 1)) / 2
    const x = cx - Math.floor(((r + 1) * (w + 1) - 1) / 2) + k * (w + 1)
    const face = cardRows(c, isCompact, s.lift === i)
    const rows = step === 1 ? [stripRow(c, isCompact, s.lift === i), ...face.slice(1)] : face
    out.push(pileSprite('p' + i, x, r * step, rows, { hot: py.isFree(s, i) }))
  })
  if (py.isWon(s)) out.push(text(px, 1, ' ' + WON + ' ', 'win'))

  return { w: room.cols, h: room.rows, sprites: out }
}

function point(t: Table, p: Point): Table {
  const s = t.py!
  if (p.act === 'drop') return t
  if (p.id === 'stock') return apply(t, py.draw(s))
  const at: PyrAt | null = p.id === 'waste' ? 'w' : /^p\d+$/.test(p.id) ? Number(p.id.slice(1)) : null
  if (at === null) return t
  const next = py.pick(s, at)
  const removed = next.pyr.filter(c => c).length < s.pyr.filter(c => c).length || next.waste.length < s.waste.length

  return apply(t, next, removed ? 'Pair made.' : next.lift === null ? 'Put back.' : 'Pick a card that makes 13.')
}

const deal = (t: Table, rnd: Rnd): Table => ({ ...t, py: py.newGame(rnd), msg: 'New game.' })

function controls(t: Table): Control[] {
  const s = t.py!
  const won = py.isWon(s)
  const run = (f: (s: Pyramid) => Pyramid, msg = ''): Control['run'] => x => apply(x, f(x.py!), msg)
  const out: Control[] = []
  if (s.stock.length > 0 || (s.pass < 3 && s.waste.length > 0)) out.push({ key: 'draw', label: s.stock.length > 0 ? 'Draw' : 'Redo', hotkey: 'd', run: run(py.draw) })
  const top = s.waste[s.waste.length - 1]
  if (top) out.push({ key: 'waste', label: (s.lift === 'w' ? 'Back ' : 'Pick ') + label(top), hotkey: 'w', run: x => point(x, { act: 'click', id: 'waste' }) })
  s.pyr
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => py.isFree(s, i))
    .slice(0, 9)
    .forEach(({ c, i }, n) =>
      out.push({ key: 'p' + i, label: (s.lift === i ? 'Back ' : 'Pick ') + label(c!), hotkey: String(n + 1), run: x => point(x, { act: 'click', id: 'p' + i }) }),
    )
  out.push({ key: 'new', label: won ? 'Deal Again' : 'New Deal', hotkey: 'n', primary: won, run: deal }, toMenu)

  return out
}

export const pyramid: Screen = { scene, point, controls }
