// Copyright Ayers Electronics Inc. All rights reserved.

// FreeCell laid out as Windows lays it: the four free cells top left, the four foundations top right, the eight
// columns below, every card face up. Take a card or a run (a click, a drag or its button) and drop it.

import type { FcFrom, FcTo, FreeCell, Table } from '../types'
import { SUITS, label } from './deck'
import * as fc from './freecell'
import { cardHeight, cardRows, cardWidth, fitFan, slotRows } from './layout'
import { columnSprites, partOf, pileSprite, sizeFor } from './piles'
import type { Point, Scene, Sprite } from './scene'
import { text } from './scene'
import type { Control, Rnd, Room, Screen } from './screen'
import { toMenu } from './screen'

const MARKS = ['♠', '♥', '♦', '♣']
const WON = 'You win. Every card is home.'
const CELL_KEYS = 'qwer'

const leadOf = (s: FreeCell, from: FcFrom) => ('cell' in from ? s.cells[from.cell] : s.cols[from.col]?.[from.start]) ?? null
const pileOf = (s: FreeCell, from: FcFrom, to: FcTo): string =>
  to === 'f' ? 'f' + SUITS.indexOf(leadOf(s, from)!.s) : 'cell' in to ? 'x' + to.cell : 'c' + to.col
const piles = (s: FreeCell, from: FcFrom) => fc.targets(s, from).map(to => pileOf(s, from, to))

function fromOf(s: FreeCell, id: string): FcFrom | null {
  const { pile, index } = partOf(id)
  if (pile.startsWith('x')) return s.cells[Number(pile.slice(1))] ? { cell: Number(pile.slice(1)) } : null

  return pile.startsWith('c') && index >= 0 ? { col: Number(pile.slice(1)), start: index } : null
}

function toOf(pile: string): FcTo | null {
  if (pile.startsWith('f')) return 'f'
  if (pile.startsWith('x')) return { cell: Number(pile.slice(1)) }

  return pile.startsWith('c') ? { col: Number(pile.slice(1)) } : null
}

const same = (a: FcFrom | null, b: FcFrom | null) => JSON.stringify(a) === JSON.stringify(b)

function apply(t: Table, next: FreeCell, msg = ''): Table {
  return next === t.fc ? t : { ...t, fc: next, msg: fc.isWon(next) ? WON : msg }
}

// The longest run of a column that can go somewhere: what its button takes.
function deepest(s: FreeCell, col: number): FcFrom | null {
  const cards = s.cols[col]!
  for (let start = 0; start < cards.length; start++) if (fc.targets(s, { col, start }).length > 0) return { col, start }

  return null
}

function scene(t: Table, room: Room): Scene {
  const s = t.fc!
  const l = s.lift
  const lifted = l ? piles(s, l) : []
  const isCompact = sizeFor(s.cols.map(c => ({ down: 0, up: c.length })), room.rows - cardHeight(false) - 1, room.cols >= 8 * 8 - 1)
  const w = cardWidth(isCompact)
  const step = w + 1
  const x0 = Math.max(0, Math.floor((room.cols - (8 * step - 1)) / 2))
  const y1 = cardHeight(isCompact) + 1
  const out: Sprite[] = []
  s.cells.forEach((c, i) => {
    const from: FcFrom = { cell: i }
    const isTarget = lifted.includes('x' + i)
    const to = c ? piles(s, from) : []
    out.push(
      pileSprite('x' + i, x0 + i * step, 0, c ? cardRows(c, isCompact, same(l, from)) : slotRows(isCompact), {
        hot: isTarget || to.length > 0 || same(l, from),
        target: isTarget,
        drag: c && to.length > 0 ? { hide: ['x' + i], to } : undefined,
      }),
    )
  })
  SUITS.forEach((suit, i) => {
    const isTarget = lifted.includes('f' + i)
    const rows = s.found[i]! > 0 ? cardRows({ r: s.found[i]!, s: suit }, isCompact) : slotRows(isCompact, MARKS[i])
    out.push(pileSprite('f' + i, x0 + (4 + i) * step, 0, rows, { hot: isTarget, target: isTarget }))
  })
  s.cols.forEach((col, j) => {
    const own = l && 'col' in l && l.col === j ? l.start : -1
    out.push(
      ...columnSprites({
        pile: 'c' + j,
        x: x0 + j * step,
        y: y1,
        zone: room.rows - y1,
        down: [],
        up: col,
        isCompact,
        fan: fitFan(0, col.length, isCompact, room.rows - y1),
        pattern: t.opts.back,
        liftedFrom: own,
        canTake: k => (own >= 0 && k >= own) || fc.targets(s, { col: j, start: k }).length > 0,
        dragTo: k => {
          const to = piles(s, { col: j, start: k })

          return to.length > 0 ? to : undefined
        },
        isTarget: lifted.includes('c' + j),
      }),
    )
  })
  if (fc.isWon(s)) out.push(text(Math.max(0, Math.floor((room.cols - WON.length - 2) / 2)), y1 + 1, ' ' + WON + ' ', 'win'))

  return { w: room.cols, h: room.rows, sprites: out }
}

