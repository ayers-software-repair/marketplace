// Copyright Ayers Electronics Inc. All rights reserved.

// Casino War: the dealer's card above yours, your bet beside it, your chips racked at the side. A tie offers War
// (raise the same again) or Surrender (half back).

import type { Table, War, Turn } from '../types'
import { betControls, betPoint, betSprites, refillControls, settleBet, side, stakeOf } from './betting'
import { backRows, cardHeight, cardRows, slotRows } from './layout'
import type { Point, Scene, Sprite } from './scene'
import { put, text } from './scene'
import type { Control, Rnd, Room, Screen } from './screen'
import { keySprites, runKey, toMenu } from './screen'
import { rankOf } from './hilo'
import * as wr from './war'

const isLive = (t: Table) => t.war !== null && t.war.phase === 'tie'

const settle = (f: (w: War, chips: number) => Turn<War>): Control['run'] => t => {
  const r = f(t.war!, t.chips)

  return settleBet({ ...t, war: r.s, chips: r.chips, msg: r.msg })
}

function deal(t: Table, rnd: Rnd): Table {
  const r = wr.deal(t.chips, stakeOf(t), rnd)

  return r.s ? settleBet({ ...t, war: r.s, chips: r.chips, msg: r.msg }) : { ...t, msg: r.msg }
}

function actions(t: Table): Control[] {
  if (isLive(t)) {
    return [
      ...(t.chips >= t.war!.stake ? [{ key: 'war', label: 'War', hotkey: 'w', primary: true, run: settle(wr.war) }] : []),
      { key: 'surrender', label: 'Surrender', hotkey: 's', run: settle(wr.surrender) },
    ]
  }

  return t.chips >= 1 ? [{ key: 'deal', label: t.war ? 'Deal Again' : 'Deal', hotkey: 'n', primary: true, run: deal }] : []
}

const controls = (t: Table): Control[] => [...actions(t), ...(isLive(t) ? [] : betControls(t)), ...refillControls(t), toMenu]

function scene(t: Table, room: Room): Scene {
  const w = t.war
  const live = isLive(t)
  const stake = live ? w!.stake : stakeOf(t)
  const rack = side(live ? t.chips : t.chips - stake, room.cols, room.rows, !live)
  const rows = room.rows - rack.bottom
  const isCompact = rows < 2 * cardHeight(false) + 2 + (room.mouse ? 1 : 0)
  const ch = cardHeight(isCompact)
  const out: Sprite[] = [...rack.sprites]
  const face = (c: War['mine'] | undefined) => (c ? cardRows(c, isCompact) : slotRows(isCompact))
  out.push(text(0, 0, 'DEALER', 'gold'), put('', 0, 1, face(w?.theirs)))
  const won = !!w && !live && !!w.mine && !!w.theirs && (rankOf(w.mine) > rankOf(w.theirs) || (w.burned > 0 && rankOf(w.mine) >= rankOf(w.theirs)))
  out.push(text(0, ch + 1, 'YOU' + (won ? '  WIN' : ''), won ? 'win' : 'gold'), put('', 0, ch + 2, face(w?.mine)))
  if (w && w.burned > 0) out.push(put('', 12, 1, backRows(isCompact, t.opts.back)), text(12, 1 + ch, 'BURNED ' + w.burned, 'dim'))
  out.push(...betSprites(stake, Math.max(20, rack.left - 7), ch + 1, ch, !live))
  if (room.mouse) out.push(...keySprites(actions(t), 0, rows - 1, rack.left, 1))

  return { w: room.cols, h: room.rows, sprites: out }
}

function point(t: Table, p: Point, rnd: Rnd): Table {
  if (p.id.startsWith('key:')) return runKey(actions(t), p.id, t, rnd)

  return isLive(t) || p.act === 'drop' ? t : betPoint(t, p.id)
}

export const war: Screen = { scene, point, controls }
