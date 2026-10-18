// Copyright Ayers Electronics Inc. All rights reserved.

// The table's starting value, and the read that fills in whatever a stored table from an older build lacks.

import type { Felt, Game, Options, Table } from '../types'
import { clampBet } from './chips'
import { BET, START_CHIPS } from './deck'

export const GAMES: Game[] = ['solitaire', 'freecell', 'spider', 'pyramid', 'blackjack', 'poker', 'holdem', 'baccarat', 'hilo', 'war']
export const FELTS: Felt[] = ['green', 'blue', 'red', 'charcoal']
export const BACKS = 4
export const REFILLS = [100, 250, 500, 1000]

export const DEFAULT_OPTIONS: Options = { back: 0, felt: 'green', drawCount: 1, refill: START_CHIPS }

export const FRESH: Table = {
  view: 'menu',
  game: 'solitaire',
  chips: START_CHIPS,
  bet: BET,
  msg: '',
  opts: DEFAULT_OPTIONS,
  bj: null,
  vp: null,
  hl: null,
  sol: null,
  fc: null,
  sp: null,
  py: null,
  he: null,
  bac: null,
  war: null,
}

// Every field present and every option one the menu offers; the bet within the balance.
export function normalize(stored: Partial<Table> | undefined): Table {
  const t = { ...FRESH, ...stored }
  const o = { ...DEFAULT_OPTIONS, ...stored?.opts }
  const opts: Options = {
    back: Number.isInteger(o.back) && o.back >= 0 && o.back < BACKS ? o.back : 0,
    felt: FELTS.includes(o.felt) ? o.felt : 'green',
    drawCount: o.drawCount === 3 ? 3 : 1,
    refill: REFILLS.includes(o.refill) ? o.refill : START_CHIPS,
  }
  const game = GAMES.includes(t.game) ? t.game : 'solitaire'
  const chips = typeof t.chips === 'number' && t.chips >= 0 ? t.chips : START_CHIPS
  const bet = typeof t.bet === 'number' ? clampBet(t.bet, chips) : clampBet(BET, chips)

  return { ...t, game, chips, bet, opts }
}
