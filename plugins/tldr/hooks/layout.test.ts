// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import type { Card } from '../types'
import { backRows, cardRows, cardWidth, columnRows, slotRows } from './layout'

const k = (r: number, s: Card['s']): Card => ({ r, s })
const texts = (rows: { text: string }[]) => rows.map(r => r.text)

test('a full card is 7 by 5 with the rank in both corners and the suit in the middle', () => {
  const rows = cardRows(k(1, 'S'), false)
  expect(texts(rows)).toEqual(['┌─────┐', '│A    │', '│  ♠  │', '│    A│', '└─────┘'])
  expect(rows.every(r => r.tone === 'black')).toBe(true)
  expect(texts(cardRows(k(10, 'H'), false))[1]).toBe('│10   │')
  expect(texts(cardRows(k(10, 'H'), false))[3]).toBe('│   10│')
  expect(cardRows(k(10, 'H'), false)[0]!.tone).toBe('red')
  expect(cardRows(k(5, 'D'), false, true)[0]!.tone).toBe('redLit')
  expect(cardRows(k(5, 'C'), false, true)[0]!.tone).toBe('blackLit')
})

test('every row of a card is as wide as the card, full and compact', () => {
  for (const isCompact of [false, true]) {
    for (const c of [k(1, 'S'), k(10, 'H'), k(13, 'D')]) {
      for (const rows of [cardRows(c, isCompact), backRows(isCompact), slotRows(isCompact, '♣')]) {
        expect(rows.every(r => r.text.length === cardWidth(isCompact))).toBe(true)
      }
    }
  }
  expect(texts(cardRows(k(10, 'D'), true))).toEqual(['┌───┐', '│10♦│', '└───┘'])
  expect(cardRows(k(10, 'D'), false).length).toBe(5)
  expect(cardRows(k(10, 'D'), true).length).toBe(3)
})

test('a face-down card is patterned and an empty slot is dashed', () => {
  expect(backRows(false).every(r => r.tone === 'back')).toBe(true)
  expect(texts(backRows(false))[1]).toBe('│░▒░▒░│')
  expect(texts(slotRows(false, '♥'))[2]).toBe('╎  ♥  ╎')
  expect(slotRows(true).every(r => r.tone === 'slot')).toBe(true)
})

test('a column fans: down cards show an edge, face-up cards two rows, the last one whole', () => {
  const rows = columnRows([k(3, 'S'), k(4, 'S')], [k(9, 'H'), k(8, 'S'), k(7, 'D')], false)
  expect(rows.length).toBe(2 + 2 + 2 + 5)
  expect(rows[0]!.tone).toBe('back')
  expect(rows[1]!.tone).toBe('back')
  expect(rows[2]!.text).toBe('┌─────┐')
  expect(rows[3]!.text).toBe('│9    │')
  expect(rows[rows.length - 1]!.text).toBe('└─────┘')
  expect(columnRows([], [k(9, 'H'), k(8, 'S')], true).length).toBe(2 + 3)
})

test('a lifted run is lit from its first card, and an empty column is a slot', () => {
  const rows = columnRows([], [k(9, 'H'), k(8, 'S'), k(7, 'D')], false, 1)
  expect(rows[0]!.tone).toBe('red')
  expect(rows[2]!.tone).toBe('blackLit')
  expect(rows[rows.length - 1]!.tone).toBe('redLit')
  expect(columnRows([], [], false)).toEqual(slotRows(false))
})
