// Copyright Ayers Electronics Inc. All rights reserved.

import type { Blackjack, Card, Turn } from '../types'
import { pays } from './chips'
import { BET, fresh, shuffle } from './deck'

// Best total for a hand: an ace counts 11 while that does not bust.
export function value(cards: Card[]): { total: number; soft: boolean } {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += c.r > 10 ? 10 : c.r
    if (c.r === 1) aces += 1
  }
  const soft = aces > 0 && total + 10 <= 21

  return { total: soft ? total + 10 : total, soft }
}

const isNatural = (cards: Card[]) => cards.length === 2 && value(cards).total === 21

// How a finished hand came out for the player.
export function outcome(b: Blackjack): 'bust' | 'dealerBust' | 'win' | 'push' | 'lose' {
  const p = value(b.player).total
  const d = value(b.dealer).total
  if (p > 21) return 'bust'
  if (d > 21) return 'dealerBust'

  return p > d ? 'win' : p === d ? 'push' : 'lose'
}

// Pays the bet back plus winnings, and says how the hand ended.
function settle(b: Blackjack, chips: number): Turn<Blackjack> {
  const how = outcome(b)
  const pay = how === 'win' || how === 'dealerBust' ? 2 * b.bet : how === 'push' ? b.bet : 0
  const msg = {
    bust: 'Bust. You lose ' + b.bet + '.',
    dealerBust: 'Dealer busts. You win ' + b.bet + '.',
    win: 'You win ' + b.bet + '.',
    push: 'Push.',
    lose: 'Dealer wins. You lose ' + b.bet + '.',
  }[how]

  return { s: { ...b, isOver: true }, chips: chips + pay, msg }
}

// Dealer draws to 17 and stands on every 17, soft included.
function dealerPlay(b: Blackjack): Blackjack {
  const deck = [...b.deck]
  const dealer = [...b.dealer]
  while (value(dealer).total < 17) dealer.push(deck.shift()!)

  return { ...b, deck, dealer }
}

function finish(b: Blackjack, chips: number): Turn<Blackjack> {
  return settle(value(b.player).total > 21 ? b : dealerPlay(b), chips)
}

// Deals a hand for the stake `bet`; a natural pays 3:2 on it.
export function deal(chips: number, rnd: () => number, bet = BET): Turn<Blackjack | null> {
  if (!(bet >= 1) || chips < bet) return { s: null, chips, msg: 'Not enough chips.' }
  const d = shuffle(fresh(), rnd)
  const b: Blackjack = {
    deck: d.slice(4),
    player: [d[0]!, d[2]!],
    dealer: [d[1]!, d[3]!],
    bet,
    isOver: false,
  }
  const left = chips - bet
  const natural = pays(bet, 3, 2)
  const mine = isNatural(b.player)
  const theirs = isNatural(b.dealer)
  if (mine && theirs) return { s: { ...b, isOver: true }, chips: left + bet, msg: 'Both have blackjack. Push.' }
  if (mine) return { s: { ...b, isOver: true }, chips: left + bet + natural, msg: 'Blackjack. You win ' + natural + '.' }
  if (theirs) return { s: { ...b, isOver: true }, chips: left, msg: 'Dealer has blackjack. You lose ' + bet + '.' }

  return { s: b, chips: left, msg: 'Hit, stand or double.' }
}

export function hit(b: Blackjack, chips: number): Turn<Blackjack> {
  if (b.isOver) return { s: b, chips, msg: 'Hand is over.' }
  const next = { ...b, deck: b.deck.slice(1), player: [...b.player, b.deck[0]!] }
  if (value(next.player).total >= 21) return finish(next, chips)

  return { s: next, chips, msg: 'You drew.' }
}

export function stand(b: Blackjack, chips: number): Turn<Blackjack> {
  if (b.isOver) return { s: b, chips, msg: 'Hand is over.' }

  return finish(b, chips)
}

export function double(b: Blackjack, chips: number): Turn<Blackjack> {
  if (b.isOver || b.player.length !== 2) return { s: b, chips, msg: 'Cannot double now.' }
  if (chips < b.bet) return { s: b, chips, msg: 'Not enough chips to double.' }
  const next = { ...b, bet: b.bet * 2, deck: b.deck.slice(1), player: [...b.player, b.deck[0]!] }

  return finish(next, chips - b.bet)
}
