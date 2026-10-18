// Copyright Ayers Electronics Inc. All rights reserved.

// Sitting down at a game from the menu: a solitaire game in play carries on, a fresh one is dealt; a betting
// table waits for the bet and the deal.

import type { Game, Table } from '../types'
import { START_CHIPS } from './deck'
import * as fc from './freecell'
import * as he from './holdem'
import * as py from './pyramid'
import type { Rnd } from './screen'
import * as sol from './solitaire'
import * as sp from './spider'

const READY: Record<Game, string> = {
  solitaire: 'Press Draw, or click a card to take it.',
  freecell: 'Click a card to take it, or drag it.',
  spider: 'Move runs of one suit; deal from the stock.',
  pyramid: 'Click two cards that make 13.',
  blackjack: 'Place your bet, then deal.',
  poker: 'Place your bet, then deal.',
  holdem: 'Set your raise with the chips, then deal.',
  baccarat: 'Pick Player, Banker or Tie, then deal.',
  hilo: 'Place your bet, then deal.',
  war: 'Place your bet, then deal.',
}

export function start(t: Table, game: Game, rnd: Rnd): Table {
  const at = { ...t, view: 'game' as const, game, msg: READY[game] }
  if (game === 'solitaire' && !t.sol) return { ...at, sol: sol.newGame(rnd, t.opts.drawCount) }
  if (game === 'freecell' && !t.fc) return { ...at, fc: fc.newGame(rnd) }
  if (game === 'spider' && !t.sp) return { ...at, sp: sp.newGame(rnd, 1) }
  if (game === 'pyramid' && !t.py) return { ...at, py: py.newGame(rnd) }
  if (game === 'holdem' && !t.he) return { ...at, he: he.newTable(2, t.chips, START_CHIPS) }

  return at
}
