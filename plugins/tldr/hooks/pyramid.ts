// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card, PyrAt, Pyramid } from '../types'
import { fresh, shuffle } from './deck'

// 28 cards face up in seven rows, 24 in the stock, three passes through it.
export function newGame(rnd: () => number): Pyramid {
  const d = shuffle(fresh(), rnd)

  return { pyr: d.slice(0, 28), stock: d.slice(28), waste: [], pass: 1, lift: null }
}

// Row of pyramid index i: row r starts at r*(r+1)/2.
export const rowOf = (i: number) => Math.floor((Math.sqrt(8 * i + 1) - 1) / 2)

// A pyramid card is free when both cards covering it are gone; the bottom row is always free.
export function isFree(s: Pyramid, i: number): boolean {
  if (!s.pyr[i]) return false
  const r = rowOf(i)

  return r === 6 || (!s.pyr[i + r + 1] && !s.pyr[i + r + 2])
}

export const canPair = (a: Card, b: Card) => a.r + b.r === 13

// The card at `at` when it is free to play, else null.
function freeCard(s: Pyramid, at: PyrAt): Card | null {
  if (at === 'w') return s.waste[s.waste.length - 1] ?? null

  return isFree(s, at) ? s.pyr[at]! : null
}

function remove(s: Pyramid, ats: PyrAt[]): Pyramid {
  const pyr = s.pyr.map((c, i) => (ats.includes(i) ? null : c))
  const waste = ats.includes('w') ? s.waste.slice(0, -1) : s.waste

  return { ...s, pyr, waste, lift: null }
}

// One click: a free King goes at once; otherwise lift, put back, pair to 13, or switch the lift.
export function pick(s: Pyramid, at: PyrAt): Pyramid {
  const card = freeCard(s, at)
  if (!card) return s
  if (card.r === 13) return remove(s, [at])
  if (s.lift === null) return { ...s, lift: at }
  if (s.lift === at) return { ...s, lift: null }
  const held = freeCard(s, s.lift)
  if (held && canPair(held, card)) return remove(s, [s.lift, at])

  return { ...s, lift: at }
}

// Stock's top to the waste; an empty stock takes the waste back while passes remain.
export function draw(s: Pyramid): Pyramid {
  if (s.stock.length > 0) return { ...s, stock: s.stock.slice(1), waste: [...s.waste, s.stock[0]!], lift: null }
  if (s.pass < 3 && s.waste.length > 0) return { ...s, stock: [...s.waste], waste: [], pass: s.pass + 1, lift: null }

  return s
}

export const isWon = (s: Pyramid) => s.pyr.every(c => c === null)
