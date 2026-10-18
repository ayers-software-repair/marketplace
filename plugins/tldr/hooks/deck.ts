// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card, Suit } from '../types'

// The stake a new table starts with, and the balance it starts with.
export const BET = 5
export const START_CHIPS = 100
export const SUITS: Suit[] = ['S', 'H', 'D', 'C']

const SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

// A fresh ordered deck: ace is rank 1, king is 13.
export function fresh(): Card[] {
  return SUITS.flatMap(s => Array.from({ length: 13 }, (_, i) => ({ r: i + 1, s })))
}

// Fisher-Yates over a copy; rnd returns a number in [0, 1).
export function shuffle(cards: Card[], rnd: () => number): Card[] {
  const a = [...cards]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const t = a[i]!
    a[i] = a[j]!
    a[j] = t
  }

  return a
}

export function label(c: Card): string {
  return (RANKS[c.r - 1] ?? '?') + SYMBOL[c.s]
}

export function isRed(c: Card): boolean {
  return c.s === 'H' || c.s === 'D'
}
