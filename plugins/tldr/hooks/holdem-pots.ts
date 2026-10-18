// Copyright Ayers Electronics Inc. All rights reserved.

import type { Holdem, HoldemPot, HoldemSeat } from '../types'
import { best, compare } from './holdem-hand'

type Layer = { amount: number; eligible: number[] }

// The part of the biggest contribution nobody matched goes back to its seat.
export function uncalled(seats: HoldemSeat[]): { seat: number; amount: number } {
  const puts = seats.map(s => s.put)
  const seat = puts.indexOf(Math.max(...puts))
  const second = Math.max(0, ...puts.filter((_, i) => i !== seat))

  return { seat, amount: puts[seat]! - second }
}

// Main pot then side pots, one per distinct contribution of a hand still in. Chips folded seats put in above the
// top layer join the last pot.
export function layers(seats: HoldemSeat[]): Layer[] {
  const levels = [...new Set(seats.filter(s => !s.folded && s.put > 0).map(s => s.put))].sort((a, b) => a - b)
  const out: Layer[] = []
  let prev = 0
  for (const top of levels) {
    const amount = seats.reduce((sum, s) => sum + Math.min(s.put, top) - Math.min(s.put, prev), 0)
    out.push({ amount, eligible: seats.flatMap((s, i) => (!s.folded && s.put >= top ? [i] : [])) })
    prev = top
  }
  const rest = seats.reduce((sum, s) => sum + Math.max(0, s.put - prev), 0)
  if (rest) out[out.length - 1]!.amount += rest

  return out
}

// Pays every pot, splitting ties evenly; odd chips go one each to the winners nearest the button's left.
export function settle(h: Holdem): Holdem {
  const n = h.seats.length
  const isShowdown = h.seats.filter(s => !s.folded).length > 1
  const value = (i: number) => best([...h.seats[i]!.hole, ...h.board])
  const left = (i: number) => (i - h.button - 1 + n) % n
  const back = uncalled(h.seats)
  const chips = h.seats.map((s, i) => s.chips + (i === back.seat ? back.amount : 0))
  const paid = h.seats.map((s, i) => (i === back.seat ? { ...s, put: s.put - back.amount } : s))
  const pots: HoldemPot[] = []
  for (const l of layers(paid)) {
    const top = l.eligible.reduce((a, i) => (isShowdown && compare(value(i), value(a)) > 0 ? i : a))
    const winners = isShowdown ? l.eligible.filter(i => compare(value(i), value(top)) === 0) : l.eligible
    winners.sort((a, b) => left(a) - left(b))
    const share = Math.floor(l.amount / winners.length)
    const shares = winners.map((_, j) => share + (j < l.amount % winners.length ? 1 : 0))
    winners.forEach((w, j) => (chips[w]! += shares[j]!))
    pots.push({ amount: l.amount, winners, shares, hand: isShowdown ? value(top).name : '' })
  }
  const say = (p: HoldemPot, k: number) => {
    const who = p.winners.map(i => h.seats[i]!.name).join(' and ')
    const verb = p.winners.length > 1 ? 'split' : p.winners[0] === 0 ? 'win' : 'wins'

    return (pots.length > 1 ? (k ? 'Side pot: ' : 'Main pot: ') : '') + who + ' ' + verb + ' ' + p.amount + (p.hand ? ' with ' + p.hand : '') + '.'
  }

  return {
    ...h,
    seats: h.seats.map((s, i) => ({ ...s, chips: chips[i]!, bet: 0, put: paid[i]!.put })),
    pot: 0,
    street: isShowdown ? 'showdown' : h.street,
    isOver: true,
    pots,
    reveal: isShowdown ? h.seats.flatMap((s, i) => (s.folded ? [] : [i])) : [],
    msg: pots.map(say).join(' '),
  }
}
