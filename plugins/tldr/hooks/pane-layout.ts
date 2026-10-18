// Copyright Ayers Electronics Inc. All rights reserved.

// How the cards pane spends its height: the bottom row first (WAITING ON YOU and TL;DR, pinned), then the felt
// gets the rest: the result line, the buttons, and the table's scene in whatever rows are left. The scene is laid
// out for exactly that room, so the pane never needs scrolling.

import type { Game, Table } from '../types'
import { bottom } from './bottom'
import { baccarat } from './game-baccarat'
import { blackjack } from './game-blackjack'
import { freecell } from './game-freecell'
import { hilo } from './game-hilo'
import { holdem } from './game-holdem'
import { menu } from './game-menu'
import { poker } from './game-poker'
import { pyramid } from './game-pyramid'
import { solitaire } from './game-solitaire'
import { spider } from './game-spider'
import { war } from './game-war'
import type { Screen } from './screen'
import { barRows } from './screen'

// The rows a pane's body is laid out in when the surface does not say.
export const DEFAULT_ROWS = 24

const SCREENS: Record<Game, Screen> = { solitaire, freecell, spider, pyramid, blackjack, poker, holdem, baccarat, hilo, war }

export const screenOf = (t: Table): Screen => (t.view === 'menu' ? menu : SCREENS[t.game])

// The felt is padded one column each side; under the scene sit the result line and the buttons.
export function paneLayout(t: Table, held: readonly string[], cols: number, rows: number, mouse: boolean) {
  const screen = screenOf(t)
  const controls = screen.controls(t)
  const low = bottom(held, cols)
  const tableRows = Math.max(4, rows - low.height)
  const room = { cols: Math.max(10, cols - 2), rows: Math.max(1, tableRows - 1 - barRows(controls, cols - 2)), mouse }

  return { screen, controls, low, tableRows, room, scene: screen.scene(t, room) }
}
