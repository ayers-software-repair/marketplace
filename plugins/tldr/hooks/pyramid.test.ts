// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import type { Card, Pyramid } from '../types'
import { canPair, draw, isFree, isWon, newGame, pick } from './pyramid'

const c = (r: number): Card => ({ r, s: 'S' })
// An otherwise empty pyramid holding the given cards by index.
const py = (at: Record<number, Card>, waste: Card[] = [], stock: Card[] = []): Pyramid => ({
  pyr: Array.from({ length: 28 }, (_, i) => at[i] ?? null),
  stock,
  waste,
  pass: 1,
  lift: null,
})

test('pyramid deals 28 face up, 24 in the stock, first pass', () => {
  const s = newGame(() => 0)
  expect(s.pyr.length).toBe(28)
  expect(s.pyr.every(x => x !== null)).toBe(true)
  expect(s.stock.length).toBe(24)
  expect(s.waste).toEqual([])
  expect(s.pass).toBe(1)
})

test('only the bottom row is free at the start; a card frees when both covers go', () => {
  const s = newGame(() => 0)
  expect(s.pyr.map((_, i) => isFree(s, i))).toEqual(Array.from({ length: 28 }, (_, i) => i >= 21))
  const one = { ...s, pyr: s.pyr.map((x, i) => (i === 21 ? null : x)) }
  expect(isFree(one, 15)).toBe(false)
  const both = { ...s, pyr: s.pyr.map((x, i) => (i === 21 || i === 22 ? null : x)) }
  expect(isFree(both, 15)).toBe(true)
  expect(isFree(both, 16)).toBe(false)
})

test('two free cards making 13 are removed; a free king goes alone', () => {
  expect(canPair(c(6), c(7))).toBe(true)
  expect(canPair(c(6), c(6))).toBe(false)
  const s = py({ 21: c(6), 22: c(7), 23: c(13) })
  const paired = pick(pick(s, 21), 22)
  expect([paired.pyr[21], paired.pyr[22], paired.lift]).toEqual([null, null, null])
  const king = pick(s, 23)
  expect(king.pyr[23]).toBe(null)
  expect(king.pyr[21]).toEqual(c(6))
})

test('the waste top pairs with a pyramid card', () => {
  const s = py({ 21: c(8) }, [c(2), c(5)])
  const after = pick(pick(s, 'w'), 21)
  expect(after.waste).toEqual([c(2)])
  expect(isWon(after)).toBe(true)
  expect(isWon(s)).toBe(false)
})

test('pick puts back on a second click, switches on a non-pair, ignores a covered card', () => {
  const s = py({ 15: c(1), 21: c(6), 22: c(5) })
  const held = pick(s, 21)
  expect(held.lift).toBe(21)
  expect(pick(held, 21).lift).toBe(null)
  expect(pick(held, 22).lift).toBe(22)
  expect(pick(held, 15)).toBe(held)
  expect(pick(s, 'w')).toBe(s)
})

test('three passes through the stock, then no more', () => {
  let s = py({ 21: c(1) }, [], [c(2), c(3)])
  for (let pass = 1; pass <= 3; pass++) {
    expect(s.pass).toBe(pass)
    s = draw(draw(s))
    expect(s.waste).toEqual([c(2), c(3)])
    if (pass < 3) s = draw(s)
  }
  expect(draw(s)).toBe(s)
})
