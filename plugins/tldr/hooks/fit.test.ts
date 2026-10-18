// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import type { Card, Table } from '../types'
import * as bac from './baccarat'
import * as bj from './blackjack'
import { BOTTOM_ROWS, bottom, column } from './bottom'
import { fresh } from './deck'
import * as fc from './freecell'
import * as he from './holdem'
import * as hl from './hilo'
import { paneLayout } from './pane-layout'
import * as vp from './poker'
import * as py from './pyramid'
import { barRows } from './screen'
import * as sol from './solitaire'
import * as sp from './spider'
import { FRESH } from './table-state'
import * as wr from './war'

const seeded = (seed: number) => {
  let x = seed

  return () => ((x = (x * 16807) % 2147483647) / 2147483647)
}

const run = (from: number, to: number, suits: Card['s'][]): Card[] => Array.from({ length: from - to + 1 }, (_, i) => ({ r: from - i, s: suits[i % suits.length]! }))

// Every screen, fresh and at its tallest: Klondike and FreeCell with a King-to-Two run on six face-down cards,
// Spider after four deals, every betting table mid-hand.
function screens(): [string, Table][] {
  const r = seeded(11)
  const at = (game: Table['game'], more: Partial<Table>): Table => ({ ...FRESH, view: 'game', game, ...more })
  const k = sol.newGame(r)
  const tallK = { ...k, cols: k.cols.map((c, i) => (i === 6 ? { down: fresh().slice(0, 6), up: run(13, 2, ['S', 'H']) } : c)) }
  const f = fc.newGame(r)
  const tallF = { ...f, cols: f.cols.map((c, i) => (i === 0 ? [...c, ...run(13, 2, ['S', 'H'])] : c)) }
  let s = sp.newGame(r, 2)
  for (let i = 0; i < 4; i++) s = sp.deal(s)
  // Every column a long run of one suit ending a rank above another column's: nearly every card can be dragged.
  const longRuns = { ...s, cols: s.cols.map((c, j) => ({ down: c.down, up: run(13, j + 2, ['S']) })) }
  const holdem = he.deal(he.newTable(3, 100, 100), r)

  return [
    ['menu', FRESH],
    ['klondike', at('solitaire', { sol: k })],
    ['klondike tall', at('solitaire', { sol: tallK })],
    ['freecell', at('freecell', { fc: f })],
    ['freecell tall', at('freecell', { fc: tallF })],
    ['spider', at('spider', { sp: sp.newGame(r, 1) })],
    ['spider dealt', at('spider', { sp: s })],
    ['spider long runs', at('spider', { sp: longRuns })],
    ['pyramid', at('pyramid', { py: py.newGame(r) })],
    ['blackjack', at('blackjack', { bj: bj.deal(100, r, 5).s })],
    ['poker', at('poker', { vp: vp.deal(100, r, 5).s })],
    ['holdem', at('holdem', { he: holdem })],
    ['baccarat', at('baccarat', { bac: bac.deal(100, 'banker', 5, r).s })],
    ['hilo', at('hilo', { hl: hl.start(r) })],
    ['war', at('war', { war: wr.open([{ r: 9, s: 'S' }, { r: 9, s: 'H' }, ...fresh()], 100, 5).s })],
    ['blackjack empty', at('blackjack', {})],
  ]
}

const HELD = [
  'YOU: approve the push of the release branch to origin once the gate is green',
  'YOU: pick the felt colour',
  'Merged the mouse play for Klondike and FreeCell',
  'The bottom row is pinned under the table',
  'Nothing is pushed',
]

test('every screen fits the pane at 24, 30 and 40 rows by 80 and 120 columns, the bottom row always on it', () => {
  for (const rows of [24, 30, 40]) {
    for (const terminal of [80, 120]) {
      const cols = terminal - 2
      for (const mouse of [true, false]) {
        for (const [name, t] of screens()) {
          const where = name + ' at ' + terminal + 'x' + rows + (mouse ? ' with the mouse' : '')
          const l = paneLayout(t, HELD, cols, rows, mouse)
          expect([where, l.low.height >= 3 && l.low.height <= BOTTOM_ROWS]).toEqual([where, true])
          expect([where, l.tableRows + l.low.height <= rows]).toEqual([where, true])
          expect([where, l.room.rows + 1 + barRows(l.controls, cols - 2) <= l.tableRows]).toEqual([where, true])
          for (const s of l.scene.sprites.filter(x => x.rows && x.rows.length > 0)) {
            const inside = s.x >= 0 && s.y >= 0 && s.x + s.w <= l.scene.w && s.y + s.rows!.length <= l.scene.h
            expect([where, s.id, s.rows![0]!.text, inside]).toEqual([where, s.id, s.rows![0]!.text, true])
          }
        }
      }
    }
  }
})

test('the scene a table hands the mouse module stays under its 100000-character limit at its tallest', () => {
  for (const [rows, terminal] of [[24, 80], [40, 120], [60, 200]] as const) {
    for (const [name, t] of screens()) {
      const l = paneLayout(t, HELD, terminal - 2, rows, true)
      const size = JSON.stringify({ scene: l.scene, theme: { felt: t.opts.felt, back: t.opts.back } }).length
      expect([name, terminal, rows, size < 100000]).toEqual([name, terminal, rows, true])
    }
  }
})

test('the bottom row wraps each column, ends with "+N more" when it holds more, and stacks when narrow', () => {
  const many = column('TL;DR', ['one two three four five six', 'b', 'c', 'd', 'e'], 'fact', '-', 12, 5)
  expect(many.map(l => l.text)).toEqual(['TL;DR', 'one two', 'three four', 'five six', '+4 more'])
  const cut = column('TL;DR', ['one two three four five six seven eight'], 'fact', '-', 12, 3)
  expect(cut.map(l => l.text)).toEqual(['TL;DR', 'one two', 'three four…'])
  const two = bottom(HELD, 78)
  expect(two.isStacked).toBe(false)
  expect(two.columns[0]![0]!.text).toBe('WAITING ON YOU')
  expect(two.columns[1]![0]!.text).toBe('TL;DR')
  expect(two.columns[1]![1]!.text.startsWith('• Merged')).toBe(true)
  expect(bottom([], 78).columns[0]![1]!.text).toBe('Nothing is waiting on you.')
  const narrow = bottom(HELD, 40)
  expect(narrow.isStacked).toBe(true)
  expect(narrow.height).toBeLessThanOrEqual(BOTTOM_ROWS)
})
