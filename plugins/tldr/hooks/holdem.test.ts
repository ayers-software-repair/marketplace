// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import { act, deal, legal, newTable } from './holdem'
import { checkDown, dealt, rig } from './holdem-fixture'

test('heads-up: the button posts the small blind and acts first preflop, last after', () => {
  let h = dealt([100, 100])
  expect([h.button, h.seats[1]!.bet, h.seats[0]!.bet, h.turn]).toEqual([1, 1, 2, 1])
  expect(legal(h)).toEqual({ toCall: 1, canCheck: false, canRaise: true, minRaiseTo: 4, maxRaiseTo: 100 })
  h = act(h, { kind: 'call' }, Math.random)
  expect([h.turn, legal(h)!.canCheck, legal(h)!.canRaise]).toEqual([0, true, true])
  h = act(h, { kind: 'check' }, Math.random)
  expect([h.street, h.board.length, h.turn, h.pot]).toEqual(['flop', 3, 0, 4])
})

test('three-handed: first to act preflop is after the big blind, who keeps the option', () => {
  let h = dealt([100, 100, 100])
  expect([h.button, h.seats[2]!.bet, h.seats[0]!.bet, h.turn]).toEqual([1, 1, 2, 1])
  h = act(act(h, { kind: 'call' }, Math.random), { kind: 'call' }, Math.random)
  expect([h.turn, legal(h)!.canCheck, legal(h)!.canRaise]).toEqual([0, true, true])
  h = act(h, { kind: 'check' }, Math.random)
  expect([h.street, h.turn]).toEqual(['flop', 2])
})

test('a short big blind still leaves 2 to call', () => {
  const h = dealt([100, 100, 100, 1])
  expect([h.seats[3]!.bet, h.seats[3]!.allIn, h.turn, legal(h)!.toCall]).toEqual([1, true, 0, 2])
})

test('a raise adds at least the last raise; a short all-in does not reopen the betting', () => {
  let h = dealt([100, 100, 13])
  expect(act(h, { kind: 'raise', to: 3 }, Math.random).msg).toBe('Raise to between 4 and 100.')
  h = act(h, { kind: 'raise', to: 10 }, Math.random)
  expect(legal(h)!.minRaiseTo).toBe(13)
  h = act(h, { kind: 'allin' }, Math.random)
  expect([h.seats[2]!.last, h.level, legal(h)!.minRaiseTo, legal(h)!.canRaise]).toEqual(['All in', 13, 21, true])
  h = act(h, { kind: 'call' }, Math.random)
  expect([h.turn, legal(h)!.toCall, legal(h)!.canRaise]).toEqual([1, 3, false])
  expect(act(h, { kind: 'raise', to: 30 }, Math.random).msg).toBe('Raising is closed.')
  expect(act(h, { kind: 'allin' }, Math.random).seats).toEqual(h.seats)
  expect(act(h, { kind: 'call' }, Math.random).street).toBe('flop')
})

test('a full all-in raise reopens the betting', () => {
  let h = act(dealt([100, 100, 30]), { kind: 'raise', to: 10 }, Math.random)
  h = act(act(h, { kind: 'allin' }, Math.random), { kind: 'call' }, Math.random)
  expect([h.turn, legal(h)!.canRaise, legal(h)!.minRaiseTo]).toEqual([1, true, 50])
})

test('the short stack wins the main pot, another seat the side pot, the uncalled chips go back', () => {
  let h = rig(dealt([100, 150, 20]), ['KS KH', '2C 7D', 'AS AH'], '3C 8D 9H JS 4D')
  for (let i = 0; i < 3; i++) h = act(h, { kind: 'allin' }, Math.random)
  expect(h.pots).toEqual([
    { amount: 60, winners: [2], shares: [60], hand: 'Pair' },
    { amount: 160, winners: [0], shares: [160], hand: 'Pair' },
  ])
  expect([h.seats.map(s => s.chips), h.reveal, h.street, h.board.length]).toEqual([[160, 50, 60], [0, 1, 2], 'showdown', 5])
  expect(h.msg).toBe('Main pot: Bo wins 60 with Pair. Side pot: You win 160 with Pair.')
  const over = act(rig(dealt([150, 100, 20]), ['KS KH', '2C 7D', 'AS AH'], '3C 8D 9H JS 4D'), { kind: 'allin' }, Math.random)
  expect(act(act(over, { kind: 'allin' }, Math.random), { kind: 'allin' }, Math.random).msg).toBe('Raising is closed.')
})

test('a tie splits evenly and the odd chip goes to the first winner left of the button', () => {
  const even = checkDown(act(rig(dealt([100, 100]), ['2H 3D', '4C 5H'], '10S JS QS KS AS'), { kind: 'call' }, Math.random))
  expect([even.pots, even.seats.map(s => s.chips)]).toEqual([[{ amount: 4, winners: [0, 1], shares: [2, 2], hand: 'Royal Flush' }], [100, 100]])
  let h = rig(dealt([100, 100, 100]), ['2H 3D', '4C 5H', '6C 7C'], '10S JS QS KS AS')
  h = checkDown(act(act(h, { kind: 'call' }, Math.random), { kind: 'fold' }, Math.random))
  expect([h.pots[0]!.winners, h.pots[0]!.shares, h.seats.map(s => s.chips)]).toEqual([[0, 1], [3, 2], [101, 100, 99]])
  expect(h.reveal).toEqual([0, 1])
  let four = rig(dealt([100, 100, 100, 100]), ['2H 3D', '4C 5H', '6C 7C', '8D 9D'], '10S JS QS KS AS')
  four = checkDown(act(act(act(four, { kind: 'call' }, Math.random), { kind: 'call' }, Math.random), { kind: 'fold' }, Math.random))
  expect(four.pots).toEqual([{ amount: 7, winners: [3, 0, 1], shares: [3, 2, 2], hand: 'Royal Flush' }])
})

test('a hand won by everyone folding reveals nothing', () => {
  const h = act(dealt([100, 100]), { kind: 'fold' }, Math.random)
  expect([h.isOver, h.reveal, h.pots, h.seats.map(s => s.chips), h.msg]).toEqual([
    true, [], [{ amount: 2, winners: [0], shares: [2], hand: '' }], [101, 99], 'You win 2.',
  ])
})

test('deal refuses a short person and a hand in progress; legal is null on a bot turn', () => {
  expect(deal(newTable(1, 1, 100), Math.random).msg).toBe('Not enough chips for the big blind.')
  const h = dealt([100, 100, 100])
  expect(deal(h, Math.random).msg).toBe('Finish this hand first.')
  const botTurn = { ...h, seats: h.seats.map((s, i) => (i === h.turn ? { ...s, isBot: true } : s)) }
  expect(legal(botTurn)).toBe(null)
  expect(act(botTurn, { kind: 'fold' }, Math.random).msg).toBe('Not your turn.')
  expect(legal(newTable(2, 100, 100))).toBe(null)
})
