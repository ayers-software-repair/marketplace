// Copyright Ayers Electronics Inc. All rights reserved.

import type { Holdem, HoldemAction, HoldemSeat, HoldemStreet } from '../types'
import { fresh, shuffle } from './deck'
import { type BotView, decide } from './holdem-bot'
import { settle } from './holdem-pots'

export const SMALL_BLIND = 1
export const BIG_BLIND = 2
const BOT_NAMES = ['Ada', 'Bo', 'Cy']
const NEXT: Partial<Record<HoldemStreet, [HoldemStreet, number]>> = { preflop: ['flop', 3], flop: ['turn', 1], turn: ['river', 1] }

export type Legal = { toCall: number; canCheck: boolean; canRaise: boolean; minRaiseTo: number; maxRaiseTo: number }

const seat = (name: string, isBot: boolean, chips: number): HoldemSeat => ({
  name, isBot, chips, bet: 0, put: 0, hole: [], folded: false, allIn: false, acted: false, last: '',
})

export function newTable(bots: 1 | 2 | 3, chips: number, botChips: number): Holdem {
  return {
    seats: [seat('You', false, chips), ...BOT_NAMES.slice(0, bots).map(n => seat(n, true, botChips))],
    deck: [], board: [], pot: 0, level: 0, lastRaise: BIG_BLIND, street: 'preflop', turn: 0, button: 0, botChips,
    isOver: true, pots: [], reveal: [], msg: 'Deal to start.',
  }
}

const canBet = (s: HoldemSeat) => !s.folded && !s.allIn

// Puts up to `amount` more chips in front of a seat.
function pay(s: HoldemSeat, amount: number): HoldemSeat {
  const a = Math.min(amount, s.chips)

  return { ...s, chips: s.chips - a, bet: s.bet + a, put: s.put + a, allIn: s.chips === a }
}

// A seat owes an action when it faces a bet, or has not acted since the last full raise and someone could answer.
function owes(h: Holdem, i: number): boolean {
  const s = h.seats[i]!
  if (!canBet(s)) return false

  return s.bet < h.level || (!s.acted && h.seats.some((o, k) => k !== i && canBet(o)))
}

function nextOwing(h: Holdem, from: number): number {
  const n = h.seats.length
  for (let k = 1; k <= n; k++) if (owes(h, (from + k) % n)) return (from + k) % n

  return -1
}

// A raise must add at least the last full raise; a seat that has acted since it may only call or fold.
export function legalFor(h: Holdem, i: number): Legal {
  const s = h.seats[i]!
  const max = s.bet + s.chips

  return {
    toCall: Math.min(h.level - s.bet, s.chips),
    canCheck: s.bet >= h.level,
    canRaise: !s.acted && max > h.level && h.seats.some((o, k) => k !== i && canBet(o)),
    minRaiseTo: Math.min(h.level + h.lastRaise, max),
    maxRaiseTo: max,
  }
}

export function legal(h: Holdem): Legal | null {
  return h.isOver || h.seats[h.turn]!.isBot ? null : legalFor(h, h.turn)
}

export function botView(h: Holdem, i: number): BotView {
  const s = h.seats[i]!

  return { hole: s.hole, board: h.board, pot: h.pot, bets: h.seats.map(o => o.bet), level: h.level, stack: s.chips, ...legalFor(h, i) }
}

// Collects the bets and deals the next street; runs the board out while nobody can bet; ends at the showdown.
function endStreet(h: Holdem): Holdem {
  let t: Holdem = {
    ...h,
    pot: h.pot + h.seats.reduce((a, s) => a + s.bet, 0),
    seats: h.seats.map(s => ({ ...s, bet: 0, acted: false, last: s.folded || s.allIn ? s.last : '' })),
    level: 0,
    lastRaise: BIG_BLIND,
  }
  for (let next = NEXT[t.street]; next; next = NEXT[t.street]) {
    const [street, count] = next
    t = { ...t, street, board: [...t.board, ...t.deck.slice(1, 1 + count)], deck: t.deck.slice(1 + count) }
    const k = nextOwing(t, t.button)
    if (k >= 0) return { ...t, turn: k }
  }

  return settle(t)
}

