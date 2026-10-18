// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import type { Holdem, HoldemAction } from '../types'
import { act, botView, deal, legal, newTable } from './holdem'
import { type BotView, decide } from './holdem-bot'
import { cards, dealt, seeded, total } from './holdem-fixture'

const view = (over: Partial<BotView>): BotView => ({
  hole: cards('7S 2D'), board: [], pot: 0, bets: [1, 2, 0], level: 2, stack: 100,
  toCall: 2, canCheck: false, canRaise: true, minRaiseTo: 4, maxRaiseTo: 100, ...over,
})
const always = (x: number) => () => x

test('the bot sees only its own cards, the board and the betting', () => {
  const h = dealt([100, 100, 100])
  expect(Object.keys(botView(h, 1)).sort()).toEqual(
    ['bets', 'board', 'canCheck', 'canRaise', 'hole', 'level', 'maxRaiseTo', 'minRaiseTo', 'pot', 'stack', 'toCall'],
  )
  const other = { ...h, deck: [...h.deck].reverse(), seats: h.seats.map((s, i) => (i === 1 ? s : { ...s, hole: cards('AS AH') })) }
  for (let seed = 1; seed < 30; seed++) expect(decide(botView(other, 1), seeded(seed))).toEqual(decide(botView(h, 1), seeded(seed)))
})

test('strong hands raise, weak hands fold to a bet and check for free', () => {
  expect(decide(view({ hole: cards('AS AH') }), always(0.5))).toEqual({ kind: 'raise', to: 4 })
  expect(decide(view({ hole: cards('AS AH'), pot: 40, bets: [0, 0, 0], level: 0, toCall: 0, canCheck: true }), always(0.5))).toEqual({ kind: 'raise', to: 30 })
  expect(decide(view({ hole: cards('AS AH'), maxRaiseTo: 3 }), always(0.5))).toEqual({ kind: 'allin' })
  expect(decide(view({}), always(0.5))).toEqual({ kind: 'fold' })
  expect(decide(view({ toCall: 0, canCheck: true }), always(0.5))).toEqual({ kind: 'check' })
  expect(decide(view({ toCall: 0, canCheck: true }), always(0.01)).kind).toBe('raise')
})

test('medium hands call at a fair price and fold at a bad one', () => {
  const pair = { hole: cards('9S 4D'), board: cards('9H KC 2D'), pot: 20 }
  expect(decide(view({ ...pair, bets: [5, 0, 0], level: 5, toCall: 5 }), always(0.5))).toEqual({ kind: 'call' })
  expect(decide(view({ ...pair, bets: [40, 0, 0], level: 40, toCall: 40 }), always(0.5))).toEqual({ kind: 'fold' })
  const draw = { hole: cards('8S 9S'), board: cards('10H JC 2D'), pot: 20, bets: [5, 0, 0], level: 5, toCall: 5 }
  expect(decide(view(draw), always(0.5))).toEqual({ kind: 'call' })
})

// The person picks a random legal action so all-ins and side pots come up.
function personMove(h: Holdem, r: () => number): HoldemAction {
  const l = legal(h)!
  const x = r()
  if (x < 0.15 && !l.canCheck) return { kind: 'fold' }
  if (x < 0.6 || !l.canRaise) return { kind: l.canCheck ? 'check' : 'call' }
  if (x < 0.85) return { kind: 'raise', to: l.minRaiseTo + Math.floor(r() * (l.maxRaiseTo - l.minRaiseTo + 1)) }

  return { kind: 'allin' }
}

test('chips are conserved through every hand and bots rebuy', () => {
  const r = seeded(11)
  let h = newTable(3, 100, 100)
  let sidePots = 0
  for (let hand = 0; hand < 300; hand++) {
    if (h.seats[0]!.chips < 2) h = newTable(3, 100, 100)
    h = deal(h, r)
    const start = total(h)
    for (let step = 0; !h.isOver && step < 200; step++) h = act(h, personMove(h, r), r)
    expect([h.isOver, total(h)]).toEqual([true, start])
    expect(h.seats.every(s => s.chips >= 0 && s.bet === 0)).toBe(true)
    if (h.pots.length > 1) sidePots++
  }
  expect(sidePots).toBeGreaterThan(0)
})
