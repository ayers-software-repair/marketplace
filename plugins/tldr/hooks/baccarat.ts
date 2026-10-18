// Copyright Ayers Electronics Inc. All rights reserved.

import type { BacBet, Baccarat, Card, Turn } from '../types'
import { fresh, shuffle } from './deck'

// Baccarat card value: ace 1, two to nine face value, ten and court cards 0.
const pips = (c: Card) => (c.r >= 10 ? 0 : c.r)

export function total(cards: Card[]): number {
  return cards.reduce((n, c) => n + pips(c), 0) % 10
}

// Banker draws on `b` given the value `p` of the Player's third card.
function bankerDraws(b: number, p: number): boolean {
  if (b <= 2) return true
  if (b === 3) return p !== 8
  if (b === 4) return p >= 2 && p <= 7
  if (b === 5) return p >= 4 && p <= 7
  if (b === 6) return p === 6 || p === 7

  return false
}

// Completes both hands from the two-card starts, drawing third cards from `deck`.
export function play(player: Card[], banker: Card[], deck: Card[]): { player: Card[]; banker: Card[] } {
  const p = [...player]
  const b = [...banker]
  const rest = [...deck]
  if (total(p) >= 8 || total(b) >= 8) return { player: p, banker: b }
  const pDrew = total(p) <= 5
  if (pDrew) p.push(rest.shift()!)
  const draws = pDrew ? bankerDraws(total(b), pips(p[2]!)) : total(b) <= 5
  if (draws) b.push(rest.shift()!)

  return { player: p, banker: b }
}

const names: Record<BacBet, string> = { player: 'Player', banker: 'Banker', tie: 'Tie' }

// Settles a finished hand; `chips` is the balance after the stake was taken.
export function settle(h: Baccarat, chips: number): Turn<Baccarat> {
  const p = total(h.player)
  const b = total(h.banker)
  const won: BacBet = p > b ? 'player' : b > p ? 'banker' : 'tie'
  const top = Math.max(p, b)
  const head = won === 'tie' ? 'Tie at ' + top + '.' : names[won] + ' wins with ' + top + '.'
  const s = { ...h, isOver: true }
  if (h.on !== 'tie' && won === 'tie') return { s, chips: chips + h.stake, msg: head + ' Your bet is returned.' }
  if (h.on !== won) return { s, chips, msg: head + ' You lose ' + h.stake + '.' }
  const win = won === 'tie' ? h.stake * 8 : won === 'banker' && b === 6 ? h.stake / 2 : h.stake

  return { s, chips: chips + h.stake + win, msg: head + ' You win ' + win + '.' }
}

export function deal(chips: number, on: BacBet, stake: number, rnd: () => number): Turn<Baccarat | null> {
  if (!(stake >= 1) || stake > chips) return { s: null, chips, msg: 'Not enough chips.' }
  const d = shuffle(fresh(), rnd)
  const { player, banker } = play([d[0]!, d[2]!], [d[1]!, d[3]!], d.slice(4))

  return settle({ player, banker, on, stake, isOver: false }, chips - stake)
}