function point(t: Table, p: Point): Table {
  const s = t.fc!
  const l = s.lift
  if (p.act === 'drop') {
    const from = fromOf(s, p.id)
    const to = toOf(p.to ?? '')

    return from && to ? apply(t, fc.move(s, from, to), 'Moved.') : t
  }
  // A double-click sends the card home only when it is a cell's card or its column's last; deeper in a column
  // the second click is a click, which puts the lifted run back.
  const from = fromOf(s, p.id)
  if (p.act === 'double' && from && ('cell' in from || from.start === s.cols[from.col]!.length - 1)) {
    const sent = fc.toFoundation(s, from)

    return sent !== s ? apply(t, sent, 'Up it goes.') : apply(t, fc.cancel(s))
  }
  const { pile, index } = partOf(p.id)
  const to = toOf(pile)
  if (l && to && piles(s, l).includes(pile)) return apply(t, fc.move(s, l, to), 'Moved.')
  const isOwn = l && (('cell' in l && pile === 'x' + l.cell) || ('col' in l && pile === 'c' + l.col && (index < 0 || index >= l.start)))
  if (isOwn) return apply(t, fc.cancel(s), 'Put back.')
  if (from && fc.targets(s, from).length > 0) return apply(t, fc.lift(s, from), 'Click where it goes.')

  return l ? apply(t, fc.cancel(s), 'Put back.') : t
}

function deal(t: Table, rnd: Rnd): Table {
  return { ...t, fc: fc.newGame(rnd), msg: 'New game.' }
}

function controls(t: Table): Control[] {
  const s = t.fc!
  const l = s.lift
  const won = fc.isWon(s)
  const run = (f: (s: FreeCell) => FreeCell, msg = ''): Control['run'] => x => apply(x, f(x.fc!), msg)
  const out: Control[] = []
  const targets = l ? fc.targets(s, l) : []
  s.cells.forEach((c, i) => {
    const hotkey = CELL_KEYS[i]!
    if (l && 'cell' in l && l.cell === i) out.push({ key: 'cell' + i, label: 'Back', hotkey, run: run(fc.cancel, 'Put back.') })
    else if (l && targets.some(x => x !== 'f' && 'cell' in x && x.cell === i)) out.push({ key: 'cell' + i, label: 'Cell', hotkey, run: run(x => fc.move(x, l, { cell: i }), 'Moved.') })
    else if (!l && c && fc.targets(s, { cell: i }).length > 0) out.push({ key: 'cell' + i, label: 'Take ' + label(c), hotkey, run: run(x => fc.lift(x, { cell: i }), 'Press where it goes.') })
  })
  if (l && targets.includes('f')) out.push({ key: 'home', label: 'Home', hotkey: 'f', run: run(x => fc.move(x, l, 'f'), 'Up it goes.') })
  s.cols.forEach((col, j) => {
    const hotkey = String(j + 1)
    const d = deepest(s, j)
    const onto = col[col.length - 1]
    if (l && 'col' in l && l.col === j) out.push({ key: 'col' + j, label: 'Back', hotkey, run: run(fc.cancel, 'Put back.') })
    else if (l && targets.some(x => x !== 'f' && 'col' in x && x.col === j)) out.push({ key: 'col' + j, label: 'Onto ' + (onto ? label(onto) : 'empty'), hotkey, run: run(x => fc.move(x, l, { col: j }), 'Moved.') })
    else if (!l && d && 'col' in d) out.push({ key: 'col' + j, label: 'Take ' + label(col[d.start]!), hotkey, run: run(x => fc.lift(x, d), 'Press where it goes.') })
  })
  if (!won) out.push({ key: 'auto', label: 'Auto', hotkey: 'a', run: run(fc.auto, 'Sent what could go up.') })
  out.push({ key: 'new', label: won ? 'Deal Again' : 'New Deal', hotkey: 'n', primary: won, run: deal }, toMenu)

  return out
}

export const freecell: Screen = { scene, point, controls }
