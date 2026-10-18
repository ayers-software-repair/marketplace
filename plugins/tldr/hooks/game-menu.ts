// Copyright Ayers Electronics Inc. All rights reserved.

// The game chooser: a tight grid of tiles, each a small card, the game's name and one line about it, and an
// options row (card back, felt, Klondike's draw, the New Chips refill). A tile or an option is pressed by
// click, by its button, or by its key.

import type { Card, Game, Table } from '../types'
import { backRows, cardRows, center, padEnd, toneOf } from './layout'
import type { Row } from './layout'
import type { Point, Scene, Sprite } from './scene'
import { put, text } from './scene'
import type { Control, Room, Rnd, Screen } from './screen'
import { NAMES } from './screen'
import { BACKS, FELTS, GAMES, REFILLS } from './table-state'
import { start } from './start'

const k = (r: number, s: Card['s']): Card => ({ r, s })

const TILES: Record<Game, { blurb: string; art: Card }> = {
  solitaire: { blurb: 'Build each suit up from aces.', art: k(13, 'C') },
  freecell: { blurb: 'All cards up; four free cells.', art: k(1, 'D') },
  spider: { blurb: 'Ten columns; run K down to A.', art: k(13, 'S') },
  pyramid: { blurb: 'Pair cards that add to 13.', art: k(7, 'H') },
  blackjack: { blurb: 'Beat the dealer to 21.', art: k(1, 'S') },
  poker: { blurb: 'Jacks or Better. Hold, draw.', art: k(1, 'H') },
  holdem: { blurb: 'No-limit, one to three rivals.', art: k(13, 'H') },
  baccarat: { blurb: 'Back Player, Banker or Tie.', art: k(9, 'D') },
  hilo: { blurb: 'Is the next card higher?', art: k(7, 'D') },
  war: { blurb: 'High card wins. Ties mean war.', art: k(12, 'C') },
}

// The key that starts each game: 1 to 9, then 0.
export const hotkeyOf = (g: Game) => String((GAMES.indexOf(g) + 1) % 10)

const isLive = (t: Table, g: Game): boolean => {
  const st = { solitaire: t.sol, freecell: t.fc, spider: t.sp, pyramid: t.py, blackjack: t.bj, poker: t.vp, holdem: t.he, baccarat: t.bac, hilo: t.hl, war: t.war }[g]

  return st !== null && st !== undefined
}

// Tiles across: three when each gets 30 columns, then two, then one. Three rows tall (a card, the name, a line
// about the game) where the title, the tiles and the options row fit; then two; then one row each.
export function grid(room: Room): { across: number; w: number; h: number; y0: number } {
  const across = room.cols >= 3 * 30 + 2 ? 3 : room.cols >= 2 * 26 + 1 ? 2 : 1
  const down = Math.ceil(GAMES.length / across)
  const h = [3, 2].find(n => 1 + down * n + 1 <= room.rows) ?? 1

  return { across, w: Math.floor((room.cols - (across - 1)) / across), h, y0: 1 }
}

function tile(t: Table, g: Game, x: number, y: number, w: number, h: number): Sprite[] {
  const id = 'play:' + g
  const isLit = t.game === g
  const art: Row[] = h === 3 ? cardRows(TILES[g].art, true) : [{ text: ' ' + cardRows(TILES[g].art, true)[1]!.text.slice(1, 4) + ' ', tone: toneOf(TILES[g].art, isLit) }]
  const tw = Math.max(0, w - 6)
  const name = hotkeyOf(g) + ' ' + NAMES[g].toUpperCase()
  const lines: [string, Row['tone']][] =
    h === 1
      ? [[name + '  ' + TILES[g].blurb, isLit ? 'win' : 'gold']]
      : [
          [name, isLit ? 'win' : 'gold'],
          [TILES[g].blurb, 'felt'],
          [isLive(t, g) ? 'In play' : '', 'dim'],
        ]

  return [
    { id, x, y, w, h, hot: true },
    put(id, x, y, art, { hot: true }),
    ...lines.slice(0, h).map(([s, tone], i) => text(x + 6, y + i, padEnd(s.slice(0, tw), tw), tone, id, { hot: true })),
  ]
}

const FELT_NAMES = { green: 'Green', blue: 'Blue', red: 'Red', charcoal: 'Charcoal' }

// The option chips: what each shows and the id a press on it carries.
function optionItems(t: Table): { id: string; label: string }[] {
  return [
    { id: 'opt:back', label: 'Back ' + backRows(true, t.opts.back)[1]!.text.slice(1, 4) },
    { id: 'opt:felt', label: 'Felt ' + FELT_NAMES[t.opts.felt] },
    { id: 'opt:draw', label: 'Klondike draw ' + t.opts.drawCount },
    { id: 'opt:refill', label: 'Refill ' + t.opts.refill },
  ]
}

function scene(t: Table, room: Room): Scene {
  const g = grid(room)
  const out: Sprite[] = [text(0, 0, center('♠ ♥  C A R D S  ♦ ♣', room.cols), 'gold')]
  GAMES.forEach((game, i) => {
    const col = i % g.across
    const row = Math.floor(i / g.across)
    out.push(...tile(t, game, col * (g.w + 1), g.y0 + row * g.h, g.w, g.h))
  })
  let x = 0
  const y = g.y0 + Math.ceil(GAMES.length / g.across) * g.h
  out.push(text(x, y, 'OPTIONS', 'dim'))
  x += 8
  for (const o of optionItems(t)) {
    if (x + o.label.length + 2 > room.cols) break
    out.push(text(x, y, ' ' + o.label + ' ', 'key', o.id, { hot: true }))
    x += o.label.length + 3
  }
  if (!room.mouse && y + 1 < room.rows) out.push(text(0, y + 1, 'Mouse play needs the desktop app or the fullscreen terminal.'.slice(0, room.cols), 'dim'))

  return { w: room.cols, h: room.rows, sprites: out }
}

const cycle = <T>(list: readonly T[], at: T): T => list[(list.indexOf(at) + 1) % list.length]!

// One option stepped to its next value; it applies at once (Klondike's draw count to the game in play too).
function option(t: Table, id: string): Table {
  const o = t.opts
  if (id === 'opt:back') return { ...t, opts: { ...o, back: (o.back + 1) % BACKS } }
  if (id === 'opt:felt') return { ...t, opts: { ...o, felt: cycle(FELTS, o.felt) } }
  if (id === 'opt:refill') return { ...t, opts: { ...o, refill: cycle(REFILLS, o.refill) } }
  if (id === 'opt:draw') {
    const drawCount = o.drawCount === 1 ? 3 : 1

    return { ...t, opts: { ...o, drawCount }, sol: t.sol ? { ...t.sol, drawCount } : t.sol }
  }

  return t
}

function point(t: Table, p: Point, rnd: Rnd): Table {
  if (p.act === 'drop') return t
  if (p.id.startsWith('play:')) {
    const g = p.id.slice('play:'.length) as Game

    return GAMES.includes(g) ? start(t, g, rnd) : t
  }

  return option(t, p.id)
}

function controls(t: Table): Control[] {
  return [
    ...GAMES.map((g): Control => ({ key: 'play-' + g, label: NAMES[g], hotkey: hotkeyOf(g), focus: t.game === g, run: (x, rnd) => start(x, g, rnd) })),
    ...optionItems(t).map((o, i): Control => ({ key: o.id.replace(':', '-'), label: o.label, hotkey: 'btdr'[i], run: x => option(x, o.id) })),
  ]
}

export const menu: Screen = { scene, point, controls }
