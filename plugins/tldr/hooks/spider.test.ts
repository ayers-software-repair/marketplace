// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import type { Card, Column, Spider, Suit } from '../types'
import { cancel, deal, isWon, lift, move, newGame, targets } from './spider'

const c = (r: number, s: Suit = 'S'): Card => ({ r, s })
const up = (...cards: Card[]): Column => ({ down: [], up: cards })
// Columns given are padded to ten with a lone ace, which nothing can go onto.
const sp = (cols: Column[], stock: Card[] = []): Spider => ({
  cols: [...cols, ...Array.from({ length: 10 - cols.length }, () => up(c(1, 'H')))],
  stock,
  done: 0,
  suits: 2,
  lift: null,
})

test('spider deals 54 into ten columns with one card up each, for one and two suits', () => {
  for (const suits of [1, 2] as const) {
    const s = newGame(() => 0, suits)
    expect(s.cols.map(col => col.down.length + col.up.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5])
    expect(s.cols.every(col => col.up.length === 1)).toBe(true)
    expect(s.stock.length).toBe(50)
    const all = [...s.stock, ...s.cols.flatMap(col => [...col.down, ...col.up])]
    expect(all.filter(x => x.s === 'S').length).toBe(suits === 1 ? 104 : 52)
    expect(all.filter(x => x.s === 'H').length).toBe(suits === 1 ? 0 : 52)
    expect(all.filter(x => x.r === 7).length).toBe(8)
  }
})

test('a mixed-suit run cannot move; a same-suit run goes onto any suit one rank higher or an empty column', () => {
  expect(targets(sp([up(c(8, 'S'), c(7, 'H')), up(c(9, 'S'))]), 0, 0)).toEqual([])
  const s = sp([up(c(8, 'S'), c(7, 'S')), up(c(9, 'H')), { down: [], up: [] }])
  expect(targets(s, 0, 0)).toEqual([1, 2])
  expect(move(s, 0, 0, 1).cols[1]!.up).toEqual([c(9, 'H'), c(8, 'S'), c(7, 'S')])
  expect(move(s, 0, 0, 3)).toBe(s)
})

test('a completed K-to-A run is removed and the cards beneath turn up', () => {
  const kingToTwo = Array.from({ length: 12 }, (_, i) => c(13 - i))
  const s = sp([{ down: [c(5, 'H')], up: kingToTwo }, { down: [c(3, 'H')], up: [c(1)] }])
  const after = move(s, 1, 0, 0)
  expect(after.done).toBe(1)
  expect(after.cols[0]).toEqual(up(c(5, 'H')))
  expect(after.cols[1]).toEqual(up(c(3, 'H')))
})

test('deal puts one card on every column and is refused with an empty column or stock', () => {
  const stock = Array.from({ length: 20 }, (_, i) => c((i % 13) + 1, 'H'))
  const s = sp([], stock)
  const dealt = deal(s)
  expect(dealt.stock.length).toBe(10)
  expect(dealt.cols.every(col => col.up.length === 2)).toBe(true)
  const hole = sp([{ down: [], up: [] }], stock)
  expect(deal(hole)).toBe(hole)
  const dry = sp([])
  expect(deal(dry)).toBe(dry)
})

test('lift needs somewhere to go; won at eight runs', () => {
  const s = sp([up(c(8, 'S')), up(c(9, 'H'))])
  expect(lift(s, 2, 0)).toBe(s)
  const held = lift(s, 0, 0)
  expect(held.lift).toEqual({ col: 0, start: 0 })
  expect(cancel(held).lift).toBe(null)
  expect(isWon({ ...s, done: 7 })).toBe(false)
  expect(isWon({ ...s, done: 8 })).toBe(true)
})
