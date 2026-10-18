// Copyright Ayers Electronics Inc. All rights reserved.

// Klondike laid out as Windows Solitaire lays it: stock and waste top left, the four foundations top right, the
// seven columns fanned below. Take a card (a click, a drag or its button), then drop it where it may go.

import type { Dest, Solitaire, Source, Table } from '../types'
import { SUITS, label } from './deck'
import { backRows, cardHeight, cardRows, cardWidth, fitFan, slotRows } from './layout'
import { columnSprites, partOf, pileSprite, sizeFor } from './piles'
import type { Point, Scene, Sprite } from './scene'
import { text } from './scene'
import type { Control, Room, Screen } from './screen'
import { toMenu } from './screen'
import * as sol from './solitaire'

const MARKS = ['♠', '♥', '♦', '♣']
const WON = 'You win. Every card is up.'

const pileOf = (s: Solitaire, src: Source, d: Dest): string => {
  if (d !== 'f') return 'c' + d
  const cards = src === 'w' ? s.waste.slice(-1) : s.cols[src]!.up

  return 'f' + SUITS.indexOf(cards[cards.length - 1]!.s)
}
const destOf = (pile: string): Dest | null => (pile.startsWith('f') ? 'f' : pile.startsWith('c') ? Number(pile.slice(1)) : null)
const srcOf = (id: string): { src: Source; start: number } | null => {
  if (id === 'waste') return { src: 'w', start: 0 }
  const { pile, index } = partOf(id)

  return pile.startsWith('c') && index >= 0 ? { src: Number(pile.slice(1)), start: index } : null
}

function deal(t: Table, rnd: () => number): Table {
  return { ...t, sol: sol.newGame(rnd, t.opts.drawCount), msg: 'New game.' }
}

function apply(t: Table, next: Solitaire, msg = ''): Table {
  return next === t.sol ? t : { ...t, sol: next, msg: sol.isWon(next) ? WON : msg }
}

function scene(t: Table, room: Room): Scene {
  const s = t.sol!
  const l = sol.lifted(s)
  const won = sol.isWon(s)
  const counts = s.cols.map(c => ({ down: c.down.length, up: c.up.length }))
  const fullTop = cardHeight(false) + 1
  const isCompact = sizeFor(counts, room.rows - fullTop, room.cols >= 7 * 8 - 1)
  const w = cardWidth(isCompact)
  const step = w + 1
  const x0 = Math.max(0, Math.floor((room.cols - (7 * step - 1)) / 2))
  const top = cardHeight(isCompact)
  const y1 = top + 1
  const pattern = t.opts.back
  const piles = (src: Source, start: number) => {
    const d = sol.destsFrom(s, src, start)

    return d.length > 0 ? d.map(x => pileOf(s, src, x)) : undefined
  }
  const out: Sprite[] = []

  out.push(pileSprite('stock', x0, 0, s.stock.length > 0 ? backRows(isCompact, pattern) : slotRows(isCompact, '↻'), { hot: !won && s.stock.length + s.waste.length > 0 }))
  const fan = (s.drawCount ?? 1) === 3 ? s.waste.slice(-3) : s.waste.slice(-1)
  fan.slice(0, -1).forEach((c, i) => out.push(pileSprite('', x0 + step + i * 2, 0, cardRows(c, isCompact))))
  const wx = x0 + step + Math.max(0, fan.length - 1) * 2
  const wTop = s.waste[s.waste.length - 1]
  out.push(
    pileSprite('waste', wx, 0, wTop ? cardRows(wTop, isCompact, l?.src === 'w') : slotRows(isCompact), {
      hot: !!wTop && (l?.src === 'w' || sol.destsFrom(s, 'w', 0).length > 0),
      drag: wTop && piles('w', 0) ? { hide: ['waste'], to: piles('w', 0)! } : undefined,
    }),
  )
  SUITS.forEach((suit, i) => {
    const isTarget = !!l && l.dests.includes('f') && pileOf(s, l.src, 'f') === 'f' + i
    const rows = s.found[i]! > 0 ? cardRows({ r: s.found[i]!, s: suit }, isCompact) : slotRows(isCompact, MARKS[i])
    out.push(pileSprite('f' + i, x0 + (3 + i) * step, 0, rows, { hot: isTarget, target: isTarget }))
  })
  s.cols.forEach((col, i) => {
    out.push(
      ...columnSprites({
        pile: 'c' + i,
        x: x0 + i * step,
        y: y1,
        zone: room.rows - y1,
        down: col.down,
        up: col.up,
        isCompact,
        fan: fitFan(col.down.length, col.up.length, isCompact, room.rows - y1),
        pattern,
        liftedFrom: l?.src === i ? l.start : -1,
        canTake: k => (l?.src === i && k >= l.start) || sol.destsFrom(s, i, k).length > 0,
        dragTo: k => piles(i, k),
        isTarget: !!l && l.src !== i && l.dests.includes(i),
      }),
    )
  })
  if (won) out.push(text(Math.max(0, Math.floor((room.cols - WON.length - 2) / 2)), y1 + 1, ' ' + WON + ' ', 'win'))

  return { w: room.cols, h: room.rows, sprites: out }
}

