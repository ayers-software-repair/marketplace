// Copyright Ayers Electronics Inc. All rights reserved.

// The colours of the table: each tone of a painted cell under the chosen felt and card back, and how a cell
// looks under the pointer or as a legal target. Chips follow the Atlantic City colours (1 white, 5 red,
// 25 green, 100 black).

import type { Felt } from '../types'
import type { Tone } from './layout'
import type { Seg } from './paint'

export type Theme = { felt: Felt; back: number }
export type Look = { color: string; backgroundColor: string; bold?: boolean }

export const FELT_COLORS: Record<Felt, string> = { green: '#0b5d35', blue: '#123f6e', red: '#6b1320', charcoal: '#2b2f34' }
const FELT_LIGHT: Record<Felt, string> = { green: '#13804b', blue: '#1d5c9c', red: '#93202f', charcoal: '#444a52' }
export const BACK_COLORS = [
  { color: '#93c5fd', backgroundColor: '#1e3a8a' },
  { color: '#fecaca', backgroundColor: '#991b1b' },
  { color: '#bbf7d0', backgroundColor: '#166534' },
  { color: '#fde68a', backgroundColor: '#3f3f46' },
]

const FACE = '#f7f7f2'
const FACE_LIT = '#ffe066'
const FACE_HOVER = '#cfe8ff'
const RED = '#c8102e'
const BLACK = '#111111'
const INK = '#f1f5f1'
const GOLD = '#ffe066'
const EDGE = '#00d0ff'

export function look(tone: Tone, fx: Seg['fx'], th: Theme): Look {
  const felt = FELT_COLORS[th.felt]
  const isLit = fx === 'lit'
  const base = ((): Look => {
    switch (tone) {
      case 'red':
        return { color: RED, backgroundColor: isLit ? FACE_HOVER : FACE }
      case 'black':
        return { color: BLACK, backgroundColor: isLit ? FACE_HOVER : FACE }
      case 'redLit':
        return { color: RED, backgroundColor: FACE_LIT }
      case 'blackLit':
        return { color: BLACK, backgroundColor: FACE_LIT }
      case 'back': {
        const b = BACK_COLORS[th.back] ?? BACK_COLORS[0]!

        return isLit ? { color: b.backgroundColor, backgroundColor: b.color } : b
      }
      case 'slot':
        return { color: isLit ? GOLD : '#9fd8b4', backgroundColor: isLit ? FELT_LIGHT[th.felt] : felt }
      case 'gold':
        return { color: GOLD, backgroundColor: felt, bold: true }
      case 'dim':
        return { color: '#a7b8ad', backgroundColor: felt }
      case 'win':
        return { color: BLACK, backgroundColor: GOLD, bold: true }
      case 'key':
        return isLit ? { color: BLACK, backgroundColor: GOLD, bold: true } : { color: GOLD, backgroundColor: FELT_LIGHT[th.felt], bold: true }
      case 'chip1':
        return { color: BLACK, backgroundColor: isLit ? GOLD : '#f2f2f2', bold: true }
      case 'chip5':
        return { color: '#ffffff', backgroundColor: isLit ? '#ff4d5e' : '#c8102e', bold: true }
      case 'chip25':
        return { color: '#ffffff', backgroundColor: isLit ? '#2fbf5b' : '#1a7f37', bold: true }
      case 'chip100':
        return { color: '#ffffff', backgroundColor: isLit ? '#555555' : '#111111', bold: true }
      default:
        return { color: isLit ? GOLD : INK, backgroundColor: felt }
    }
  })()

  return fx === 'edge' ? { ...base, color: EDGE, bold: true } : base
}
