// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card, Holdem, Suit } from '../types'
import { fresh } from './deck'
import { act, deal, legal, newTable } from './holdem'

export const seeded = (seed = 7) => {
  let x = seed

  return () => {
    x = (x * 16807) % 2147483647

    return x / 2147483647
  }
}

// '10H' style: rank then suit letter; A K Q J for faces.
const FACE: Record<string, number> = { A: 1, K: 13, Q: 12, J: 11 }
export const cards = (text: string): Card[] =>
  text.split(' ').map(t => ({ r: FACE[t.slice(0, -1)] ?? Number(t.slice(0, -1)), s: t.slice(-1) as Suit }))

// A dealt hand where every seat is driven by the test: no seat is a bot.
export function dealt(stacks: number[]): Holdem {
  const t = newTable((stacks.length - 1) as 1 | 2 | 3, 0, 0)

  return deal({ ...t, seats: t.seats.map((s, i) => ({ ...s, isBot: false, chips: stacks[i]! })) }, seeded())
}

// Sets each seat's hole cards and the five board cards, keeping a burn before each street.
export function rig(h: Holdem, holes: string[], board: string): Holdem {
  const b = cards(board)
  const used = new Set([...holes.flatMap(cards), ...b].map(c => c.r + c.s))
  const spare = fresh().filter(c => !used.has(c.r + c.s))

  return {
    ...h,
    seats: h.seats.map((s, i) => ({ ...s, hole: cards(holes[i]!) })),
    deck: [spare[0]!, b[0]!, b[1]!, b[2]!, spare[1]!, b[3]!, spare[2]!, b[4]!, ...spare.slice(3)],
  }
}

// Checks or calls for whoever is to act until the hand ends.
export function checkDown(h: Holdem): Holdem {
  let t = h
  while (!t.isOver) t = act(t, { kind: legal(t)!.canCheck ? 'check' : 'call' }, seeded())

  return t
}

export const total = (h: Holdem) => h.pot + h.seats.reduce((a, s) => a + s.chips + s.bet, 0)
