// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card, HoldemAction } from '../types'
import { best, high } from './holdem-hand'

// All a computer player may see: its own cards, the board and the betting. No other seat's cards, no deck.
export type BotView = {
  hole: Card[]
  board: Card[]
  pot: number
  bets: number[]
  level: number
  stack: number
  toCall: number
  canCheck: boolean
  canRaise: boolean
  minRaiseTo: number
  maxRaiseTo: number
}

export const BLUFF = 0.08

// Four to a flush, or four in a row with both ends open.
function isDraw(cards: Card[]): boolean {
  const flush = ['S', 'H', 'D', 'C'].some(s => cards.filter(c => c.s === s).length === 4)
  const rs = new Set(cards.flatMap(c => (c.r === 1 ? [1, 14] : [c.r])))
  let open = false
  for (let x = 2; x <= 10; x++) if ([0, 1, 2, 3].every(d => rs.has(x + d))) open = true

  return flush || open
}

// 2 strong, 1 medium, 0 weak.
export function strength(hole: Card[], board: Card[]): number {
  if (board.length === 0) {
    const [a, b] = hole.map(high).sort((x, y) => y - x) as [number, number]
    const score = a * 2 + b + (a === b ? 22 : 0) + (hole[0]!.s === hole[1]!.s ? 3 : 0) + (a - b === 1 ? 2 : 0)

    return score >= 38 ? 2 : score >= 28 ? 1 : 0
  }
  const cat = best([...hole, ...board]).cat
  if (cat >= 2) return 2

  return cat === 1 || (board.length < 5 && isDraw([...hole, ...board])) ? 1 : 0
}

// Strong hands bet half to full pot, medium hands call at a fair price, weak hands check or fold; a few bluffs.
export function decide(v: BotView, rnd: () => number): HoldemAction {
  const roll = rnd()
  const size = rnd()
  const s = strength(v.hole, v.board)
  const total = v.pot + v.bets.reduce((a, b) => a + b, 0)
  const passive: HoldemAction = v.canCheck ? { kind: 'check' } : { kind: 'call' }
  // Unraised: the bet to match is no bigger than one raise step (the big blind preflop, nothing after).
  const unraised = 2 * v.level <= v.minRaiseTo
  const wantsRaise = s === 2 ? unraised || v.toCall * 3 <= total : v.canCheck && roll < BLUFF
  if (v.canRaise && wantsRaise) {
    const to = Math.min(Math.max(Math.round(v.level + total * (0.5 + 0.5 * size)), v.minRaiseTo), v.maxRaiseTo)

    return to === v.maxRaiseTo ? { kind: 'allin' } : { kind: 'raise', to }
  }
  if (s === 2 || v.canCheck) return passive
  if (s === 1 && v.toCall * 3 <= total + v.toCall) return passive

  return { kind: 'fold' }
}
