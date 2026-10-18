// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import type { Card, Suit, Table } from '../types'
import { blackjack } from './game-blackjack'
import { freecell } from './game-freecell'
import { holdem } from './game-holdem'
import { menu } from './game-menu'
import { poker } from './game-poker'
import { solitaire } from './game-solitaire'
import { newTable } from './holdem'
import { klondike } from './table-fixture'
import { FRESH, normalize } from './table-state'

const c = (r: number, s: Suit): Card => ({ r, s })
const rnd = () => 0.5

test('a click lifts the card and the run below it; a click on a legal column drops it there', () => {
  const lifted = solitaire.point(klondike(), { act: 'click', id: 'c0:0' }, rnd)
  expect(lifted.sol!.pick).toBe(0)
  expect(lifted.sol!.lift).toBe(0)
  const dropped = solitaire.point(lifted, { act: 'click', id: 'c1:0' }, rnd)
  expect(dropped.sol!.cols[1]!.up).toEqual([c(8, 'S'), c(7, 'H'), c(6, 'S')])
  expect(dropped.sol!.cols[0]!.up).toEqual([c(9, 'C')])
  expect(dropped.sol!.pick).toBe(null)
})

test('a click on the lifted run puts it back, and a card with nowhere to go is not lifted', () => {
  const lifted = solitaire.point(klondike(), { act: 'click', id: 'c0:0' }, rnd)
  expect(solitaire.point(lifted, { act: 'click', id: 'c0:1' }, rnd).sol!.pick).toBe(null)
  const t = klondike()
  expect(solitaire.point(t, { act: 'click', id: 'c0:1' }, rnd)).toBe(t)
})

test('a drag dropped on a legal pile moves; one dropped where it may not go leaves the table as it was', () => {
  const t = klondike()
  const moved = solitaire.point(t, { act: 'drop', id: 'c0:0', to: 'c1' }, rnd)
  expect(moved.sol!.cols[1]!.up.length).toBe(3)
  expect(solitaire.point(t, { act: 'drop', id: 'c0:0', to: 'c3' }, rnd)).toBe(t)
  expect(solitaire.point(t, { act: 'drop', id: 'c0:1', to: 'c2' }, rnd)).toBe(t)
  const home = solitaire.point(t, { act: 'drop', id: 'waste', to: 'f2' }, rnd)
  expect(home.sol!.found).toEqual([0, 0, 1, 0])
})

test('a double-click sends the top card home; the stock draws on a click', () => {
  const t = klondike()
  expect(solitaire.point(t, { act: 'double', id: 'waste' }, rnd).sol!.found[2]).toBe(1)
  const drawn = solitaire.point(t, { act: 'click', id: 'stock' }, rnd)
  expect(drawn.sol!.waste.map(x => x.r)).toEqual([1, 2])
  const three = solitaire.point(klondike({ stock: [c(2, 'C'), c(3, 'C'), c(4, 'C'), c(5, 'C')], drawCount: 3 }), { act: 'click', id: 'stock' }, rnd)
  expect(three.sol!.waste.length).toBe(4)
  expect(three.sol!.stock.length).toBe(1)
})

test('a double-click sends a card home only from the top of its pile, in Klondike and in FreeCell', () => {
  const k = klondike({ found: [5, 0, 0, 0] })
  const lifted = solitaire.point(k, { act: 'click', id: 'c0:0' }, rnd)
  const deep = solitaire.point(lifted, { act: 'double', id: 'c0:0' }, rnd)
  expect(deep.sol!.found).toEqual([5, 0, 0, 0])
  expect(deep.sol!.pick).toBe(null)
  expect(solitaire.point(k, { act: 'double', id: 'c0:1' }, rnd).sol!.found).toEqual([6, 0, 0, 0])
  const cols = [[c(7, 'H'), c(6, 'S')], [], [], [], [], [], [], []]
  const f: Table = { ...FRESH, view: 'game', game: 'freecell', fc: { cols, cells: [c(1, 'H'), null, null, null], found: [5, 0, 0, 0], lift: null } }
  expect(freecell.point(f, { act: 'double', id: 'c0:0' }, rnd).fc!.found).toEqual([5, 0, 0, 0])
  expect(freecell.point(f, { act: 'double', id: 'c0:1' }, rnd).fc!.found).toEqual([6, 0, 0, 0])
  expect(freecell.point(f, { act: 'double', id: 'x0' }, rnd).fc!.found).toEqual([5, 1, 0, 0])
})

