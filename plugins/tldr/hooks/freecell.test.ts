// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import type { Card, FreeCell, Suit } from '../types'
import { auto, cancel, isWon, lift, maxRun, move, newGame, targets, toFoundation } from './freecell'

const c = (r: number, s: Suit = 'S'): Card => ({ r, s })
const ace = c(1, 'C')
// Columns given are padded to eight with a lone ace, which nothing can go onto.
const fc = (cols: Card[][], cells: (Card | null)[] = [null, null, null, null], found = [0, 0, 0, 0]): FreeCell => ({
  cols: [...cols, ...Array.from({ length: 8 - cols.length }, () => [ace])],
  cells,
  found,
  lift: null,
})

test('freecell deals 52 face up as 7,7,7,7,6,6,6,6 with empty cells', () => {
  const s = newGame(() => 0)
  expect(s.cols.map(col => col.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6])
  expect(new Set(s.cols.flat().map(x => x.r + x.s)).size).toBe(52)
  expect(s.cells).toEqual([null, null, null, null])
  expect(s.found).toEqual([0, 0, 0, 0])
})

test('an alternating descending run moves onto the other colour one rank higher', () => {
  const s = fc([[c(13, 'C'), c(8, 'H'), c(7, 'S'), c(6, 'D')], [c(9, 'C')]])
  const after = move(s, { col: 0, start: 1 }, { col: 1 })
  expect(after.cols[1]).toEqual([c(9, 'C'), c(8, 'H'), c(7, 'S'), c(6, 'D')])
  expect(after.cols[0]).toEqual([c(13, 'C')])
  expect(targets(fc([[c(8, 'H'), c(7, 'D')], [c(9, 'C')]]), { col: 0, start: 0 })).toEqual([])
  expect(move(fc([[c(8, 'H')], [c(9, 'D')]]), { col: 0, start: 0 }, { col: 1 }).cols[1]).toEqual([c(9, 'D')])
})

test('maxRun refuses a run one too long, and counts one fewer empty column when the target is empty', () => {
  const run = [c(8, 'H'), c(7, 'S'), c(6, 'D')]
  const oneCell = [null, ace, ace, ace]
  const full = fc([run, [c(9, 'C')], [c(8, 'D')]], oneCell)
  expect(maxRun(full, false)).toBe(2)
  expect(targets(full, { col: 0, start: 0 })).toEqual([])
  expect(targets(full, { col: 0, start: 1 }).length > 0).toBe(true)
  const withEmpty = { ...fc([run, [c(9, 'C')]], oneCell), cols: [run, [c(9, 'C')], [], [ace], [ace], [ace], [ace], [ace]] }
  expect(maxRun(withEmpty, false)).toBe(4)
  expect(maxRun(withEmpty, true)).toBe(2)
  expect(targets(withEmpty, { col: 0, start: 0 })).toEqual([{ col: 1 }])
})

test('a free cell takes one card only', () => {
  const s = fc([[c(8, 'H'), c(7, 'S')]])
  expect(move(s, { col: 0, start: 0 }, { cell: 0 })).toBe(s)
  const one = move(s, { col: 0, start: 1 }, { cell: 2 })
  expect(one.cells).toEqual([null, null, c(7, 'S'), null])
  expect(move(one, { col: 0, start: 0 }, { cell: 2 })).toBe(one)
})

test('foundations build up by suit from the ace', () => {
  const s = fc([[c(2, 'S')], [c(1, 'S')]])
  expect(move(s, { col: 0, start: 0 }, 'f')).toBe(s)
  const a = move(s, { col: 1, start: 0 }, 'f')
  expect(a.found).toEqual([1, 0, 0, 0])
  expect(move(a, { col: 0, start: 0 }, 'f').found).toEqual([2, 0, 0, 0])
})

test('toFoundation sends a column top or a cell card, and refuses one that does not fit', () => {
  const s = fc([[c(1, 'S'), c(5, 'H')], [c(3, 'D'), c(1, 'H')]], [c(1, 'D'), null, null, null])
  expect(toFoundation(s, { col: 0, start: 0 })).toBe(s)
  expect(toFoundation(s, { col: 1, start: 0 }).found).toEqual([0, 1, 0, 0])
  expect(toFoundation(s, { cell: 0 }).found).toEqual([0, 0, 1, 0])
})

test('auto finishes a near-won game from cells and column ends', () => {
  const cols = [[c(13, 'H'), c(13, 'S')], [c(13, 'D')], [], [], [], [], [], []]
  const s: FreeCell = { cols, cells: [c(12, 'S'), c(13, 'C'), null, null], found: [11, 12, 12, 12], lift: null }
  const done = auto(s)
  expect(done.found).toEqual([13, 13, 13, 13])
  expect(isWon(done)).toBe(true)
  expect(isWon(s)).toBe(false)
})

test('lift needs somewhere to go; move and cancel clear it', () => {
  const s = fc([[c(8, 'H')], [c(9, 'C')], [c(5, 'H'), c(9, 'S')]], [ace, ace, ace, ace])
  expect(lift(s, { col: 2, start: 0 })).toBe(s)
  const held = lift(s, { col: 0, start: 0 })
  expect(held.lift).toEqual({ col: 0, start: 0 })
  expect(cancel(held).lift).toBe(null)
  expect(move(held, { col: 0, start: 0 }, { col: 1 }).lift).toBe(null)
})
