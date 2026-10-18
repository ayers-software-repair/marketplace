// Copyright Ayers Electronics Inc. All rights reserved.

// The mouse on the card table, run by the surface that draws it (the fullscreen terminal, the desktop app).
// It paints the scene the pane hands it, lights what the pointer can take or drop on, carries a dragged run
// with the pointer, and posts what the person did as a Point: a click, a double-click or a drop on a pile.
// Game rules stay in the hooks module, which applies each Point to the table.

import type { ClientModule, ClientPointerEvent } from 'claude-code'

import { drawLines } from './draw-lines'
import { hitAt, pileAt } from './hit'
import { paint } from './paint'
import type { Point, Scene } from './scene'
import type { Theme } from './theme'

export type TableProps = { scene: Scene; theme: Theme }

// What the pointer is doing: the sprite it lights, the sprite a button went down on (and where on it), the
// drag's position once the pointer moved with the button held, and the last click, for a double-click.
type Pointer = {
  hover?: string
  press?: { id: string; x: number; y: number; dx: number; dy: number }
  drag?: { x: number; y: number; over?: string }
  last?: { id: string; at: number }
}

export const DOUBLE_MS = 450

const now = () => (typeof Date === 'function' ? Date.now() : 0)

const Table: ClientModule<TableProps, Pointer> = (props, surface) => {
  const { scene, theme } = props
  const set = (next: Pointer) => surface.setState(next)
  const post = (p: Point) => surface.post(p)

  surface.onPointer((e: ClientPointerEvent) => {
    const v = surface.state ?? {}
    if (e.type === 'leave') {
      if (v.hover !== undefined && !v.press) set({ ...v, hover: undefined })

      return
    }
    if (e.type === 'down') {
      const s = e.button === 'left' ? hitAt(scene, e.x, e.y) : undefined
      set({ ...v, press: s?.hot ? { id: s.id, x: e.x, y: e.y, dx: e.x - s.x, dy: e.y - s.y } : undefined, drag: undefined })

      return
    }
    if (e.type === 'move' || e.type === 'enter') {
      const held = v.press && e.button !== undefined ? v.press : undefined
      const grabbed = held ? scene.sprites.find(s => s.id === held.id) : undefined
      if (held && grabbed?.drag && (v.drag || e.x !== held.x || e.y !== held.y)) {
        set({ ...v, hover: undefined, drag: { x: e.x, y: e.y, over: pileAt(scene, e.x, e.y, grabbed.drag.hide) } })

        return
      }
      const under = hitAt(scene, e.x, e.y)
      const hover = under?.hot ? under.id : undefined
      if (hover !== v.hover) set({ ...v, hover })

      return
    }
    if (e.type === 'up') {
      const p = v.press
      if (!p) return
      const grabbed = scene.sprites.find(s => s.id === p.id)
      if (v.drag && grabbed?.drag) {
        const to = pileAt(scene, e.x, e.y, grabbed.drag.hide)
        set({ hover: undefined })
        if (to !== undefined && grabbed.drag.to.includes(to)) post({ act: 'drop', id: p.id, to })

        return
      }
      const at = now()
      const isDouble = v.last !== undefined && v.last.id === p.id && at - v.last.at < DOUBLE_MS
      post({ act: isDouble ? 'double' : 'click', id: p.id })
      set({ hover: v.hover, last: isDouble ? undefined : { id: p.id, at } })
    }
  })

  const v = surface.state ?? {}
  const drag = v.press && v.drag ? { id: v.press.id, x: v.drag.x - v.press.dx, y: v.drag.y - v.press.dy } : undefined

  return drawLines(surface.elements, paint(scene, { hover: v.hover, drag, over: v.drag?.over }), theme)
}

export default Table
