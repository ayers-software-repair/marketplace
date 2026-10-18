// Copyright Ayers Electronics Inc. All rights reserved.

// Texas Hold'em at a table of two to four: the computer players across the top with their stacks, bets and last
// actions, the board and the pot in the middle, you at the bottom with your cards and your chips racked at the
// side. Your chips are your balance; the chip stacks, "+" and "-" set how much a Raise adds.

import type { Holdem, HoldemAction, Table } from '../types'
import { betControls, betPoint, refillControls, side } from './betting'
import { money } from './chips'
import { START_CHIPS } from './deck'
import * as he from './holdem'
import { backRows, cardHeight, cardRows, cardWidth, padEnd, slotRows } from './layout'
import { handSprites } from './piles'
import type { Point, Scene, Sprite } from './scene'
import { put, text } from './scene'
import type { Control, Rnd, Room, Screen } from './screen'
import { keySprites, runKey, toMenu } from './screen'

// Your stack at the table is your balance's whole chips; a half chip waits beside it.
const sit = (h: Holdem, chips: number): Holdem => ({ ...h, seats: h.seats.map((s, i) => (i === 0 ? { ...s, chips: Math.floor(chips) } : s)) })

// The table after a step, with your balance moved by what your stack gained or lost.
const after = (t: Table, next: Holdem): Table => ({ ...t, he: next, chips: t.chips + next.seats[0]!.chips - t.he!.seats[0]!.chips, msg: next.msg })

function deal(t: Table, rnd: Rnd): Table {
  const h = sit(t.he!, t.chips)

  return after({ ...t, he: h }, he.deal(h, rnd))
}

const act = (a: HoldemAction): Control['run'] => (t, rnd) => after(t, he.act(t.he!, a, rnd))

// A raise adds the bet setting to the bet to match, at least the minimum raise and at most all in.
const raiseTo = (t: Table, l: he.Legal) => Math.min(l.maxRaiseTo, Math.max(l.minRaiseTo, t.he!.level + t.bet))

function actions(t: Table): Control[] {
  const h = t.he!
  const l = he.legal(h)
  if (l) {
    const to = raiseTo(t, l)

    return [
      { key: 'fold', label: 'Fold', hotkey: 'f', run: act({ kind: 'fold' }) },
      l.canCheck ? { key: 'check', label: 'Check', hotkey: 'c', run: act({ kind: 'check' }) } : { key: 'call', label: 'Call ' + l.toCall, hotkey: 'c', run: act({ kind: 'call' }) },
      ...(l.canRaise && to < l.maxRaiseTo ? [{ key: 'raise', label: 'Raise to ' + to, hotkey: 'r', run: (x: Table, rnd: Rnd) => act({ kind: 'raise', to: raiseTo(x, he.legal(x.he!)!) })(x, rnd) }] : []),
      ...(l.canRaise || l.maxRaiseTo <= h.level ? [{ key: 'allin', label: 'All in', hotkey: 'a', run: act({ kind: 'allin' }) }] : []),
    ]
  }

  return h.isOver && t.chips >= he.BIG_BLIND ? [{ key: 'deal', label: h.pots.length > 0 ? 'Deal Again' : 'Deal', hotkey: 'n', primary: true, run: deal }] : []
}

function controls(t: Table): Control[] {
  const h = t.he!
  const seats: Control[] = h.isOver
    ? [{ key: 'seats', label: 'Players ' + h.seats.length, hotkey: 'p', run: x => ({ ...x, he: he.newTable((((x.he!.seats.length - 1) % 3) + 1) as 1 | 2 | 3, x.chips, START_CHIPS), msg: 'New table.' }) }]
    : []

  return [...actions(t), ...seats, ...betControls(t), ...(t.he!.isOver ? refillControls(t, he.BIG_BLIND) : []), toMenu]
}

function scene(t: Table, room: Room): Scene {
  const h = t.he!
  const rack = side(t.chips, room.cols, room.rows, true)
  const rows = room.rows - rack.bottom
  const keyH = room.mouse ? 1 : 0
  const big = rows >= 5 + 1 + 6 + 1 + 6 + keyH && rack.left >= 5 * 8
  const gap = rows >= 5 + 4 + 4 + 2 + keyH ? 1 : 0
  const ch = cardHeight(!big)
  const out: Sprite[] = [...rack.sprites]
  const winners = new Set(h.pots.flatMap(p => p.winners))
  const bots = h.seats.slice(1)
  const sw = Math.max(12, Math.floor((rack.left - (bots.length - 1)) / bots.length))
  bots.forEach((s, n) => {
    const i = n + 1
    const x = n * (sw + 1)
    const tone = winners.has(i) ? 'win' : h.turn === i && !h.isOver ? 'gold' : 'felt'
    out.push(text(x, 0, padEnd((h.button === i ? 'D ' : '') + s.name + ' ' + s.chips, sw), tone))
    const shown = h.reveal.includes(i)
    const cards = s.folded || s.hole.length === 0 ? [] : s.hole
    out.push(...cards.map((c, k) => put('', x + k * 6, 1, shown ? cardRows(c, true) : backRows(true, t.opts.back))))
    out.push(text(x, 4, padEnd(s.last || (s.bet > 0 ? 'Bet ' + s.bet : ''), sw), 'dim'))
  })
  // The board and your seat sit in the middle of the table, as a real table puts them.
  const w = cardWidth(!big)
  const bx = Math.max(0, Math.floor((rack.left - (5 * (w + 1) - 1)) / 2))
  const by = 5 + gap
  out.push(text(bx, by, 'POT ' + money(h.pot + h.seats.reduce((a, s) => a + s.bet, 0)) + '   ' + h.street.toUpperCase(), 'gold'))
  ;[0, 1, 2, 3, 4].forEach(k => {
    const c = h.board[k]
    out.push(put('', bx + k * (w + 1), by + 1, c ? cardRows(c, !big) : slotRows(!big)))
  })
  const you = h.seats[0]!
  const yy = by + 1 + ch + gap
  const youTone = winners.has(0) ? 'win' : h.turn === 0 && !h.isOver ? 'gold' : 'felt'
  const line = (h.button === 0 ? 'D ' : '') + 'YOU ' + you.chips + (you.last ? '   ' + you.last : you.bet > 0 ? '   Bet ' + you.bet : '')
  out.push(text(bx, yy, padEnd(line, Math.max(0, rack.left - bx)), youTone))
  if (you.hole.length > 0 && !you.folded) out.push(...handSprites(you.hole, bx, yy + 1, 2 * (w + 1), !big, { pattern: t.opts.back }))
  if (keyH > 0) out.push(...keySprites(actions(t), 0, rows - keyH, rack.left, keyH))

  return { w: room.cols, h: room.rows, sprites: out }
}

function point(t: Table, p: Point, rnd: Rnd): Table {
  if (p.id.startsWith('key:')) return runKey(actions(t), p.id, t, rnd)

  return p.act === 'drop' ? t : betPoint(t, p.id)
}

export const holdem: Screen = { scene, point, controls }
