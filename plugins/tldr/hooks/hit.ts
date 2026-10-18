// Copyright Ayers Electronics Inc. All rights reserved.

// Which part of a scene is under a cell: the last-placed sprite whose box holds it, as the painter draws later
// sprites over earlier ones. Decoration (an empty id) is never hit.

import type { Scene, Sprite } from './scene'

const holds = (s: Sprite, x: number, y: number) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h

// The sprite at cell x, y, skipping the ids in `hide` (the cards a drag has lifted).
export function hitAt(scene: Scene, x: number, y: number, hide: readonly string[] = []): Sprite | undefined {
  for (let i = scene.sprites.length - 1; i >= 0; i--) {
    const s = scene.sprites[i]!
    if (s.id !== '' && !hide.includes(s.id) && holds(s, x, y)) return s
  }

  return undefined
}

// The pile a drop at x, y lands on: the pile of whatever is under it.
export function pileAt(scene: Scene, x: number, y: number, hide: readonly string[] = []): string | undefined {
  const s = hitAt(scene, x, y, hide)

  return s ? (s.pile ?? s.id) : undefined
}
