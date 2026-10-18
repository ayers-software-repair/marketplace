// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card, FcFrom, FcTo, FreeCell } from '../types'
import { SUITS, fresh, isRed, shuffle } from './deck'

// Deals all 52 face up, left to right: the first four columns get 7, the last four 6.
export function newGame(rnd: () => number): FreeCell {
  const cols: Card[][] = [[], [], [], [], [], [], [], []]
  shuffle(fresh(), rnd).forEach((c, i) => cols[i % 8]!.push(c))

  return { cols, cells: [null, null, null, null], found: [0, 0, 0, 0], lift: null }
}

// The cards a source holds from its start: a column's tail, or a cell's single card.
function cards(s: FreeCell, from: FcFrom): Card[] {
  if ('cell' in from) {
    const c = s.cells[from.cell]

    return c ? [c] : []
  }
  const col = s.cols[from.col]

  return col && from.start >= 0 ? col.slice(from.start) : []
}

const isRun = (run: Card[]) => run.every((c, i) => i === 0 || (c.r === run[i - 1]!.r - 1 && isRed(c) !== isRed(run[i - 1]!)))

const fitsFoundation = (s: FreeCell, c: Card) => s.found[SUITS.indexOf(c.s)] === c.r - 1

// The longest run one move can carry: (free cells + 1) * 2^(empty columns), one fewer when moving into an empty one.
export function maxRun(s: FreeCell, toEmpty: boolean): number {
  const free = s.cells.filter(c => c === null).length
  const empty = s.cols.filter(c => c.length === 0).length - (toEmpty ? 1 : 0)

  return (free + 1) * 2 ** Math.max(0, empty)
}

// Every legal destination for the run or card at `from`.
export function targets(s: FreeCell, from: FcFrom): FcTo[] {
  const run = cards(s, from)
  if (run.length === 0 || !isRun(run)) return []
  const out: FcTo[] = []
  const lead = run[0]!
  if (run.length === 1) {
    if (fitsFoundation(s, lead)) out.push('f')
    s.cells.forEach((c, i) => c === null && out.push({ cell: i }))
  }
  s.cols.forEach((col, j) => {
    if ('col' in from && from.col === j) return
    const last = col[col.length - 1]
    const fits = last ? last.r === lead.r + 1 && isRed(last) !== isRed(lead) : true
    if (fits && run.length <= maxRun(s, !last)) out.push({ col: j })
  })

  return out
}

const same = (a: FcTo, b: FcTo) => JSON.stringify(a) === JSON.stringify(b)

function apply(s: FreeCell, from: FcFrom, to: FcTo): FreeCell {
  const run = cards(s, from)
  const cols = s.cols.map(c => [...c])
  const cells = [...s.cells]
  const found = [...s.found]
  if ('cell' in from) cells[from.cell] = null
  else cols[from.col] = cols[from.col]!.slice(0, from.start)
  if (to === 'f') found[SUITS.indexOf(run[0]!.s)] = run[0]!.r
  else if ('cell' in to) cells[to.cell] = run[0]!
  else cols[to.col] = [...cols[to.col]!, ...run]

  return { cols, cells, found, lift: null }
}

// Applies a legal move and clears the lift; an illegal one returns the state unchanged.
export function move(s: FreeCell, from: FcFrom, to: FcTo): FreeCell {
  return targets(s, from).some(t => same(t, to)) ? apply(s, from, to) : s
}

export function lift(s: FreeCell, from: FcFrom): FreeCell {
  return targets(s, from).length > 0 ? { ...s, lift: from } : s
}

export const cancel = (s: FreeCell): FreeCell => ({ ...s, lift: null })

// The top card of a column or a cell to its foundation, if it fits.
export function toFoundation(s: FreeCell, from: FcFrom): FreeCell {
  const top: FcFrom = 'cell' in from ? from : { col: from.col, start: (s.cols[from.col]?.length ?? 0) - 1 }

  return move(s, top, 'f')
}

// Sends every card that fits a foundation, from cells and column ends, until none does.
export function auto(s: FreeCell): FreeCell {
  const sources = (cur: FreeCell): FcFrom[] => [
    ...cur.cells.map((_, cell) => ({ cell })),
    ...cur.cols.map((c, col) => ({ col, start: c.length - 1 })),
  ]
  let cur = s
  for (;;) {
    const src = sources(cur).find(f => targets(cur, f).includes('f'))
    if (!src) return cur
    cur = apply(cur, src, 'f')
  }
}

export const isWon = (s: FreeCell) => s.found.every(n => n === 13)
