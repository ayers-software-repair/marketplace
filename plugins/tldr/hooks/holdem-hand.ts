// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card } from '../types'

export type HandValue = { cat: number; name: string; score: number[] }

const NAMES = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush']

// Ace counts 14 here; the wheel is the one place it plays low.
export const high = (c: Card) => (c.r === 1 ? 14 : c.r)

// Highest card of a straight in these distinct descending ranks, or 0.
function straightHigh(desc: number[]): number {
  const rs = desc.includes(14) ? [...desc, 1] : desc
  for (let i = 0; i + 4 < rs.length; i++) if (rs[i]! - rs[i + 4]! === 4) return rs[i]!

  return 0
}

// Exactly five cards: score is the category then every tiebreak rank in order.
function five(cards: Card[]): HandValue {
  const counts = new Map<number, number>()
  for (const c of cards) counts.set(high(c), (counts.get(high(c)) ?? 0) + 1)
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const ranks = groups.map(g => g[0])
  const shape = groups.map(g => g[1]).join('')
  const isFlush = cards.every(c => c.s === cards[0]!.s)
  const top = shape === '11111' ? straightHigh(ranks) : 0
  let cat = 0
  if (top && isFlush) cat = 8
  else if (shape === '41') cat = 7
  else if (shape === '32') cat = 6
  else if (isFlush) cat = 5
  else if (top) cat = 4
  else if (shape === '311') cat = 3
  else if (shape === '221') cat = 2
  else if (shape === '2111') cat = 1
  const name = cat === 8 && top === 14 ? 'Royal Flush' : NAMES[cat]!

  return { cat, name, score: [cat, ...(top ? [top] : ranks)] }
}

export function compare(a: HandValue, b: HandValue): number {
  for (let i = 0; i < Math.max(a.score.length, b.score.length); i++) {
    const d = (a.score[i] ?? 0) - (b.score[i] ?? 0)
    if (d) return d
  }

  return 0
}

// Best five of five to seven cards, by trying every five-card subset.
export function best(cards: Card[]): HandValue {
  let top: HandValue | undefined
  const pick = (from: number, chosen: Card[]) => {
    if (chosen.length === 5) {
      const v = five(chosen)
      if (!top || compare(v, top) > 0) top = v

      return
    }
    for (let i = from; i <= cards.length - (5 - chosen.length); i++) pick(i + 1, [...chosen, cards[i]!])
  }
  pick(0, [])

  return top!
}
