// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card, Column, Spider, Suit } from '../types'
import { shuffle } from './deck'

// 104 cards: eight A-K sets of spades, or four of spades and four of hearts. 54 dealt into ten columns
// (the first four get 6, the rest 5), only each column's last card face up; the other 50 are the stock.
export function newGame(rnd: () => number, suits: 1 | 2): Spider {
  const sets = Array.from({ length: 8 }, (_, k): Suit => (suits === 1 || k < 4 ? 'S' : 'H'))
  const d = shuffle(sets.flatMap(s => Array.from({ length: 13 }, (_, i): Card => ({ r: i + 1, s }))), rnd)
  let at = 0
  const cols = Array.from({ length: 10 }, (_, i): Column => {
    const dealt = d.slice(at, (at += i < 4 ? 6 : 5))

    return { down: dealt.slice(0, -1), up: dealt.slice(-1) }
  })

  return { cols, stock: d.slice(at), done: 0, suits, lift: null }
}

const isRun = (run: Card[]) => run.every((c, i) => i === 0 || (c.r === run[i - 1]!.r - 1 && c.s === run[i - 1]!.s))

// Removes a finished K-to-A run from the column's end, then turns up its last card when none is face up.
function settle(s: Spider): Spider {
  let done = s.done
  const cols = s.cols.map(c => {
    let { down, up } = c
    const tail = up.slice(-13)
    if (tail.length === 13 && tail[0]!.r === 13 && isRun(tail)) {
      up = up.slice(0, -13)
      done += 1
    }
    if (up.length === 0 && down.length > 0) {
      up = down.slice(-1)
      down = down.slice(0, -1)
    }

    return { down, up }
  })

  return { ...s, cols, done, lift: null }
}

// Columns the run from `start` can go to: one whose last card is one rank higher (any suit), or an empty one.
export function targets(s: Spider, col: number, start: number): number[] {
  const run = s.cols[col]?.up.slice(start) ?? []
  if (start < 0 || run.length === 0 || !isRun(run)) return []

  return s.cols.flatMap((c, j) => {
    const last = c.up[c.up.length - 1]

    return j !== col && (last ? last.r === run[0]!.r + 1 : c.down.length === 0) ? [j] : []
  })
}

export function move(s: Spider, col: number, start: number, to: number): Spider {
  if (!targets(s, col, start).includes(to)) return s
  const from = s.cols[col]!
  const cols = s.cols.map((c, j) => {
    if (j === col) return { down: c.down, up: c.up.slice(0, start) }
    if (j === to) return { down: c.down, up: [...c.up, ...from.up.slice(start)] }

    return c
  })

  return settle({ ...s, cols })
}

export function lift(s: Spider, col: number, start: number): Spider {
  return targets(s, col, start).length > 0 ? { ...s, lift: { col, start } } : s
}

export const cancel = (s: Spider): Spider => ({ ...s, lift: null })

// One face-up card onto each column; refused when the stock is empty or any column is empty.
export function deal(s: Spider): Spider {
  if (s.stock.length === 0 || s.cols.some(c => c.up.length === 0)) return s
  const cols = s.cols.map((c, i) => ({ down: c.down, up: [...c.up, s.stock[i]!] }))

  return settle({ ...s, cols, stock: s.stock.slice(cols.length) })
}

export const isWon = (s: Spider) => s.done === 8
