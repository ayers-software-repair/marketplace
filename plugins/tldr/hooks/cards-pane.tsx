// Copyright Ayers Electronics Inc. All rights reserved.

// The /cards pane: the game chooser and ten card games on a felt table, with WAITING ON YOU and TL;DR pinned
// under it. Where the surface carries the mouse (the desktop app, the fullscreen terminal) the table is a
// `Client` the person clicks and drags on; everywhere the same table is drawn still and the buttons and keys
// under it play every move. Nothing here hooks a turn, a tool or a prompt.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Table } from '../types'
import type { Line } from './bottom'
import { money } from './chips'
import { drawLines } from './draw-lines'
import { paint } from './paint'
import { DEFAULT_ROWS, paneLayout, screenOf } from './pane-layout'
import type { Point } from './scene'
import type { Control } from './screen'
import { buttonLabel } from './screen'
import { FRESH, normalize } from './table-state'
import { FELT_COLORS } from './theme'

const PANE = 'cards'

const lines = atom({ plugin: 'tldr', key: 'lines' } as const, [] as string[])
const table = atom({ plugin: 'tldr', key: 'table' } as const, FRESH)

// The Point a table posted, or null when the data is not one.
function asPoint(data: unknown): Point | null {
  if (typeof data !== 'object' || data === null) return null
  const d = data as Record<string, unknown>
  const isAct = d.act === 'click' || d.act === 'double' || d.act === 'drop'
  if (!isAct || typeof d.id !== 'string' || d.id.length > 64) return null
  if (d.to !== undefined && (typeof d.to !== 'string' || d.to.length > 64)) return null

  return { act: d.act as Point['act'], id: d.id, ...(typeof d.to === 'string' ? { to: d.to } : {}) }
}

const change = ($: EngineInterface, f: (t: Table) => Table) => void update($, table, raw => f(normalize(raw)))

const LINE_LOOK: Record<Line['kind'], { bold?: boolean; color?: string; dimColor?: boolean }> = {
  head: { bold: true },
  ask: { bold: true, color: 'warning' },
  fact: {},
  quiet: { dimColor: true },
  more: { dimColor: true },
}

export const registerCards: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'cards', description: 'Play cards in a pane while the agent works', immediate: true })

    return next(e)
  })

  // /cards opens the pane, and closes it when it is already open.
  on('command.run', { command: 'cards' }, async $ => {
    const isUp = (await $.ui.panes()).some(p => p.id === PANE)
    if (isUp) {
      await $.ui.close({ id: PANE })
    } else {
      await $.ui.open({ id: PANE, title: 'Cards', focus: true })
    }

    return {}
  })

  // A click, double-click or drop on the table, applied by the game on screen.
  on('ui.message', async ($, e) => {
    const p = e.requestId === PANE ? asPoint(e.data) : null
    if (p) await update($, table, raw => {
      const t = normalize(raw)

      return screenOf(t).point(t, p, Math.random)
    })

    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const t = normalize(await read($, table))
    const held = await read($, lines)
    const cols = e.props.bodyColumns
    const rows = e.props.scroll?.bodyRows ?? DEFAULT_ROWS
    const mouse = e.surface === 'desktop' || (e.surface === 'terminal' && e.viewport?.isFullscreen === true)
    const { controls: ctl, low, tableRows, room, scene } = paneLayout(t, held, cols, rows, mouse)
    const theme = { felt: t.opts.felt, back: t.opts.back }
    const felt = FELT_COLORS[t.opts.felt]
    const press = (c: Control) => () => change($, x => c.run(x, Math.random))
    const Client = 'Client' in ui && mouse ? ui.Client : undefined

    return (
      <Box flexDirection="column">
        <Box flexDirection="column" backgroundColor={felt} paddingX={1} height={tableRows}>
          {Client ? (
            <Client key="table" module="./table-client.tsx" props={{ scene, theme }} width={room.cols} height={room.rows} />
          ) : (
            drawLines(ui, paint(scene), theme)
          )}
          <Text bold color="#ffe066" backgroundColor={felt} wrap="truncate">
            {t.view === 'menu' ? 'Choose a game. Chips ' + money(t.chips) + '.' : t.msg || ' '}
          </Text>
          <Box flexWrap="wrap" columnGap={1}>
            {ctl.map(c =>
              c.primary ? (
                <Button key={c.key} label={buttonLabel(c)} hotkey={c.hotkey} variant="primary" autoFocus={c.focus || undefined} onPress={press(c)} />
              ) : (
                <Button key={c.key} label={c.label} hotkey={c.hotkey} plain autoFocus={c.focus || undefined} onPress={press(c)} />
              ),
            )}
          </Box>
        </Box>
        <Text dimColor wrap="truncate">
          {'─'.repeat(cols)}
        </Text>
        <Box flexDirection={low.isStacked ? 'column' : 'row'} columnGap={3}>
          {low.columns.map((col, i) => (
            <Box key={'col' + i} flexDirection="column" width={low.width}>
              {col.map((l, j) => (
                <Text key={'l' + j} {...LINE_LOOK[l.kind]} wrap="truncate">
                  {l.text}
                </Text>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    )
  })
}