function proceed(h: Holdem, from: number): Holdem {
  if (h.seats.filter(s => !s.folded).length === 1) return settle(h)
  const k = nextOwing(h, from)

  return k >= 0 ? { ...h, turn: k } : endStreet(h)
}

// Applies seat i's action, or returns why it is not allowed.
function apply(h: Holdem, i: number, a: HoldemAction): Holdem | string {
  const l = legalFor(h, i)
  const s = h.seats[i]!
  const done = (next: HoldemSeat, seats = h.seats, more: Partial<Holdem> = {}) =>
    proceed({ ...h, ...more, seats: seats.map((o, k) => (k === i ? next : o)), msg: s.name + ': ' + next.last + '.' }, i)
  if (a.kind === 'fold') return done({ ...s, folded: true, acted: true, last: 'Fold' })
  if (a.kind === 'check') return l.canCheck ? done({ ...s, acted: true, last: 'Check' }) : 'There is a bet to call.'
  let to = s.bet + l.toCall
  if (a.kind === 'call' && l.canCheck) return 'Nothing to call.'
  if (a.kind === 'raise') {
    if (!l.canRaise) return 'Raising is closed.'
    if (!Number.isInteger(a.to) || a.to < l.minRaiseTo || a.to > l.maxRaiseTo) return 'Raise to between ' + l.minRaiseTo + ' and ' + l.maxRaiseTo + '.'
    to = a.to
  }
  if (a.kind === 'allin') {
    if (!l.canRaise && l.maxRaiseTo > h.level) return 'Raising is closed.'
    to = l.maxRaiseTo
  }
  const paid = pay(s, to - s.bet)
  const word = paid.allIn ? 'All in' : a.kind === 'call' ? 'Call ' + (to - s.bet) : (h.level ? 'Raise to ' : 'Bet ') + to
  const next = { ...paid, acted: true, last: word }
  if (to <= h.level) return done(next)
  const full = to - h.level >= h.lastRaise
  const seats = full ? h.seats.map(o => ({ ...o, acted: false })) : h.seats

  return done(next, seats, { level: to, lastRaise: full ? to - h.level : h.lastRaise })
}

// Computer players act until it is the person's turn or the hand is over.
function runBots(h: Holdem, rnd: () => number): Holdem {
  let t = h
  while (!t.isOver && t.seats[t.turn]!.isBot) {
    const r = apply(t, t.turn, decide(botView(t, t.turn), rnd))
    t = typeof r === 'string' ? (apply(t, t.turn, { kind: legalFor(t, t.turn).canCheck ? 'check' : 'fold' }) as Holdem) : r
  }

  return t
}

export function deal(h: Holdem, rnd: () => number): Holdem {
  if (!h.isOver) return { ...h, msg: 'Finish this hand first.' }
  if (h.seats[0]!.chips < BIG_BLIND) return { ...h, msg: 'Not enough chips for the big blind.' }
  const n = h.seats.length
  const d = shuffle(fresh(), rnd)
  const seats = h.seats.map((s, i) => ({ ...seat(s.name, s.isBot, s.isBot && !s.chips ? h.botChips : s.chips), hole: [d[i]!, d[i + n]!] }))
  const button = (h.button + 1) % n
  const sb = n === 2 ? button : (button + 1) % n
  const bb = (sb + 1) % n
  const blind = (i: number, amount: number) => {
    const p = pay(seats[i]!, amount)
    seats[i] = { ...p, last: p.allIn ? 'All in' : 'Blind ' + p.bet }
  }
  blind(sb, SMALL_BLIND)
  blind(bb, BIG_BLIND)
  const t: Holdem = {
    ...h, seats, deck: d.slice(2 * n), board: [], pot: 0, level: BIG_BLIND, lastRaise: BIG_BLIND, street: 'preflop',
    turn: bb, button, isOver: false, pots: [], reveal: [], msg: 'Blinds are in.',
  }

  return runBots(proceed(t, bb), rnd)
}

export function act(h: Holdem, a: HoldemAction, rnd: () => number): Holdem {
  if (!legal(h)) return { ...h, msg: 'Not your turn.' }
  const r = apply(h, h.turn, a)

  return typeof r === 'string' ? { ...h, msg: r } : runBots(r, rnd)
}
