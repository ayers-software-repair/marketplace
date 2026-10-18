// Copyright Ayers Electronics Inc. All rights reserved.

// Hi-Lo: the card shown large, the next one face down beside it, HIGHER and LOWER beside them, the streak, your
// bet and your chips. Each guess stakes the bet.

import type { Table } from '../types'
import { betControls, betPoint, betSprites, refillControls, settleBet, side, stakeOf } from './betting'
import * as hl from './hilo'
import { backRows, cardHeight, cardRows, cardWidth, slotRows } from './layout'
import type { Point, Scene, Sprite } from './scene'
import { put, text } from './scene'
import type { Control, Rnd, Room, Screen } from './screen'
import { keySprites, runKey, toMenu } from './screen'

const guess = (isHigher: boolean): Control['run'] => (t, rnd) => {
  const r = hl.guess(t.hl!, t.chips, isHigher, rnd, stakeOf(t))

  return settleBet({ ...t, hl: r.s, chips: r.chips, msg: r.msg })
}

function actions(t: Table): Control[] {
  if (!t.hl) return [{ key: 'deal', label: 'Deal', hotkey: 'n', primary: true, run: (x, rnd) => ({ ...x, hl: hl.start(rnd), msg: 'Higher or lower?' }) }]

  return t.chips >= 1
    ? [
        { key: 'hi', label: 'Higher', hotkey: 'h', run: guess(true) },
        { key: 'lo', label: 'Lower', hotkey: 'l', run: guess(false) },
      ]
    : []
}

const controls = (t: Table): Control[] => [...actions(t), ...betControls(t), ...refillControls(t), toMenu]

function scene(t: Table, room: Room): Scene {
  const h = t.hl
  const stake = stakeOf(t)
  const rack = side(t.chips - stake, room.cols, room.rows, true)
  const rows = room.rows - rack.bottom
  const isCompact = rows < cardHeight(false) + 2
  const w = cardWidth(isCompact)
  const ch = cardHeight(isCompact)
  const out: Sprite[] = [...rack.sprites, text(0, 0, 'STREAK ' + (h ? h.streak : 0), 'gold')]
  out.push(put('', 0, 1, h ? cardRows(h.current, isCompact) : slotRows(isCompact)))
  out.push(put('', w + 2, 1, backRows(isCompact, t.opts.back)))
  const kx = 2 * w + 5
  const kh = ch >= 5 ? 2 : 1
  if (room.mouse) actions(t).forEach((k, i) => out.push(...keySprites([k], kx, 1 + i * (kh + 1), 12, kh)))
  out.push(...betSprites(stake, Math.max(kx + 14, rack.left - 7), 0, ch, true))

  return { w: room.cols, h: room.rows, sprites: out }
}

function point(t: Table, p: Point, rnd: Rnd): Table {
  if (p.id.startsWith('key:')) return runKey(actions(t), p.id, t, rnd)

  return p.act === 'drop' ? t : betPoint(t, p.id)
}

export const hilo: Screen = { scene, point, controls }
