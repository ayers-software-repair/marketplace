// Copyright Ayers Electronics Inc. All rights reserved.

import type { Card } from '../types'
import type { Denom } from './chips'
import { isRed, label } from './deck'

// Pure card and chip pictures as rows of text. A full card is 7 columns by 5 rows, a compact one 5 by 3.
export type Tone =
  | 'red'
  | 'black'
  | 'redLit'
  | 'blackLit'
  | 'back'
  | 'slot'
  | 'felt'
  | 'gold'
  | 'dim'
  | 'win'
  | 'key'
  | 'chip1'
  | 'chip5'
  | 'chip25'
  | 'chip100'
export type Row = { text: string; tone: Tone }

const SYMBOL: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }

export const cardWidth = (isCompact: boolean) => (isCompact ? 5 : 7)
export const cardHeight = (isCompact: boolean) => (isCompact ? 3 : 5)

export const padEnd = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length))
const padStart = (s: string, n: number) => ' '.repeat(Math.max(0, n - s.length)) + s
export const center = (s: string, n: number) => padEnd(padStart(s, s.length + Math.floor((n - s.length) / 2)), n)
const rankText = (c: Card) => label(c).slice(0, -1)

export function toneOf(c: Card, isLit: boolean): Tone {
  return isRed(c) ? (isLit ? 'redLit' : 'red') : isLit ? 'blackLit' : 'black'
}

// The face: rank top-left and bottom-right, the suit large in the middle; compact is rank and suit on one line.
export function cardRows(c: Card, isCompact: boolean, isLit = false): Row[] {
  const tone = toneOf(c, isLit)
  const rows = isCompact
    ? ['┌───┐', '│' + padEnd(label(c), 3) + '│', '└───┘']
    : [
        '┌─────┐',
        '│' + padEnd(rankText(c), 5) + '│',
        '│  ' + SYMBOL[c.s] + '  │',
        '│' + padStart(rankText(c), 5) + '│',
        '└─────┘',
      ]

  return rows.map(text => ({ text, tone }))
}

// One row of an overlapped face-up card: its top edge carrying rank and suit, as a fanned card shows its corner.
export function stripRow(c: Card, isCompact: boolean, isLit = false): Row {
  const w = cardWidth(isCompact)

  return { text: '┌' + label(c) + '─'.repeat(Math.max(0, w - 2 - label(c).length)) + '┐', tone: toneOf(c, isLit) }
}

// The four card backs the menu offers, each a pattern of two alternating rows.
const BACK_PATTERNS = [
  ['░▒░▒░', '▒░▒░▒'],
  ['╳╳╳╳╳', '╳╳╳╳╳'],
  ['▚▞▚▞▚', '▞▚▞▚▞'],
  ['┼─┼─┼', '─┼─┼─'],
]

// A face-down card in one of the four patterns.
export function backRows(isCompact: boolean, pattern = 0): Row[] {
  const [a, b] = BACK_PATTERNS[pattern] ?? BACK_PATTERNS[0]!
  const rows = isCompact ? ['┌───┐', '│' + b!.slice(0, 3) + '│', '└───┘'] : ['┌─────┐', '│' + a + '│', '│' + b + '│', '│' + a + '│', '└─────┘']

  return rows.map(text => ({ text, tone: 'back' as const }))
}

// An empty pile: a dashed outline, with an optional mark in the middle.
export function slotRows(isCompact: boolean, mark = ' '): Row[] {
  const rows = isCompact
    ? ['┌╌╌╌┐', '╎ ' + mark + ' ╎', '└╌╌╌┘']
    : ['┌╌╌╌╌╌┐', '╎     ╎', '╎  ' + mark + '  ╎', '╎     ╎', '└╌╌╌╌╌┘']

  return rows.map(text => ({ text, tone: 'slot' as const }))
}

// How tightly a column fans, loosest first: rows per face-down card (0 folds them all into one counted row),
// rows per face-up card above the last, and how many of the deepest face-up cards fold into one "+n" row.
export type Fan = { down: 0 | 1; up: 1 | 2; fold: number }
export const FANS: Fan[] = [
  { down: 1, up: 2, fold: 0 },
  { down: 1, up: 1, fold: 0 },
  { down: 0, up: 1, fold: 0 },
]

