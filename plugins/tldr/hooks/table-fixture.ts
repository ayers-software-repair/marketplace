// Copyright Ayers Electronics Inc. All rights reserved.

// Tables the tests start from.

import type { Card, Solitaire, Suit, Table } from '../types'
import { FRESH } from './table-state'

const c = (r: number, s: Suit): Card => ({ r, s })
const col = (down: Card[], up: Card[]) => ({ down, up })

// Column 0: 9C down, 7H 6S up. Column 1: 8S. Column 2: KH. The rest empty. Waste: AD.
export function klondike(extra: Partial<Solitaire> = {}): Table {
  const cols = [0, 1, 2, 3, 4, 5, 6].map(() => col([], []))
  cols[0] = col([c(9, 'C')], [c(7, 'H'), c(6, 'S')])
  cols[1] = col([], [c(8, 'S')])
  cols[2] = col([], [c(13, 'H')])

  return { ...FRESH, view: 'game', game: 'solitaire', sol: { stock: [c(2, 'C')], waste: [c(1, 'D')], cols, found: [0, 0, 0, 0], pick: null, drawCount: 1, ...extra } }
}

// The room a table is laid out in: an 80-column terminal's inline pane, 20 rows of felt.
export const ROOM = { cols: 76, rows: 20, mouse: true }
