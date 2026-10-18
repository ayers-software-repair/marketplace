// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import type { Blackjack, Card, Poker, Solitaire, Suit } from '../types'
import { double, deal as bjDeal, hit, stand, value } from './blackjack'
import { fresh, shuffle } from './deck'
import { guess } from './hilo'
import { PAYS, deal as vpDeal, draw as vpDraw, rank, toggle } from './poker'
import { auto, draw as solDraw, isWon, move, moves, newGame, pick } from './solitaire'

const c = (r: number, s: Suit = 'S'): Card => ({ r, s })
const seeded = () => {
  let x = 7

  return () => {
    x = (x * 16807) % 2147483647

    return x / 2147483647
  }
}

test('shuffle keeps 52 distinct cards and is deterministic for a seed', () => {
  const a = shuffle(fresh(), seeded())
  const b = shuffle(fresh(), seeded())
  expect(a.length).toBe(52)
  expect(new Set(a.map(x => x.r + x.s)).size).toBe(52)
  expect(a).toEqual(b)
})

test('hand values count soft aces and drop them when they would bust', () => {
  expect(value([c(1), c(6)])).toEqual({ total: 17, soft: true })
  expect(value([c(1), c(6), c(10)])).toEqual({ total: 17, soft: false })
  expect(value([c(1), c(1), c(9)])).toEqual({ total: 21, soft: true })
  expect(value([c(13), c(12), c(5)]).total).toBe(25)
})

const hand = (player: Card[], dealer: Card[], deck: Card[]): Blackjack => ({ player, dealer, deck, bet: 5, isOver: false })

test('dealer draws to 17 and stands on soft 17', () => {
  const soft = stand(hand([c(10), c(9)], [c(1), c(6)], [c(5)]), 95)
  expect(soft.s.dealer.length).toBe(2)
  expect(soft.chips).toBe(105)
  const draws = stand(hand([c(10), c(9)], [c(10), c(6)], [c(5)]), 95)
  expect(draws.s.dealer.length).toBe(3)
  expect(draws.msg).toBe('Dealer wins. You lose 5.')
  const busts = stand(hand([c(10), c(2)], [c(10), c(6)], [c(10)]), 95)
  expect(busts.msg).toBe('Dealer busts. You win 5.')
  expect(busts.chips).toBe(105)
})

test('hit busts, double doubles the bet, push returns it', () => {
  const bust = hit(hand([c(10), c(6)], [c(10), c(7)], [c(10)]), 95)
  expect(bust.s.isOver).toBe(true)
  expect(bust.chips).toBe(95)
  const dbl = double(hand([c(5), c(6)], [c(10), c(7)], [c(10), c(2)]), 95)
  expect(dbl.s.player.length).toBe(3)
  expect(dbl.chips).toBe(95 - 5 + 20)
  expect(double(hand([c(5), c(6)], [c(10), c(7)], [c(10)]), 2).msg).toBe('Not enough chips to double.')
  expect(stand(hand([c(10), c(7)], [c(10), c(7)], []), 95).chips).toBe(100)
})

test('blackjack pays 3:2 and a deal never takes the balance below zero', () => {
  let found = false
  for (let seed = 1; seed < 400 && !found; seed++) {
    let x = seed
    const r = () => ((x = (x * 16807) % 2147483647) / 2147483647)
    const t = bjDeal(100, r)
    if (t.msg === 'Blackjack. You win 7.5.') {
      expect(t.chips).toBe(107.5)
      found = true
    }
  }
  expect(found).toBe(true)
  const broke = bjDeal(4, Math.random)
  expect(broke.s).toBe(null)
  expect(broke.chips).toBe(4)
})

const h5 = (...cards: [number, Suit][]) => cards.map(([r, s]) => c(r, s))

test('every poker hand ranks and pays on the 9/6 table', () => {
  expect(rank(h5([1, 'S'], [13, 'S'], [12, 'S'], [11, 'S'], [10, 'S']))).toBe('Royal Flush')
  expect(rank(h5([5, 'H'], [6, 'H'], [7, 'H'], [8, 'H'], [9, 'H']))).toBe('Straight Flush')
  expect(rank(h5([4, 'H'], [4, 'S'], [4, 'D'], [4, 'C'], [9, 'H']))).toBe('Four of a Kind')
  expect(rank(h5([4, 'H'], [4, 'S'], [4, 'D'], [9, 'C'], [9, 'H']))).toBe('Full House')
  expect(rank(h5([2, 'H'], [6, 'H'], [7, 'H'], [8, 'H'], [13, 'H']))).toBe('Flush')
  expect(rank(h5([1, 'H'], [2, 'S'], [3, 'D'], [4, 'C'], [5, 'H']))).toBe('Straight')
  expect(rank(h5([10, 'H'], [11, 'S'], [12, 'D'], [13, 'C'], [1, 'H']))).toBe('Straight')
  expect(rank(h5([4, 'H'], [4, 'S'], [4, 'D'], [8, 'C'], [9, 'H']))).toBe('Three of a Kind')
  expect(rank(h5([4, 'H'], [4, 'S'], [9, 'D'], [9, 'C'], [2, 'H']))).toBe('Two Pair')
  expect(rank(h5([11, 'H'], [11, 'S'], [9, 'D'], [3, 'C'], [2, 'H']))).toBe('Jacks or Better')
  expect(rank(h5([1, 'H'], [1, 'S'], [9, 'D'], [3, 'C'], [2, 'H']))).toBe('Jacks or Better')
  expect(rank(h5([10, 'H'], [10, 'S'], [9, 'D'], [3, 'C'], [2, 'H']))).toBe(undefined)
  expect(rank(h5([12, 'H'], [13, 'S'], [1, 'D'], [2, 'C'], [3, 'H']))).toBe(undefined)
  expect([PAYS['Royal Flush'], PAYS['Straight Flush'], PAYS['Four of a Kind'], PAYS['Full House'], PAYS['Flush'], PAYS['Straight'], PAYS['Three of a Kind'], PAYS['Two Pair'], PAYS['Jacks or Better']]).toEqual([250, 50, 25, 9, 6, 4, 3, 2, 1])
})