// Where each part of a fanned column sits: a face-down card, the folded face-down cards, a face-up card, or
// the folded face-up cards; `index` is into `down` or `up`, `y` and `h` its rows from the column's top.
export type FanPart = { kind: 'down' | 'downs' | 'up' | 'fold'; index: number; count: number; y: number; h: number }

// The parts of a column under a fan, and the rows it takes. An empty column takes a card's height.
export function fanLayout(downs: number, ups: number, isCompact: boolean, fan: Fan): { parts: FanPart[]; height: number } {
  const full = cardHeight(isCompact)
  const parts: FanPart[] = []
  let y = 0
  if (downs > 0 && fan.down === 0) parts.push({ kind: 'downs', index: 0, count: downs, y: y++, h: 1 })
  if (downs > 0 && fan.down === 1) for (let i = 0; i < downs; i++) parts.push({ kind: 'down', index: i, count: 1, y: y++, h: ups === 0 && i === downs - 1 ? full : 1 })
  const fold = Math.min(fan.fold, Math.max(0, ups - 1))
  if (fold > 0) parts.push({ kind: 'fold', index: 0, count: fold, y: y++, h: 1 })
  for (let i = fold; i < ups; i++) {
    const h = i === ups - 1 ? full : fan.up
    parts.push({ kind: 'up', index: i, count: 1, y, h })
    y += h
  }
  const last = parts[parts.length - 1]

  return { parts, height: last ? last.y + last.h : full }
}

// The loosest fan that fits a column in `room` rows, folding the deepest face-up cards when even the tightest
// does not.
export function fitFan(downs: number, ups: number, isCompact: boolean, room: number): Fan {
  for (const fan of FANS) if (fanLayout(downs, ups, isCompact, fan).height <= room) return fan
  const tight = FANS[FANS.length - 1]!
  const over = fanLayout(downs, ups, isCompact, tight).height - room

  return { ...tight, fold: Math.min(Math.max(0, ups - 1), over + 1) }
}

// The rows one part of a fanned column draws. Face-up cards from `liftedFrom` on are lit; none when negative.
export function partRows(p: FanPart, up: Card[], isCompact: boolean, liftedFrom = -1, pattern = 0): Row[] {
  const w = cardWidth(isCompact)
  if (p.kind === 'down') return backRows(isCompact, pattern).slice(0, p.h === 1 ? 1 : undefined)
  if (p.kind === 'downs') return [{ text: '┌' + padEnd('×' + p.count, w - 2).replace(/ /g, '─') + '┐', tone: 'back' }]
  if (p.kind === 'fold') return [{ text: '│' + center('+' + p.count, w - 2) + '│', tone: 'black' }]
  const c = up[p.index]!
  const isLit = liftedFrom >= 0 && p.index >= liftedFrom

  return p.h === 1 ? [stripRow(c, isCompact, isLit)] : cardRows(c, isCompact, isLit).slice(0, p.h)
}

// A whole column's rows under a fan (the loosest by default): a face-down card shows its top edge, a face-up
// card its top two rows, the last one whole; an empty column is a slot.
export function columnRows(down: Card[], up: Card[], isCompact: boolean, liftedFrom = -1, fan: Fan = FANS[0]!, pattern = 0): Row[] {
  if (down.length === 0 && up.length === 0) return slotRows(isCompact)

  return fanLayout(down.length, up.length, isCompact, fan).parts.flatMap(p => partRows(p, up, isCompact, liftedFrom, pattern))
}

// The chip faces, one row each: the denomination between the chip's edges.
export function chipRow(denom: Denom): Row {
  return { text: '(' + padEnd(padStart(String(denom), 2), 3) + ')', tone: ('chip' + denom) as Tone }
}

// A stack of `count` chips, at most `cap` rows tall, top chip first; its height shows how many there are.
export function chipStack(denom: Denom, count: number, cap: number): Row[] {
  return Array.from({ length: Math.min(count, Math.max(1, cap)) }, () => chipRow(denom))
}