function point(t: Table, p: Point): Table {
  const s = t.sol!
  const l = sol.lifted(s)
  if (p.act === 'drop') {
    const from = srcOf(p.id)
    const dest = destOf(p.to ?? '')

    return from && dest !== null ? apply(t, sol.moveFrom(s, from.src, from.start, dest), dest === 'f' ? 'Up it goes.' : 'Moved.') : t
  }
  if (p.id === 'stock') return apply(t, sol.draw(s))
  // A double-click sends the card home only when it is its pile's top card; on a card deeper in a column the
  // second click is a click, which puts the lifted run back.
  const top = srcOf(p.id)
  if (p.act === 'double' && top && (top.src === 'w' || top.start === s.cols[top.src]!.up.length - 1)) {
    const sent = sol.home(s, top.src)

    return sent !== s ? apply(t, sent, 'Up it goes.') : apply(t, sol.cancel(s))
  }
  if (p.id === 'waste') return apply(t, l?.src === 'w' ? sol.cancel(s) : sol.pick(s, 'w'), l?.src === 'w' ? 'Put back.' : 'Click where it goes.')
  const { pile, index } = partOf(p.id)
  const dest = destOf(pile)
  if (dest === null) return t
  if (l && dest !== l.src && l.dests.includes(dest) && (dest !== 'f' || pileOf(s, l.src, 'f') === pile)) {
    return apply(t, sol.moveFrom(s, l.src, l.start, dest), dest === 'f' ? 'Up it goes.' : 'Moved.')
  }
  if (dest === 'f') return t
  if (l && l.src === dest && (index < 0 || index >= l.start)) return apply(t, sol.cancel(s), 'Put back.')
  if (index >= 0 && sol.destsFrom(s, dest, index).length > 0) return apply(t, sol.pickAt(s, dest, index), 'Click where it goes.')

  return l ? apply(t, sol.cancel(s), 'Put back.') : t
}

function controls(t: Table): Control[] {
  const s = t.sol!
  const l = sol.lifted(s)
  const won = sol.isWon(s)
  const run = (f: (s: Solitaire) => Solitaire, msg = ''): Control['run'] => x => apply(x, f(x.sol!), msg)
  const out: Control[] = []
  if (!won && s.stock.length + s.waste.length > 0) out.push({ key: 'draw', label: s.stock.length > 0 ? 'Draw' : 'Redo', hotkey: 'd', run: run(sol.draw) })
  const wTop = s.waste[s.waste.length - 1]
  if (l?.src === 'w') out.push({ key: 'waste', label: 'Back', hotkey: 'w', run: run(sol.cancel, 'Put back.') })
  else if (!l && wTop && sol.moves(s, 'w')) out.push({ key: 'waste', label: 'Take ' + label(wTop), hotkey: 'w', run: run(x => sol.pick(x, 'w'), 'Press where it goes.') })
  if (l && l.dests.includes('f')) out.push({ key: 'home', label: 'Home', hotkey: 'f', run: run(x => sol.move(x, l.src, 'f'), 'Up it goes.') })
  s.cols.forEach((col, i) => {
    const hotkey = String(i + 1)
    const onto = col.up[col.up.length - 1]
    const m = sol.moves(s, i)
    if (l?.src === i) out.push({ key: 'col' + i, label: 'Back', hotkey, run: run(sol.cancel, 'Put back.') })
    else if (l && l.dests.includes(i)) out.push({ key: 'col' + i, label: 'Onto ' + (onto ? label(onto) : 'empty'), hotkey, run: run(x => sol.move(x, l.src, i), 'Moved.') })
    else if (!l && m) out.push({ key: 'col' + i, label: 'Take ' + label(col.up[m.start]!), hotkey, run: run(x => sol.pick(x, i), 'Press where it goes.') })
  })
  if (!won) out.push({ key: 'auto', label: 'Auto', hotkey: 'a', run: run(sol.auto, 'Sent what could go up.') })
  out.push({ key: 'new', label: won ? 'Deal Again' : 'New Deal', hotkey: 'n', primary: won, run: deal }, toMenu)

  return out
}

export const solitaire: Screen = { scene, point, controls }
export const dealSolitaire = deal
