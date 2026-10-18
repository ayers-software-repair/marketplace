// Copyright Ayers Electronics Inc. All rights reserved.

// The row pinned to the bottom of the cards pane: WAITING ON YOU on the left and TL;DR on the right, each its
// lines wrapped to its width and cut to its rows with "+N more"; stacked, waiting first, when the pane is narrow.
// Its height, the rule above it included, is never more than BOTTOM_ROWS.

import { NOTHING_WAITING } from './shape'

export const BOTTOM_ROWS = 6
export const TWO_COLUMNS_FROM = 60

export type Line = { text: string; kind: 'head' | 'ask' | 'fact' | 'quiet' | 'more' }
export type Bottom = { columns: Line[][]; isStacked: boolean; width: number; height: number }

// Words wrapped to `width`; a word longer than the width is broken.
export function wrap(s: string, width: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of s.split(/\s+/).filter(Boolean)) {
    let w = word
    while (w.length > width) {
      if (line) out.push(line)
      out.push(w.slice(0, width))
      w = w.slice(width)
      line = ''
    }
    if (!line) line = w
    else if (line.length + 1 + w.length <= width) line += ' ' + w
    else {
      out.push(line)
      line = w
    }
  }
  if (line) out.push(line)

  return out
}

// A heading over items, wrapped, in at most `rows` rows; the last row says how many items did not fit.
export function column(head: string, items: string[], kind: Line['kind'], quiet: string, width: number, rows: number): Line[] {
  const out: Line[] = [{ text: head, kind: 'head' }]
  if (items.length === 0) return [...out, ...wrap(quiet, width).slice(0, rows - 1).map(text => ({ text, kind: 'quiet' as const }))]
  for (let i = 0; i < items.length; i++) {
    const lines = wrap(items[i]!, width)
    const after = items.length - i - 1
    const room = rows - out.length - (after > 0 ? 1 : 0)
    if (lines.length <= room) {
      out.push(...lines.map(text => ({ text, kind })))
      continue
    }
    // It does not fit: as much as does, its last line ending in an ellipsis, then how many items are left.
    const shown = lines.slice(0, Math.max(0, room))
    if (shown.length > 0) shown[shown.length - 1] = shown[shown.length - 1]!.slice(0, Math.max(0, width - 1)) + '…'
    out.push(...shown.map(text => ({ text, kind })))
    const more = after + (shown.length > 0 ? 0 : 1)
    if (more > 0) out.push({ text: '+' + more + ' more', kind: 'more' })

    return out.slice(0, rows)
  }

  return out
}

// The bottom row from the band's lines: "YOU:" lines are what is waiting on the reader, the rest are facts.
export function bottom(lines: readonly string[], cols: number): Bottom {
  const asks = lines.filter(l => l.startsWith('YOU:') && l !== NOTHING_WAITING).map(l => l.slice(4).trim())
  const facts = lines.filter(l => !l.startsWith('YOU:')).map(l => '• ' + l)
  const isStacked = cols < TWO_COLUMNS_FROM
  const width = isStacked ? cols : Math.floor((cols - 3) / 2)
  const rows = BOTTOM_ROWS - 1
  const waiting = (n: number) => column('WAITING ON YOU', asks, 'ask', 'Nothing is waiting on you.', width, n)
  const tldr = (n: number) => column('TL;DR', facts, 'fact', 'Shows after the next reply.', width, n)
  if (isStacked) {
    const left = waiting(3)
    const right = tldr(rows - left.length)

    return { columns: [left, right], isStacked, width, height: 1 + left.length + right.length }
  }
  const left = waiting(rows)
  const right = tldr(rows)

  return { columns: [left, right], isStacked, width, height: 1 + Math.max(left.length, right.length) }
}
