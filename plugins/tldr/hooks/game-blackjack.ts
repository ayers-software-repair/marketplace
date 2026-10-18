// Copyright Ayers Electronics Inc. All rights reserved.

// Blackjack as the felt lays it: the dealer's hand above, yours below with your bet beside it, your chips racked
// at the side. The hole card stays face down until the hand ends.

import type { Blackjack, Table, Turn } from '../types'
import { betControls, betPoint, betSprites, refillControls, settleBet, side, stakeOf } from './betting'
import * as bj from './blackjack'
import { cardHeight, slotRows } from './layout'
import { handSprites } from './piles'
import type { Point, Scene, Sprite } from './scene'
import { put, text } from './scene'
import type { Control, Rnd, Room, Screen } from './screen'
import { keySprites, runKey, toMenu } from './screen'

const isLive = (t: Table) => t.bj !== null && !t.bj.isOver

function play(f: (b: Blackjack, chips: number) => Turn<Blackjack>): Control['run'] {
  return t => {
    const r = f(t.bj!, t.chips)

    return settleBet({ ...t, bj: r.s, chips: r.chips, msg: r.msg })
  }
}

function deal(t: Table, rnd: Rnd): Table {
  const r = bj.deal(t.chips, rnd, stakeOf(t))

  return r.s ? settleBet({ ...t, bj: r.s, chips: r.chips, msg: r.msg }) : { ...t, msg: r.msg }
}

// The hand's actions, the ones the table's keys show too.
function actions(t: Table): Control[] {
  const b = t.bj
  if (b && !b.isOver) {
    return [
      { key: 'hit', label: 'Hit', hotkey: 'h', run: play(bj.hit) },
      { key: 'stand', label: 'Stand', hotkey: 's', run: play(bj.stand) },
      ...(b.player.length === 2 && t.chips >= b.bet ? [{ key: 'double', label: 'Double', hotkey: 'x', run: play(bj.double) }] : []),
    ]
  }

  return t.chips >= 1 ? [{ key: 'deal', label: b ? 'Deal Again' : 'Deal', hotkey: 'n', primary: true, run: deal }] : []
}

function controls(t: Table): Control[] {
  return [...actions(t), ...(isLive(t) ? [] : betControls(t)), ...refillControls(t), toMenu]
}

function scene(t: Table, room: Room): Scene {
  const b = t.bj
  const live = isLive(t)
  const stake = live ? b!.bet : stakeOf(t)
  const rack = side(live ? t.chips : t.chips - stake, room.cols, room.rows, !live)
  const rows = room.rows - rack.bottom
  const keyH = room.mouse ? (rows >= 18 ? 3 : 1) : 0
  const isCompact = rows < 2 * cardHeight(false) + 3 + keyH || rack.left < 40
  const ch = cardHeight(isCompact)
  const betX = Math.max(0, rack.left - 7)
  const yYou = ch + 2
  const out: Sprite[] = [...rack.sprites]
  const total = (cards: Blackjack['player']) => String(bj.value(cards).total)
  out.push(text(0, 0, 'DEALER' + (b && !live ? '  ' + total(b.dealer) : ''), 'gold'))
  const how = b && !live ? bj.outcome(b) : undefined
  const word = how ? '  ' + { bust: 'BUST', dealerBust: 'WIN', win: 'WIN', push: 'PUSH', lose: 'LOSE' }[how] : ''
  out.push(text(0, yYou, 'YOU' + (b ? '  ' + total(b.player) : '') + word, how === 'win' || how === 'dealerBust' ? 'win' : 'gold'))
  if (b) {
    out.push(...handSprites(b.dealer, 0, 1, betX - 1, isCompact, { pattern: t.opts.back, hidden: live ? 1 : undefined }))
    out.push(...handSprites(b.player, 0, yYou + 1, betX - 1, isCompact, { pattern: t.opts.back }))
  } else {
    out.push(put('', 0, 1, slotRows(isCompact)), put('', 0, yYou + 1, slotRows(isCompact)))
  }
  out.push(...betSprites(stake, betX, yYou, ch, !live))
  if (keyH > 0) out.push(...keySprites(actions(t), 0, rows - keyH, rack.left, keyH))

  return { w: room.cols, h: room.rows, sprites: out }
}

function point(t: Table, p: Point, rnd: Rnd): Table {
  if (p.id.startsWith('key:')) return runKey(actions(t), p.id, t, rnd)

  return isLive(t) || p.act === 'drop' ? t : betPoint(t, p.id)
}

export const blackjack: Screen = { scene, point, controls }
