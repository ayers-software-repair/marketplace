// Copyright Ayers Electronics Inc. All rights reserved.

// Video poker laid out as the machine: the pay table above with the winning row lit, five cards with HELD over
// the kept ones (a click on a card holds or releases it), the bet beside them and the chips racked at the side.

import type { Poker, Table } from '../types'
import { betControls, betPoint, betSprites, refillControls, settleBet, side, stakeOf } from './betting'
import { money } from './chips'
import { backRows, cardHeight, cardRows, cardWidth, padEnd } from './layout'
import * as vp from './poker'
import type { Point, Scene, Sprite } from './scene'
import { put, text } from './scene'
import type { Control, Rnd, Room, Screen } from './screen'
import { keySprites, runKey, toMenu } from './screen'

const NAMES = Object.keys(vp.PAYS)
const SHORT: Record<string, string> = {
  'Royal Flush': 'RF',
  'Straight Flush': 'SF',
  'Four of a Kind': '4K',
  'Full House': 'FH',
  Flush: 'FL',
  Straight: 'ST',
  'Three of a Kind': '3K',
  'Two Pair': '2P',
  'Jacks or Better': 'JB',
}

const isLive = (t: Table) => t.vp !== null && !t.vp.isOver

function deal(t: Table, rnd: Rnd): Table {
  const r = vp.deal(t.chips, rnd, stakeOf(t))

  return r.s ? { ...t, vp: r.s, chips: r.chips, msg: r.msg } : { ...t, msg: r.msg }
}

function draw(t: Table): Table {
  const r = vp.draw(t.vp!, t.chips)

  return settleBet({ ...t, vp: r.s, chips: r.chips, msg: r.msg })
}

const hold = (i: number) => (t: Table): Table => ({ ...t, vp: vp.toggle(t.vp!, i) })

function actions(t: Table): Control[] {
  if (isLive(t)) return [{ key: 'draw', label: 'Draw', hotkey: 'd', primary: true, run: draw }]

  return t.chips >= 1 ? [{ key: 'deal', label: t.vp ? 'Deal Again' : 'Deal', hotkey: 'n', primary: true, run: deal }] : []
}

function controls(t: Table): Control[] {
  const holds: Control[] = isLive(t)
    ? [0, 1, 2, 3, 4].map(i => ({ key: 'hold' + i, label: (t.vp!.held[i] ? 'Held ' : 'Hold ') + (i + 1), hotkey: String(i + 1), run: hold(i) }))
    : []

  return [...holds, ...actions(t), ...(isLive(t) ? [] : betControls(t)), ...refillControls(t), toMenu]
}

function scene(t: Table, room: Room): Scene {
  const p: Poker | null = t.vp
  const live = isLive(t)
  const stake = live ? (p!.bet ?? stakeOf(t)) : stakeOf(t)
  const rack = side(live ? t.chips : t.chips - stake, room.cols, room.rows, !live)
  const rows = room.rows - rack.bottom
  const won = p && p.isOver ? vp.rank(p.hand) : undefined
  const keyH = room.mouse ? (rows >= 20 ? 3 : 1) : 0
  // Full cards need the short pay table (two rows), a gap, HELD and five rows; the full table nine rows more.
  const isCompact = rack.left < 47 || rows < 2 + 1 + 1 + cardHeight(false) + keyH
  const ch = cardHeight(isCompact)
  const w = cardWidth(isCompact)
  const isFullTable = rows >= NAMES.length + 1 + 1 + ch + keyH
  const out: Sprite[] = [...rack.sprites]
  let y = 0
  if (isFullTable) {
    NAMES.forEach((name, i) => out.push(text(0, i, padEnd(name, 16) + padEnd(money(vp.PAYS[name]! * stake), 6), name === won ? 'win' : 'felt')))
    y = NAMES.length + 1
  } else {
    let x = 0
    let line = 0
    for (const name of NAMES) {
      const item = SHORT[name] + ' ' + vp.PAYS[name]
      if (x + item.length > rack.left) {
        x = 0
        line += 1
      }
      out.push(text(x, line, item, name === won ? 'win' : 'dim'))
      x += item.length + 2
    }
    y = line + 2
  }
  ;[0, 1, 2, 3, 4].forEach(i => {
    const card = p?.hand[i]
    const isHeld = live && p!.held[i]!
    const x = i * (w + 1)
    out.push(text(x, y, isHeld ? padEnd('HELD', w) : ' '.repeat(w), 'gold'))
    out.push(put('card:' + i, x, y + 1, card ? cardRows(card, isCompact, isHeld) : backRows(isCompact, t.opts.back), { hot: live }))
  })
  out.push(...betSprites(stake, 5 * (w + 1) + 1, y, ch, !live))
  if (keyH > 0) out.push(...keySprites(actions(t), 0, rows - keyH, rack.left, keyH))

  return { w: room.cols, h: room.rows, sprites: out }
}

function point(t: Table, p: Point, rnd: Rnd): Table {
  if (p.id.startsWith('key:')) return runKey(actions(t), p.id, t, rnd)
  if (p.id.startsWith('card:')) return isLive(t) ? hold(Number(p.id.slice(5)))(t) : t

  return isLive(t) || p.act === 'drop' ? t : betPoint(t, p.id)
}

export const poker: Screen = { scene, point, controls }
