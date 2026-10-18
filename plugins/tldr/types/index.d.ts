// Copyright Ayers Electronics Inc. All rights reserved.

export type TldrLines = string[]

export type Suit = 'S' | 'H' | 'D' | 'C'
export type Card = { r: number; s: Suit }
export type Game = 'solitaire' | 'freecell' | 'spider' | 'pyramid' | 'blackjack' | 'poker' | 'holdem' | 'baccarat' | 'hilo' | 'war'

export type Turn<S> = { s: S; chips: number; msg: string }

export type Blackjack = { deck: Card[]; player: Card[]; dealer: Card[]; bet: number; isOver: boolean }
export type Poker = { deck: Card[]; hand: Card[]; held: boolean[]; isOver: boolean; bet?: number }
export type HiLo = { deck: Card[]; current: Card; streak: number }

// Klondike. `lift` is the index into the picked column's face-up cards where the lifted run starts; absent, the
// deepest run that has somewhere to go.
export type Column = { down: Card[]; up: Card[] }
export type Source = 'w' | number
export type Dest = 'f' | number
export type Solitaire = { stock: Card[]; waste: Card[]; cols: Column[]; found: number[]; pick: Source | null; lift?: number; drawCount?: 1 | 3 }

// FreeCell: eight face-up columns, four free cells, four foundations (index by suit order S H D C).
export type FcFrom = { col: number; start: number } | { cell: number }
export type FcTo = { col: number } | { cell: number } | 'f'
export type FreeCell = { cols: Card[][]; cells: (Card | null)[]; found: number[]; lift: FcFrom | null }

// Spider: ten columns, a stock of five deals, eight runs to complete.
export type Spider = { cols: Column[]; stock: Card[]; done: number; suits: 1 | 2; lift: { col: number; start: number } | null }

// Pyramid: 28 cards in seven rows (index 0 is the peak, row r starts at r*(r+1)/2), a stock and a waste.
export type PyrAt = number | 'w'
export type Pyramid = { pyr: (Card | null)[]; stock: Card[]; waste: Card[]; pass: number; lift: PyrAt | null }

// Punto banco, no commission: one hand dealt whole.
export type BacBet = 'player' | 'banker' | 'tie'
export type Baccarat = { player: Card[]; banker: Card[]; on: BacBet; stake: number; isOver: boolean }

// Casino War: one card each; a tie offers war or surrender.
export type War = { deck: Card[]; mine: Card | null; theirs: Card | null; stake: number; phase: 'tie' | 'over'; burned: number }

// No-limit Texas Hold'em: seat 0 is the person. `bet` is in front of a seat this street, `put` its total this hand,
// `acted` whether it has acted since the last full raise. `pot` holds earlier streets; `level` is the bet to match.
export type HoldemStreet = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
export type HoldemSeat = {
  name: string
  isBot: boolean
  chips: number
  bet: number
  put: number
  hole: Card[]
  folded: boolean
  allIn: boolean
  acted: boolean
  last: string
}
export type HoldemPot = { amount: number; winners: number[]; shares: number[]; hand: string }
export type HoldemAction = { kind: 'fold' } | { kind: 'check' } | { kind: 'call' } | { kind: 'raise'; to: number } | { kind: 'allin' }
export type Holdem = {
  seats: HoldemSeat[]
  deck: Card[]
  board: Card[]
  pot: number
  level: number
  lastRaise: number
  street: HoldemStreet
  turn: number
  button: number
  botChips: number
  isOver: boolean
  pots: HoldemPot[]
  reveal: number[]
  msg: string
}

export type Felt = 'green' | 'blue' | 'red' | 'charcoal'
export type Options = { back: number; felt: Felt; drawCount: 1 | 3; refill: number }

export type Table = {
  view: 'menu' | 'game'
  game: Game
  chips: number
  bet: number
  msg: string
  opts: Options
  bj: Blackjack | null
  vp: Poker | null
  hl: HiLo | null
  sol: Solitaire | null
  fc: FreeCell | null
  sp: Spider | null
  py: Pyramid | null
  he: Holdem | null
  bac: Baccarat | null
  war: War | null
}

declare module 'claude-code' {
  interface PluginState {
    tldr: { lines: string[]; recent: string[]; lastPrompt: string; table: Table }
  }
}
