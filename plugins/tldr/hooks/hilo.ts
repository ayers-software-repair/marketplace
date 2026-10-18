// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card, HiLo, Turn } from '../types'
import { BET, fresh, shuffle } from './deck'

// Ace is high.
export const rankOf = (c: Card) => (c.r === 1 ? 14 : c.r)

export function start(rnd: () => number): HiLo {
  const d = shuffle(fresh(), rnd)

  return { deck: d.slice(1), current: d[0]!, streak: 0 }
}

// Each guess stakes `bet`: right wins it, wrong or a tie loses it.
export function guess(h: HiLo, chips: number, isHigher: boolean, rnd: () => number, bet = BET): Turn<HiLo> {
  if (!(bet >= 1) || chips < bet) return { s: h, chips, msg: 'Not enough chips.' }
  const deck = h.deck.length > 0 ? h.deck : shuffle(fresh(), rnd)
  const next = deck[0]!
  const a = rankOf(next)
  const b = rankOf(h.current)
  const isRight = isHigher ? a > b : a < b
  const rest = deck.slice(1)
  if (isRight) {
    const streak = h.streak + 1

    return { s: { deck: rest, current: next, streak }, chips: chips + bet, msg: 'Right. You win ' + bet + '. Streak ' + streak + '.' }
  }

  return {
    s: { deck: rest, current: next, streak: 0 },
    chips: chips - bet,
    msg: (a === b ? 'Tie loses. ' : 'Wrong. ') + 'You lose ' + bet + '.',
  }
}
