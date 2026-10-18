// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card, Dest, Solitaire, Source } from '../types'
import { SUITS, fresh, isRed, shuffle } from './deck'

const COLS = [0, 1, 2, 3, 4, 5, 6]

// Klondike, drawing one or three at a time: seven columns, the stock holds the other 24.
export function newGame(rnd: () => number, drawCount: 1 | 3 = 1): Solitaire {
  const d = shuffle(fresh(), rnd)
  let at = 0
  const cols = COLS.map(i => {
    const dealt = d.slice(at, at + i + 1)
    at += i + 1

    return { down: dealt.slice(0, i), up: dealt.slice(i) }
  })

  return { stock: d.slice(at), waste: [], cols, found: [0, 0, 0, 0], pick: null, drawCount }
}

// Turns the next one or three stock cards to the waste (the last turned on top); an empty stock takes the
// waste back, unlimited passes.
export function draw(s: Solitaire): Solitaire {
  if (s.stock.length === 0) return { ...s, stock: [...s.waste], waste: [], pick: null, lift: undefined }
  const n = s.drawCount ?? 1

  return { ...s, stock: s.stock.slice(n), waste: [...s.waste, ...s.stock.slice(0, n)], pick: null, lift: undefined }
}

const fits = (card: Card, onto: Card | undefined) =>
  onto ? isRed(card) !== isRed(onto) && card.r === onto.r - 1 : card.r === 13

const fitsFoundation = (s: Solitaire, c: Card) => s.found[SUITS.indexOf(c.s)] === c.r - 1

const pool = (s: Solitaire, src: Source): Card[] => (src === 'w' ? s.waste.slice(-1) : s.cols[src]!.up)

// Where the run from `start` (an index into the source's face-up cards; the waste has only its top) may go.
export function destsFrom(s: Solitaire, src: Source, start: number): Dest[] {
  const cards = pool(s, src)
  const card = cards[start]
  if (!card) return []
  const dests: Dest[] = []
  if (start === cards.length - 1 && fitsFoundation(s, card)) dests.push('f')
  for (const j of COLS) {
    const target = s.cols[j]!
    const isPointless = card.r === 13 && src !== 'w' && start === 0 && s.cols[src]!.down.length === 0
    if (j !== src && fits(card, target.up[target.up.length - 1]) && !(isPointless && target.up.length === 0)) dests.push(j)
  }

  return dests
}

// The deepest face-up run from this source that has a legal place to go, and those places.
export function moves(s: Solitaire, src: Source): { start: number; dests: Dest[] } | null {
  const cards = pool(s, src)
  for (let start = 0; start < cards.length; start++) {
    const dests = destsFrom(s, src, start)
    if (dests.length > 0) return { start, dests }
  }

  return null
}

// What is lifted: the source and the run's start, the one picked by hand or else the deepest that can move.
export function lifted(s: Solitaire): { src: Source; start: number; dests: Dest[] } | null {
  if (s.pick === null) return null
  const m = s.lift !== undefined ? { start: s.lift, dests: destsFrom(s, s.pick, s.lift) } : moves(s, s.pick)

  return m ? { src: s.pick, ...m } : null
}

function take(s: Solitaire, src: Source, start: number, dest: Dest): Solitaire {
  let waste = s.waste
  const cols = s.cols.map(c => ({ down: c.down, up: c.up }))
  const found = [...s.found]
  let taken: Card[]
  if (src === 'w') {
    taken = waste.slice(-1)
    waste = waste.slice(0, -1)
  } else {
    const c = cols[src]!
    taken = c.up.slice(start)
    c.up = c.up.slice(0, start)
    if (c.up.length === 0 && c.down.length > 0) {
      c.up = c.down.slice(-1)
      c.down = c.down.slice(0, -1)
    }
  }
  if (dest === 'f') {
    found[SUITS.indexOf(taken[0]!.s)] = taken[0]!.r
  } else {
    cols[dest]!.up = [...cols[dest]!.up, ...taken]
  }

  return { ...s, waste, cols, found, pick: null, lift: undefined }
}

// Moves what is lifted from `src` (or, with nothing lifted there, the deepest run that can go) to `dest`.
export function move(s: Solitaire, src: Source, dest: Dest): Solitaire {
  const l = lifted(s)
  const m = l && l.src === src ? l : moves(s, src)

  return m && m.dests.includes(dest) ? take(s, src, m.start, dest) : s
}

// Moves the run from `start` exactly: a drag or a click on a chosen card.
export function moveFrom(s: Solitaire, src: Source, start: number, dest: Dest): Solitaire {
  return destsFrom(s, src, start).includes(dest) ? take(s, src, start, dest) : s
}

export function pick(s: Solitaire, src: Source): Solitaire {
  return moves(s, src) ? { ...s, pick: src, lift: undefined } : s
}

// Lifts the run from a chosen face-up card, when it has somewhere to go.
export function pickAt(s: Solitaire, src: Source, start: number): Solitaire {
  return destsFrom(s, src, start).length > 0 ? { ...s, pick: src, lift: start } : s
}

export const cancel = (s: Solitaire): Solitaire => ({ ...s, pick: null, lift: undefined })

// The top card of a pile to its foundation, when it fits: a double-click.
export function home(s: Solitaire, src: Source): Solitaire {
  const top = pool(s, src).length - 1

  return top >= 0 ? moveFrom(s, src, top, 'f') : s
}

// Sends every card that can go to a foundation, repeatedly.
export function auto(s: Solitaire): Solitaire {
  let cur = s
  let moved = true
  while (moved) {
    moved = false
    for (const src of ['w' as Source, ...COLS]) {
      const cards = pool(cur, src)
      const top = cards[cards.length - 1]
      if (top && fitsFoundation(cur, top)) {
        cur = take(cur, src, cards.length - 1, 'f')
        moved = true
      }
    }
  }

  return cur
}

export const isWon = (s: Solitaire) => s.found.every(n => n === 13)
