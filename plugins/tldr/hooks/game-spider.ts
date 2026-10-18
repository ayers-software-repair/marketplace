// Copyright Ayers Electronics Inc. All rights reserved.

// Spider: ten columns fanned across the table, the runs completed and the deals left in the stock along the top.
// Move a run of one suit (a click, a drag or its button); a full King-to-Ace run leaves the table by itself.

import type { Spider, Table } from '../types'
import { label } from './deck'
import { cardWidth, fitFan } from './layout'
import { columnSprites, partOf, pileSprite, sizeFor } from './piles'
import type { Point, Scene, Sprite } from './scene'
import { text } from './scene'
import type { Control, Rnd, Room, Screen } from './screen'
import { toMenu } from './screen'
import * as sp from './spider'

const WON = 'You win. All eight runs are home.'

const piles = (s: Spider, col: number, start: number) => sp.targets(s, col, start).map(j => 'c' + j)
const canDeal = (s: Spider) => s.stock.length > 0 && s.cols.every(c => c.up.length > 0)

function apply(t: Table, next: Spider, msg = ''): Table {
  return next === t.sp ? t : { ...t, sp: next, msg: sp.isWon(next) ? WON : msg }
}

function deepest(s: Spider, col: number): number {
  const up = s.cols[col]!.up
  for (let start = 0; start < up.length; start++) if (sp.targets(s, col, start).length > 0) return start

  return -1
}

function scene(t: Table, room: Room): Scene {
  const s = t.sp!
  const l = s.lift
  const lifted = l ? piles(s, l.col, l.start) : []
  const top = 1
  const isCompact = sizeFor(s.cols.map(c => ({ down: c.down.length, up: c.up.length })), room.rows - top, room.cols >= 10 * 8 - 1)
  const w = cardWidth(isCompact)
  const step = w + 1
  const x0 = Math.max(0, Math.floor((room.cols - (10 * step - 1)) / 2))
  const deals = s.stock.length / 10
  const out: Sprite[] = [text(x0, 0, 'DONE ' + s.done + '/8   ' + (s.suits === 1 ? 'ONE SUIT' : 'TWO SUITS'), 'gold')]
  const stockLabel = deals > 0 ? 'DEAL (' + deals + ' LEFT)' : 'STOCK EMPTY'
  out.push(pileSprite('stock', x0 + 10 * step - 1 - stockLabel.length - 2, 0, [{ text: ' ' + stockLabel + ' ', tone: canDeal(s) ? 'key' : 'dim' }], { hot: canDeal(s) }))
  s.cols.forEach((col, j) => {
    const own = l && l.col === j ? l.start : -1
    out.push(
      ...columnSprites({
        pile: 'c' + j,
        x: x0 + j * step,
        y: top,
        zone: room.rows - top,
        down: col.down,
        up: col.up,
        isCompact,
        fan: fitFan(col.down.length, col.up.length, isCompact, room.rows - top),
        pattern: t.opts.back,
        liftedFrom: own,
        canTake: k => (own >= 0 && k >= own) || sp.targets(s, j, k).length > 0,
        dragTo: k => {
          const to = piles(s, j, k)

          return to.length > 0 ? to : undefined
        },
        isTarget: lifted.includes('c' + j),
      }),
    )
  })
  if (sp.isWon(s)) out.push(text(Math.max(0, Math.floor((room.cols - WON.length - 2) / 2)), top + 1, ' ' + WON + ' ', 'win'))

  return { w: room.cols, h: room.rows, sprites: out }
}

function point(t: Table, p: Point): Table {
  const s = t.sp!
  const l = s.lift
  if (p.id === 'stock') return apply(t, sp.deal(s), 'Dealt a row.')
  const { pile, index } = partOf(p.id)
  if (!pile.startsWith('c')) return t
  const col = Number(pile.slice(1))
  if (p.act === 'drop') {
    const to = partOf(p.to ?? '').pile

    return index >= 0 && to.startsWith('c') ? apply(t, sp.move(s, col, index, Number(to.slice(1))), 'Moved.') : t
  }
  if (l && l.col !== col && piles(s, l.col, l.start).includes(pile)) return apply(t, sp.move(s, l.col, l.start, col), 'Moved.')
  if (l && l.col === col && (index < 0 || index >= l.start)) return apply(t, sp.cancel(s), 'Put back.')
  if (index >= 0 && sp.targets(s, col, index).length > 0) return apply(t, sp.lift(s, col, index), 'Click where it goes.')

  return l ? apply(t, sp.cancel(s), 'Put back.') : t
}

const deal = (suits: 1 | 2) => (t: Table, rnd: Rnd): Table => ({ ...t, sp: sp.newGame(rnd, suits), msg: 'New game, ' + (suits === 1 ? 'one suit.' : 'two suits.') })

function controls(t: Table): Control[] {
  const s = t.sp!
  const l = s.lift
  const won = sp.isWon(s)
  const run = (f: (s: Spider) => Spider, msg = ''): Control['run'] => x => apply(x, f(x.sp!), msg)
  const out: Control[] = []
  if (canDeal(s)) out.push({ key: 'deal', label: 'Deal', hotkey: 'd', run: run(sp.deal, 'Dealt a row.') })
  const targets = l ? sp.targets(s, l.col, l.start) : []
  s.cols.forEach((col, j) => {
    const hotkey = String((j + 1) % 10)
    const d = deepest(s, j)
    const onto = col.up[col.up.length - 1]
    if (l?.col === j) out.push({ key: 'col' + j, label: 'Back', hotkey, run: run(sp.cancel, 'Put back.') })
    else if (l && targets.includes(j)) out.push({ key: 'col' + j, label: 'Onto ' + (onto ? label(onto) : 'empty'), hotkey, run: run(x => sp.move(x, l.col, l.start, j), 'Moved.') })
    else if (!l && d >= 0) out.push({ key: 'col' + j, label: 'Take ' + label(col.up[d]!), hotkey, run: run(x => sp.lift(x, j, d), 'Press where it goes.') })
  })
  const other: 1 | 2 = s.suits === 1 ? 2 : 1
  out.push(
    { key: 'new', label: won ? 'Deal Again' : 'New Deal', hotkey: 'n', primary: won, run: deal(s.suits) },
    { key: 'suits', label: other === 1 ? 'One suit' : 'Two suits', hotkey: 's', run: deal(other) },
    toMenu,
  )

  return out
}

export const spider: Screen = { scene, point, controls }
