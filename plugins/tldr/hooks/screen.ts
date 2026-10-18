// Copyright Ayers Electronics Inc. All rights reserved.

// What every screen of the pane is made of, as pure data: the table as a scene, the buttons under it, and how a
// press on the table changes the game. The pane draws it; the mouse and the buttons both act through it.

import type { Game, Table } from '../types'
import type { Point, Scene, Sprite } from './scene'
import { key } from './scene'

export type Rnd = () => number

// The cells a scene may fill, and whether the surface carries the mouse (only then are large table targets drawn).
export type Room = { cols: number; rows: number; mouse: boolean }

// A button under the table: its key, label, hotkey (one digit or lowercase letter), whether it is the main
// action or holds the focus first, and what it does.
export type Control = { key: string; label: string; hotkey?: string; primary?: boolean; focus?: boolean; run: (t: Table, rnd: Rnd) => Table }

export type Screen = {
  controls: (t: Table) => Control[]
  scene: (t: Table, room: Room) => Scene
  point: (t: Table, p: Point, rnd: Rnd) => Table
}

export const toMenu: Control = { key: 'menu', label: 'Menu', hotkey: 'm', run: t => ({ ...t, view: 'menu' }) }

// A main action is drawn "[ label (k) ]" in the accent colour, every other button plain as "k: label".
export const buttonLabel = (c: Control) => (c.primary && c.hotkey ? c.label + ' (' + c.hotkey + ')' : c.label)
export const buttonWidth = (c: Control) => (c.primary ? buttonLabel(c).length + 4 : c.label.length + (c.hotkey ? 3 : 0))

// Rows a wrapping row of buttons takes at a width, one column between buttons.
export function barRows(controls: Control[], cols: number): number {
  let rows = controls.length > 0 ? 1 : 0
  let used = 0
  for (const c of controls) {
    const w = buttonWidth(c)
    if (used > 0 && used + 1 + w > cols) {
      rows += 1
      used = w
    } else {
      used += (used > 0 ? 1 : 0) + w
    }
  }

  return rows
}

export const NAMES: Record<Game, string> = {
  solitaire: 'Klondike',
  freecell: 'FreeCell',
  spider: 'Spider',
  pyramid: 'Pyramid',
  blackjack: 'Blackjack',
  poker: 'Video Poker',
  holdem: "Hold'em",
  baccarat: 'Baccarat',
  hilo: 'Hi-Lo',
  war: 'War',
}

// Large pressable keys for actions, side by side from x along row y, each at most 12 wide and `h` rows tall:
// the table's own buttons for the mouse. A press on one runs the control of the same key.
export function keySprites(controls: Control[], x: number, y: number, width: number, h: number): Sprite[] {
  if (controls.length === 0) return []
  const w = Math.max(5, Math.min(12, Math.floor((width - (controls.length - 1)) / controls.length)))

  return controls.map((c, i) => key('key:' + c.key, x + i * (w + 1), y, w, h, c.label.toUpperCase().slice(0, w - 2), true))
}

// The control a key press names, run; the table unchanged when there is none.
export function runKey(controls: Control[], id: string, t: Table, rnd: Rnd): Table {
  const c = controls.find(k => 'key:' + k.key === id)

  return c ? c.run(t, rnd) : t
}