test('Hold\'em offers New Chips between hands once the balance cannot cover the big blind', () => {
  const t: Table = { ...FRESH, view: 'game', game: 'holdem', chips: 1.5, he: newTable(2, 1, 100) }
  expect(holdem.controls(t).some(x => x.key === 'chips')).toBe(true)
  expect(holdem.controls({ ...t, chips: 2 }).some(x => x.key === 'chips')).toBe(false)
})

test('a click on a poker card holds it and a second click lets it go, only while the hand is live', () => {
  const vp = { deck: [], hand: [c(2, 'S'), c(5, 'H'), c(9, 'D'), c(11, 'C'), c(13, 'S')], held: [false, false, false, false, false], isOver: false, bet: 5 }
  const t: Table = { ...FRESH, view: 'game', game: 'poker', vp }
  const held = poker.point(t, { act: 'click', id: 'card:2' }, rnd)
  expect(held.vp!.held).toEqual([false, false, true, false, false])
  expect(poker.point(held, { act: 'click', id: 'card:2' }, rnd).vp!.held).toEqual([false, false, false, false, false])
  const over: Table = { ...t, vp: { ...vp, isOver: true } }
  expect(poker.point(over, { act: 'click', id: 'card:2' }, rnd)).toBe(over)
  expect(poker.scene(held, { cols: 76, rows: 18, mouse: true }).sprites.find(s => s.id === 'card:2')!.rows![0]!.tone).toBe('redLit')
})

test('between hands a chip click raises the bet and a bet click takes the top chip back; in a hand they do nothing', () => {
  const t: Table = { ...FRESH, view: 'game', game: 'blackjack', chips: 100, bet: 5 }
  const more = blackjack.point(t, { act: 'click', id: 'chip:25' }, rnd)
  expect(more.bet).toBe(30)
  expect(blackjack.point(more, { act: 'click', id: 'bet' }, rnd).bet).toBe(25)
  expect(blackjack.point({ ...t, bet: 90 }, { act: 'click', id: 'chip:25' }, rnd).bet).toBe(90)
  const live: Table = { ...t, bj: { deck: [], player: [c(9, 'S'), c(5, 'H')], dealer: [c(10, 'D'), c(6, 'C')], bet: 5, isOver: false } }
  expect(blackjack.point(live, { act: 'click', id: 'chip:25' }, rnd)).toBe(live)
})

test('a deal stakes the bet, a win pays on it, and the bet is kept between hands', () => {
  const t: Table = { ...FRESH, view: 'game', game: 'blackjack', chips: 100, bet: 20 }
  const dealt = blackjack.controls(t).find(x => x.key === 'deal')!.run(t, rnd)
  expect(dealt.bj!.bet).toBe(20)
  expect(dealt.bet).toBe(20)
  const stand = blackjack.controls(dealt).find(x => x.key === 'stand')
  const done = stand ? stand.run(dealt, rnd) : dealt
  expect([60, 80, 100, 120, 130].includes(done.chips)).toBe(true)
  expect(done.bet).toBe(Math.min(20, done.chips))
})

test('the menu starts a game by tile, and each option steps and applies at once', () => {
  const started = menu.point(FRESH, { act: 'click', id: 'play:freecell' }, Math.random)
  expect(started.view).toBe('game')
  expect(started.game).toBe('freecell')
  expect(started.fc!.cols.length).toBe(8)
  const opts = ['opt:back', 'opt:felt', 'opt:draw', 'opt:refill'].reduce((t, id) => menu.point(t, { act: 'click', id }, rnd), { ...FRESH, sol: klondike().sol })
  expect(opts.opts).toEqual({ back: 1, felt: 'blue', drawCount: 3, refill: 250 })
  expect(opts.sol!.drawCount).toBe(3)
})

test('a table stored by an older build reads with every new field, and the bet within the balance', () => {
  const old = { view: 'menu', game: 'blackjack', chips: 3, msg: 'x', bj: null, vp: null, hl: null, sol: null } as unknown as Table
  const t = normalize(old)
  expect(t.bet).toBe(3)
  expect(t.opts).toEqual({ back: 0, felt: 'green', drawCount: 1, refill: 100 })
  expect([t.fc, t.sp, t.py, t.he, t.bac, t.war]).toEqual([null, null, null, null, null, null])
  expect(normalize({ ...old, game: 'chess', opts: { felt: 'purple' } } as unknown as Table).game).toBe('solitaire')
  expect(normalize(undefined).chips).toBe(100)
})
