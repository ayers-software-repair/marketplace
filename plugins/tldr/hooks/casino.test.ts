// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import type { Baccarat, BacBet, Card, War } from '../types'
import { deal as bacDeal, play, settle, total } from './baccarat'
import { fresh } from './deck'
import { deal as warDeal, open, surrender, war } from './war'

const c = (r: number): Card => ({ r, s: 'S' })
const cs = (...rs: number[]) => rs.map(c)
const seeded = () => {
  let x = 11

  return () => {
    x = (x * 16807) % 2147483647

    return x / 2147483647
  }
}

test('baccarat totals are the pip sum mod 10 with court cards worth 0', () => {
  expect(total(cs(1, 9))).toBe(0)
  expect(total(cs(10, 13, 12))).toBe(0)
  expect(total(cs(7, 8))).toBe(5)
})

test('naturals stand: no third card for either hand', () => {
  for (const [p, b] of [[cs(4, 4), cs(2, 2)], [cs(2, 2), cs(5, 4)], [cs(5, 4), cs(5, 4)]]) {
    const r = play(p!, b!, cs(1, 1))
    expect(r.player.length).toBe(2)
    expect(r.banker.length).toBe(2)
  }
})

test('player draws on 0-5 and stands on 6-7', () => {
  expect(play(cs(2, 3), cs(10, 10), cs(1, 1)).player.length).toBe(3)
  expect(play(cs(10, 10), cs(10, 10), cs(1, 1)).player.length).toBe(3)
  expect(play(cs(3, 3), cs(10, 10), cs(1, 1)).player.length).toBe(2)
  expect(play(cs(3, 4), cs(10, 10), cs(1, 1)).player.length).toBe(2)
})

test('banker after a standing player draws on 0-5 and stands on 6-7', () => {
  for (let b = 0; b <= 7; b++) {
    const r = play(cs(3, 4), cs(b, 0), cs(1))
    expect(r.banker.length).toBe(b <= 5 ? 3 : 2)
  }
})

// Player starts on 1 (draws), banker on `b`; p is the Player's third card value.
const bankerDrew = (b: number, p: number) => play(cs(1, 0), cs(b, 0), cs(p === 0 ? 10 : p, 1)).banker.length === 3

test('banker third-card table after a player draw', () => {
  const rows: Record<number, number[]> = {
    0: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    2: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    3: [0, 1, 2, 3, 4, 5, 6, 7, 9],
    4: [2, 3, 4, 5, 6, 7],
    5: [4, 5, 6, 7],
    6: [6, 7],
    7: [],
  }
  for (const [b, draws] of Object.entries(rows)) {
    for (let p = 0; p <= 9; p++) {
      // A player third card that makes a natural is irrelevant: naturals are checked on two cards only.
      expect(bankerDrew(Number(b), p)).toBe(draws.includes(p))
    }
  }
})

const hand = (player: Card[], banker: Card[], on: BacBet, stake = 10): Baccarat => ({ player, banker, on, stake, isOver: false })

test('baccarat payouts', () => {
  const pw = [cs(5, 3), cs(2, 3)]
  const bw = [cs(2, 3), cs(5, 3)]
  expect(settle(hand(pw[0]!, pw[1]!, 'player'), 90).chips).toBe(110)
  expect(settle(hand(bw[0]!, bw[1]!, 'banker'), 90).chips).toBe(110)
  expect(settle(hand(pw[0]!, pw[1]!, 'banker'), 90).chips).toBe(90)
  expect(settle(hand(pw[0]!, pw[1]!, 'tie'), 90).chips).toBe(90)
  // Banker wins on 6: half the stake.
  const six = settle(hand(cs(2, 3), cs(2, 4), 'banker'), 90)
  expect(six.chips).toBe(105)
  expect(six.msg).toBe('Banker wins with 6. You win 5.')
  // Tie pays 8:1; player and banker bets push.
  const tie = [cs(3, 3), cs(2, 4)]
  expect(settle(hand(tie[0]!, tie[1]!, 'tie'), 90).chips).toBe(180)
  expect(settle(hand(tie[0]!, tie[1]!, 'player'), 90).chips).toBe(100)
  expect(settle(hand(tie[0]!, tie[1]!, 'banker'), 90).chips).toBe(100)
  expect(settle(hand(pw[0]!, pw[1]!, 'player', 0.5), 9.5).chips).toBe(10.5)
})

test('baccarat deal takes the stake and refuses what it cannot cover', () => {
  const r = bacDeal(100, 'player', 10, seeded())
  expect(r.s!.isOver).toBe(true)
  expect([80, 90, 100, 110]).toContain(r.chips)
  for (const bad of [0, 0.5, 101]) {
    const x = bacDeal(100, 'banker', bad, seeded())
    expect(x.s).toBe(null)
    expect(x.chips).toBe(100)
  }
  expect(bacDeal(100, 'tie', 100, seeded()).s).not.toBe(null)
})

const warHand = (deck: Card[]): War => ({ deck, mine: c(5), theirs: c(5), stake: 10, phase: 'tie', burned: 0 })
// deck after the tie: three burned, then mine, theirs.
const warDeck = (mine: number, theirs: number) => cs(2, 3, 4, mine, theirs)

test('war deal: win, loss and tie, ace high', () => {
  const win = open([...cs(9, 4), ...fresh()], 100, 10)
  expect(win.chips).toBe(110)
  expect(win.s.phase).toBe('over')
  expect(open([...cs(4, 9), ...fresh()], 100, 10).chips).toBe(90)
  expect(open([...cs(1, 13), ...fresh()], 100, 10).chips).toBe(110)
  expect(open([...cs(13, 1), ...fresh()], 100, 10).chips).toBe(90)
  const tie = open([...cs(6, 6), ...fresh()], 100, 10)
  expect(tie.s.phase).toBe('tie')
  expect(tie.chips).toBe(90)
  expect(warDeal(100, 0, seeded()).s).toBe(null)
  expect(warDeal(100, 101, seeded()).chips).toBe(100)
  expect(warDeal(100, 10, seeded()).chips).toBeLessThan(121)
})

test('war: tie keeps the stake, war win pays even money, war loss loses both', () => {
  const win = war(warHand(warDeck(9, 4)), 90)
  expect(win.chips).toBe(90 - 10 + 30)
  expect(win.s.burned).toBe(3)
  expect(win.s.phase).toBe('over')
  expect(war(warHand(warDeck(7, 7)), 90).chips).toBe(110)
  expect(war(warHand(warDeck(1, 13)), 90).chips).toBe(110)
  const loss = war(warHand(warDeck(4, 9)), 90)
  expect(loss.chips).toBe(80)
  expect(loss.msg).toBe('Dealer wins the war. You lose 20.')
  expect(war(warHand(warDeck(13, 1)), 90).chips).toBe(80)
})

test('war refused when the raise is not covered or there is no tie', () => {
  const t = war(warHand(warDeck(9, 4)), 9)
  expect(t.chips).toBe(9)
  expect(t.s.phase).toBe('tie')
  const done = { ...warHand(warDeck(9, 4)), phase: 'over' as const }
  expect(war(done, 90).chips).toBe(90)
  expect(surrender(done, 90).chips).toBe(90)
})

test('war surrender returns half the stake', () => {
  const r = surrender(warHand([]), 90)
  expect(r.chips).toBe(95)
  expect(r.s.phase).toBe('over')
})
