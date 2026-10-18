// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import { solitaire } from './game-solitaire'
import { hitAt, pileAt } from './hit'
import { paint, plain } from './paint'
import type { Scene } from './scene'
import { put, text } from './scene'
import { ROOM, klondike } from './table-fixture'

test('the last sprite placed over a cell is hit; decoration and hidden sprites are not', () => {
  const scene: Scene = {
    w: 20,
    h: 6,
    sprites: [{ id: 'zone', x: 0, y: 0, w: 7, h: 6 }, put('low', 0, 0, [{ text: 'aaaaaaa', tone: 'red' }, { text: 'aaaaaaa', tone: 'red' }]), put('high', 0, 1, [{ text: 'bbbbbbb', tone: 'black' }]), text(10, 0, 'label')],
  }
  expect(hitAt(scene, 3, 0)?.id).toBe('low')
  expect(hitAt(scene, 3, 1)?.id).toBe('high')
  expect(hitAt(scene, 3, 4)?.id).toBe('zone')
  expect(hitAt(scene, 11, 0)).toBe(undefined)
  expect(hitAt(scene, 3, 1, ['high'])?.id).toBe('low')
  expect(hitAt(scene, 7, 0)).toBe(undefined)
})

test('in a Klondike table each card is hit where it is drawn, and below a column its drop zone', () => {
  const scene = solitaire.scene(klondike(), ROOM)
  const seven = scene.sprites.find(s => s.id === 'c0:0')!
  const six = scene.sprites.find(s => s.id === 'c0:1')!
  expect(hitAt(scene, seven.x + 2, seven.y)?.id).toBe('c0:0')
  expect(hitAt(scene, six.x + 2, six.y + 2)?.id).toBe('c0:1')
  expect(hitAt(scene, six.x + 2, ROOM.rows - 1)?.id).toBe('c0')
  expect(pileAt(scene, six.x + 2, six.y + 1)).toBe('c0')
  const empty = scene.sprites.find(s => s.id === 'c3' && s.rows)!
  expect(pileAt(scene, empty.x + 1, empty.y + 1)).toBe('c3')
  expect(hitAt(scene, scene.sprites.find(s => s.id === 'waste')!.x + 1, 1)?.id).toBe('waste')
  expect(pileAt(scene, scene.sprites.find(s => s.id === 'f2')!.x + 1, 1)).toBe('f2')
})

test('the painted table and the hit map agree: under every card sprite the paint shows its rows', () => {
  const scene = solitaire.scene(klondike(), ROOM)
  const rows = plain(paint(scene))
  expect(rows.length).toBe(ROOM.rows)
  expect(rows.every(r => r.length === ROOM.cols)).toBe(true)
  for (const s of scene.sprites.filter(x => x.rows && x.id !== '')) {
    s.rows!.forEach((r, i) => expect(rows[s.y + i]!.slice(s.x, s.x + r.text.length)).toBe(r.text))
  }
})

test('a take lights the run and marks only the legal places; a drag hides the run and draws it at the pointer', () => {
  const lifted = solitaire.point(klondike(), { act: 'click', id: 'c0:0' }, Math.random)
  const scene = solitaire.scene(lifted, ROOM)
  expect(scene.sprites.find(s => s.id === 'c0:0')!.rows![0]!.tone).toBe('redLit')
  expect(scene.sprites.filter(s => s.target).map(s => s.pile)).toEqual(['c1'])
  const seven = solitaire.scene(klondike(), ROOM).sprites.find(s => s.id === 'c0:0')!
  expect(seven.drag!.to).toEqual(['c1'])
  expect(seven.drag!.hide).toEqual(['c0:0', 'c0:1'])
  const painted = plain(paint(solitaire.scene(klondike(), ROOM), { drag: { id: 'c0:0', x: 40, y: 12 } }))
  expect(painted[12]!.slice(40, 47)).toBe('┌─────┐')
  expect(painted[13]!.slice(40, 47)).toBe('│7    │')
  expect(painted[14]!.slice(40, 47)).toBe('┌─────┐')
  expect(painted[15]!.slice(40, 47)).toBe('│6    │')
  const lit = paint(solitaire.scene(klondike(), ROOM), { drag: { id: 'c0:0', x: 40, y: 12 } })
  expect(lit[13]!.find(g => g.text.includes('7'))!.tone).toBe('redLit')
  expect(painted[seven.y + 1]!.slice(seven.x, seven.x + 7)).not.toBe('│7    │')
})
