// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card, Turn, War } from '../types'
import { fresh, shuffle } from './deck'
import { rankOf } from './hilo'

// Opens a hand from `d`: the first card is yours, the second the dealer's.
export function open(d: Card[], chips: number, stake: number): Turn<War> {
  const w: War = { deck: d.slice(2), mine: d[0]!, theirs: d[1]!, stake, phase: 'over', burned: 0 }
  const left = chips - stake
  if (rankOf(w.mine!) === rankOf(w.theirs!)) return { s: { ...w, phase: 'tie' }, chips: left, msg: 'Tie. Go to war or surrender.' }
  if (rankOf(w.mine!) > rankOf(w.theirs!)) return { s: w, chips: left + stake * 2, msg: 'You win ' + stake + '.' }

  return { s: w, chips: left, msg: 'Dealer wins. You lose ' + stake + '.' }
}

export function deal(chips: number, stake: number, rnd: () => number): Turn<War | null> {
  if (!(stake >= 1) || stake > chips) return { s: null, chips, msg: 'Not enough chips.' }

  return open(shuffle(fresh(), rnd), chips, stake)
}

// Raises by the stake, burns three cards and draws again; a tie counts as a win.
export function war(w: War, chips: number): Turn<War> {
  if (w.phase !== 'tie') return { s: w, chips, msg: 'No tie to settle.' }
  if (chips < w.stake) return { s: w, chips, msg: 'Not enough chips to go to war.' }
  const left = chips - w.stake
  const next: War = { ...w, deck: w.deck.slice(5), mine: w.deck[3]!, theirs: w.deck[4]!, phase: 'over', burned: 3 }
  if (rankOf(next.mine!) >= rankOf(next.theirs!)) return { s: next, chips: left + w.stake * 3, msg: 'You win the war. You win ' + w.stake + '.' }

  return { s: next, chips: left, msg: 'Dealer wins the war. You lose ' + w.stake * 2 + '.' }
}

export function surrender(w: War, chips: number): Turn<War> {
  if (w.phase !== 'tie') return { s: w, chips, msg: 'No tie to settle.' }

  return { s: { ...w, phase: 'over' }, chips: chips + w.stake / 2, msg: 'You surrender. You lose ' + w.stake / 2 + '.' }
}
