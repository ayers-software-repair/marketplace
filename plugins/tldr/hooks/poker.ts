// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card, Poker, Turn } from '../types'
import { BET, fresh, shuffle } from './deck'
import { best } from './holdem-hand'

// Jacks or Better, 9/6 full-pay: multiples of the bet.
export const PAYS: Record<string, number> = {
  'Royal Flush': 250,
  'Straight Flush': 50,
  'Four of a Kind': 25,
  'Full House': 9,
  Flush: 6,
  Straight: 4,
  'Three of a Kind': 3,
  'Two Pair': 2,
  'Jacks or Better': 1,
}

// Name of the hand's winning rank on the pay table, or undefined for no win: the hold'em evaluator's category,
// a pair paying only when it is jacks or better (an ace counts 14).
export function rank(hand: Card[]): string | undefined {
  const v = best(hand)
  if (v.cat === 0) return undefined
  if (v.cat === 1) return v.score[1]! >= 11 ? 'Jacks or Better' : undefined

  return v.name
}

// Deals five for the stake `bet`; the draw pays the table times it.
export function deal(chips: number, rnd: () => number, bet = BET): Turn<Poker | null> {
  if (!(bet >= 1) || chips < bet) return { s: null, chips, msg: 'Not enough chips.' }
  const d = shuffle(fresh(), rnd)

  return {
    s: { deck: d.slice(5), hand: d.slice(0, 5), held: [false, false, false, false, false], isOver: false, bet },
    chips: chips - bet,
    msg: 'Hold cards, then draw.',
  }
}

export function toggle(p: Poker, i: number): Poker {
  if (p.isOver) return p

  return { ...p, held: p.held.map((h, k) => (k === i ? !h : h)) }
}

export function draw(p: Poker, chips: number): Turn<Poker> {
  if (p.isOver) return { s: p, chips, msg: 'Hand is over.' }
  let at = 0
  const hand = p.hand.map((c, i) => (p.held[i] ? c : p.deck[at++]!))
  const name = rank(hand)
  const pay = name ? PAYS[name]! * (p.bet ?? BET) : 0

  return {
    s: { ...p, hand, deck: p.deck.slice(at), isOver: true },
    chips: chips + pay,
    msg: name ? name + '. Pays ' + pay + '.' : 'No win.',
  }
}
