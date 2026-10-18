// Copyright Ayers Electronics Inc. All rights reserved.

// Baccarat on a punto banco layout: the Player's and the Banker's hands with their totals, the three betting
// spots (Player 1:1, Banker 1:1 with a win on 6 paying half, Tie 8:1) with your bet on the one you back, and your
// chips racked at the side. The hand is dealt whole; the third-card rules play themselves.

import type { BacBet, Baccarat, Table } from '../types'
import * as bac from './baccarat'
import { betControls, betPoint, betSprites, refillControls, settleBet, side, stakeOf } from './betting'
import { cardHeight, slotRows } from './layout'
import { handSprites } from './piles'
import type { Point, Scene, Sprite } from './scene'
import { key, put, text } from './scene'
import type { Control, Rnd, Room, Screen } from './screen'
import { keySprites, runKey, toMenu } from './screen'

const SPOTS: { on: BacBet; label: string; pays: string; hotkey: string }[] = [
  { on: 'player', label: 'PLAYER', pays: 'pays 1:1', hotkey: 'p' },
  { on: 'banker', label: 'BANKER', pays: '6 pays 1:2', hotkey: 'b' },
  { on: 'tie', label: 'TIE', pays: 'pays 8:1', hotkey: 't' },
]

const onOf = (t: Table): BacBet => t.bac?.on ?? 'player'

function back(t: Table, on: BacBet): Table {
  const b: Baccarat = t.bac ?? { player: [], banker: [], on, stake: 0, isOver: true }

  return { ...t, bac: { ...b, on }, msg: 'Backing the ' + on + '.' }
}

function deal(t: Table, rnd: Rnd): Table {
  const r = bac.deal(t.chips, onOf(t), stakeOf(t), rnd)

  return r.s ? settleBet({ ...t, bac: r.s, chips: r.chips, msg: r.msg }) : { ...t, msg: r.msg }
}

function actions(t: Table): Control[] {
  return t.chips >= 1 ? [{ key: 'deal', label: t.bac?.player.length ? 'Deal Again' : 'Deal', hotkey: 'n', primary: true, run: deal }] : []
}

function controls(t: Table): Control[] {
  const spots = SPOTS.map((s): Control => ({ key: 'on-' + s.on, label: s.label[0] + s.label.slice(1).toLowerCase(), hotkey: s.hotkey, run: x => back(x, s.on) }))

  return [...spots, ...actions(t), ...betControls(t), ...refillControls(t), toMenu]
}

function scene(t: Table, room: Room): Scene {
  const b = t.bac
  const stake = stakeOf(t)
  const rack = side(t.chips - stake, room.cols, room.rows, true)
  const rows = room.rows - rack.bottom
  const isCompact = rows < cardHeight(false) + 1 + 3 + 1 + (room.mouse ? 1 : 0) || rack.left < 2 * (3 * 8) + 2
  const half = Math.floor(rack.left / 2)
  const out: Sprite[] = [...rack.sprites]
  const hands: [string, Baccarat['player'], number][] = [
    ['PLAYER', b?.player ?? [], 0],
    ['BANKER', b?.banker ?? [], half],
  ]
  const won = b && b.player.length ? (bac.total(b.player) > bac.total(b.banker) ? 'PLAYER' : bac.total(b.banker) > bac.total(b.player) ? 'BANKER' : 'TIE') : ''
  for (const [name, cards, x] of hands) {
    out.push(text(x, 0, name + (cards.length ? '  ' + bac.total(cards) : ''), won === name || won === 'TIE' ? 'win' : 'gold'))
    out.push(...(cards.length ? handSprites(cards, x, 1, half - 2, isCompact, { pattern: t.opts.back }) : [put('', x, 1, slotRows(isCompact))]))
  }
  const sy = 1 + cardHeight(isCompact) + 1
  const sw = Math.max(10, Math.floor((rack.left - 2 - 8) / 3))
  SPOTS.forEach((s, i) => {
    const isOn = onOf(t) === s.on
    out.push(key('on:' + s.on, i * (sw + 1), sy, sw, 3, (isOn ? '> ' : '') + s.label, true))
    out.push(text(i * (sw + 1), sy + 3, s.pays.slice(0, sw), isOn ? 'gold' : 'dim'))
  })
  out.push(...betSprites(stake, 3 * (sw + 1), sy, 3, true))
  if (room.mouse) out.push(...keySprites(actions(t), 0, rows - 1, rack.left, 1))

  return { w: room.cols, h: room.rows, sprites: out }
}

function point(t: Table, p: Point, rnd: Rnd): Table {
  if (p.id.startsWith('key:')) return runKey(actions(t), p.id, t, rnd)
  const spot = SPOTS.find(s => 'on:' + s.on === p.id)
  if (spot) return back(t, spot.on)

  return p.act === 'drop' ? t : betPoint(t, p.id)
}

export const baccarat: Screen = { scene, point, controls }
