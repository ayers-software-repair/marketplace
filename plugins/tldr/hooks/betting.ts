// Copyright Ayers Electronics Inc. All rights reserved.

// The chips at the side of a betting table and the bet on it: the rack drawn as stacks by denomination, the bet
// pile, and the clicks, buttons and keys that raise and lower the bet between hands.

import type { Table } from '../types'
import type { Denom } from './chips'
import { DENOMS, addChip, clampBet, maxBet, money, pile, rack, stepBet, takeChip } from './chips'
import { chipRow, chipStack, padEnd } from './layout'
import type { Row } from './layout'
import type { Control } from './screen'
import type { Sprite } from './scene'
import { put, text } from './scene'

// Columns the rack takes: four stacks of five, a column between.
export const RACK_W = 23

// The rack at x, y: "CHIPS n" over the four stacks, each as tall as its count up to `cap` rows, the count under
// it. Stacks are pressable (`isOpen`) while a bet may be changed. Rows used: cap + 2.
export function rackSprites(balance: number, x: number, y: number, cap: number, isOpen: boolean): Sprite[] {
  const { stacks, half } = rack(balance)
  const out: Sprite[] = [text(x, y, padEnd('CHIPS ' + money(balance), RACK_W), 'gold')]
  stacks.forEach((s, i) => {
    const sx = x + i * 6
    const rows = s.count > 0 ? chipStack(s.denom, s.count, cap) : []
    if (rows.length > 0) out.push(put('chip:' + s.denom, sx, y + 1 + cap - rows.length, rows, { hot: isOpen && s.count > 0 }))
    out.push(text(sx, y + 1 + cap, padEnd(s.count > 0 ? '×' + s.count : '', 5), 'dim'))
  })
  if (half) out.push(text(x + RACK_W - 1, y, '½', 'gold'))

  return out
}

// The bet pile at x, y: the chips that make it standing on the felt, largest at the bottom, at most `cap` rows,
// with "BET n" under them. Pressable (`isOpen`) to take the top chip back. Rows used: cap + 1.
export function betSprites(stake: number, x: number, y: number, cap: number, isOpen: boolean): Sprite[] {
  const rows: Row[] = pile(stake)
    .flatMap(s => Array.from({ length: s.count }, () => chipRow(s.denom)))
    .reverse()
    .slice(-Math.max(1, cap))
  const out: Sprite[] = [text(x, y + cap, padEnd('BET ' + money(stake), 7), 'gold')]
  if (rows.length > 0) out.push(put('bet', x, y + cap - rows.length, rows, { hot: isOpen && stake > 1 }))

  return out
}

// A press on a chip stack bets one more of that chip; a press on the bet pile takes its top chip back.
export function betPoint(t: Table, id: string): Table {
  if (id === 'bet') return { ...t, bet: takeChip(t.bet) }
  const denom = Number(id.slice('chip:'.length))
  if (id.startsWith('chip:') && (DENOMS as readonly number[]).includes(denom)) return { ...t, bet: addChip(t.bet, denom as Denom, t.chips) }

  return t
}

// "+", "-", Clear and Max: the keyboard's way to the same bet.
export function betControls(t: Table): Control[] {
  return [
    { key: 'bet-up', label: '+', hotkey: 'u', run: x => ({ ...x, bet: stepBet(x.bet, 1, x.chips) }) },
    { key: 'bet-down', label: '-', hotkey: 'j', run: x => ({ ...x, bet: stepBet(x.bet, -1, x.chips) }) },
    { key: 'bet-clear', label: 'Clear', hotkey: '0', run: x => ({ ...x, bet: clampBet(1, x.chips) }) },
    ...(maxBet(t.chips) > t.bet ? [{ key: 'bet-max', label: 'Max', hotkey: 'z', run: (x: Table) => ({ ...x, bet: maxBet(x.chips) }) }] : []),
  ]
}

// New Chips, offered when the balance covers no bet (`min`, the table's least stake): the refill the menu's
// option names.
export function refillControls(t: Table, min = 1): Control[] {
  return t.chips < min
    ? [{ key: 'chips', label: 'New Chips', hotkey: 'k', run: x => ({ ...x, chips: x.opts.refill, bet: clampBet(x.bet || 1, x.opts.refill), msg: 'Fresh chips.' }) }]
    : []
}

// The stake a deal takes: the kept bet, held to the balance.
export const stakeOf = (t: Table) => clampBet(t.bet, t.chips)

// After a hand: the kept bet held to what is left.
export const settleBet = (t: Table): Table => ({ ...t, bet: clampBet(t.bet, t.chips) })

// Where the rack goes on a betting table: down the right side when there is room (the table keeps `left`
// columns), else along the bottom (the table keeps all but `bottom` rows).
export function side(balance: number, cols: number, rows: number, isOpen: boolean): { sprites: Sprite[]; left: number; bottom: number } {
  if (cols >= 50) return { sprites: rackSprites(balance, cols - RACK_W, 0, Math.max(1, Math.min(8, rows - 2)), isOpen), left: cols - RACK_W - 2, bottom: 0 }

  return { sprites: rackSprites(balance, 0, rows - 3, 1, isOpen), left: cols, bottom: 3 }
}