test('poker draw replaces only the cards not held and pays the rank', () => {
  const p: Poker = {
    deck: h5([11, 'D'], [9, 'D'], [2, 'D']),
    hand: h5([11, 'H'], [11, 'S'], [3, 'C'], [5, 'C'], [7, 'C']),
    held: [false, false, false, false, false],
    isOver: false,
  }
  const held = toggle(toggle(p, 0), 1)
  expect(held.held).toEqual([true, true, false, false, false])
  const t = vpDraw(held, 95)
  expect(t.s.hand.map(x => x.r)).toEqual([11, 11, 11, 9, 2])
  expect(t.msg).toBe('Three of a Kind. Pays 15.')
  expect(t.chips).toBe(110)
  expect(toggle(t.s, 2).held).toEqual(held.held)
  expect(vpDeal(3, Math.random).s).toBe(null)
  expect(vpDeal(100, Math.random).chips).toBe(95)
})

test('hi-lo: right pays double, a tie loses, the balance stops at the bet', () => {
  const base = { deck: [c(9), c(5), c(5)], current: c(5), streak: 2 }
  const right = guess(base, 100, true, Math.random)
  expect(right.chips).toBe(105)
  expect(right.s.streak).toBe(3)
  const tie = guess({ ...base, deck: [c(5)] }, 100, true, Math.random)
  expect(tie.chips).toBe(95)
  expect(tie.s.streak).toBe(0)
  expect(tie.msg).toBe('Tie loses. You lose 5.')
  const lowTie = guess({ ...base, deck: [c(5)] }, 100, false, Math.random)
  expect(lowTie.chips).toBe(95)
  expect(guess(base, 4, true, Math.random).chips).toBe(4)
})

const col = (down: Card[], up: Card[]) => ({ down, up })
const empty = () => [0, 1, 2, 3, 4, 5, 6].map(() => col([], []))
const game = (cols: ReturnType<typeof empty>, extra: Partial<Solitaire> = {}): Solitaire => ({
  stock: [],
  waste: [],
  cols,
  found: [0, 0, 0, 0],
  pick: null,
  ...extra,
})

test('solitaire deals 28 to the columns and 24 to the stock, and draw cycles with unlimited passes', () => {
  const s = newGame(seeded())
  expect(s.cols.map(x => x.down.length + x.up.length)).toEqual([1, 2, 3, 4, 5, 6, 7])
  expect(s.stock.length).toBe(24)
  const one = solDraw(s)
  expect(one.waste.length).toBe(1)
  let cur = s
  for (let i = 0; i < 24; i++) cur = solDraw(cur)
  expect(cur.stock.length).toBe(0)
  const again = solDraw(cur)
  expect(again.stock).toEqual(s.stock)
  expect(again.waste.length).toBe(0)
})

test('solitaire legal moves, a run move, turning a card up, and kings to empty columns', () => {
  const cols = empty()
  cols[0] = col([c(9, 'C')], [c(7, 'H'), c(6, 'S')])
  cols[1] = col([], [c(8, 'S')])
  cols[2] = col([], [c(13, 'H')])
  const s = game(cols)
  const m = moves(s, 0)
  expect(m).toEqual({ start: 0, dests: [1] })
  const after = move(s, 0, 1)
  expect(after.cols[1]!.up).toEqual([c(8, 'S'), c(7, 'H'), c(6, 'S')])
  expect(after.cols[0]!.up).toEqual([c(9, 'C')])
  expect(after.cols[0]!.down).toEqual([])
  expect(move(s, 0, 3)).toEqual(s)
  expect(pick(s, 3).pick).toBe(null)
  expect(pick(s, 0).pick).toBe(0)
  expect(moves(s, 2)).toEqual(null)
  const ace = game(empty(), { waste: [c(1, 'D')] })
  expect(moves(ace, 'w')).toEqual({ start: 0, dests: ['f'] })
})

test('solitaire takes a shorter run when the whole run cannot move, and auto fills foundations to a win', () => {
  const cols = empty()
  cols[0] = col([], [c(9, 'S'), c(8, 'H'), c(7, 'H')])
  cols[1] = col([], [c(8, 'C')])
  expect(moves(game(cols), 0)).toEqual({ start: 2, dests: [1] })
  expect(moves(game(cols), 0)!.start).toBe(2)
  const near = game([...empty().slice(0, 6), col([], [c(13, 'C')])], { found: [13, 13, 13, 12], waste: [] })
  const won = auto(near)
  expect(won.found).toEqual([13, 13, 13, 13])
  expect(isWon(won)).toBe(true)
  expect(isWon(near)).toBe(false)
})
