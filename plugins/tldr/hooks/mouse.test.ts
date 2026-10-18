// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'
import type { Mounted } from 'claude-code/testing'

import type { Scene, Sprite } from './scene'

const PANE = { title: 'Cards', isFocused: true, bodyColumns: 118, placement: 'dock', scroll: { offset: 0, bodyRows: 40 } }
const SURFACES = [
  { surface: 'desktop' as const },
  { surface: 'terminal' as const, viewport: { columns: 120, rows: 44, isFullscreen: true } },
]

type Ui = Mounted<'desktop' | 'terminal', 'Pane'>

// The scene the pane handed its table `Client`, read off the drawn tree.
async function sceneOf(ui: Ui): Promise<Scene> {
  const walk = (n: unknown): Scene | undefined => {
    if (typeof n !== 'object' || n === null) return undefined
    const node = n as { type?: string; props?: { props?: { scene?: Scene } }; children?: unknown[] }
    if (node.type === 'Client') return node.props?.props?.scene

    return (node.children ?? []).map(walk).find(Boolean)
  }

  return walk(await ui.drawn())!
}

const at = (s: Sprite) => ({ x: s.x + 1, y: s.y })
const topOf = (scene: Scene, pile: string) => scene.sprites.filter(s => s.pile === pile && s.top && s.rows).pop()!
const texts = (s: Sprite) => s.rows!.map(r => r.text)

async function click(ui: Ui, x: number, y: number) {
  await ui.pointer({ type: 'down', x, y, button: 'left' })
  await ui.pointer({ type: 'up', x, y, button: 'left' })
}

// A single card that can be dragged somewhere: the stock is drawn until one shows.
async function movable(ui: Ui): Promise<Sprite> {
  for (let i = 0; i < 60; i++) {
    const found = (await sceneOf(ui)).sprites.find(s => s.drag && s.drag.hide.length === 1 && s.drag.to.some(p => p.startsWith('c')))
    if (found) return found
    await ui.press({ key: 'draw' })
  }
  throw new Error('no movable card in 60 draws')
}

for (const where of SURFACES) {
  test('Klondike by mouse on ' + where.surface + ': click to lift and drop, drag to move, an illegal drag snaps back', async $ => {
    const ui = (await $.ui.mount({ plugin: 'tldr', component: 'Pane', requestId: 'cards', props: PANE, ...where } as never)) as Ui
    await ui.press({ key: 'play-solitaire' })
    const card = await movable(ui)
    const pile = card.drag!.to.find(p => p.startsWith('c'))!
    const face = texts(card)

    await click(ui, at(card).x, at(card).y)
    const lifted = await sceneOf(ui)
    expect(lifted.sprites.find(s => s.id === card.id)!.rows![0]!.tone.endsWith('Lit')).toBe(true)
    expect(topOf(lifted, pile).target).toBe(true)
    const onto = topOf(lifted, pile)
    await click(ui, at(onto).x, at(onto).y)
    expect(texts(topOf(await sceneOf(ui), pile))).toEqual(face)

    await ui.press({ key: 'new' })
    const next = await movable(ui)
    const before = JSON.stringify(await sceneOf(ui))
    const wrong = (await sceneOf(ui)).sprites.find(s => s.pile?.startsWith('f') && !next.drag!.to.includes(s.pile))!
    await ui.pointer({ type: 'down', ...at(next), button: 'left' })
    await ui.pointer({ type: 'move', x: wrong.x + 1, y: wrong.y + 1, button: 'left' })
    const carried = await ui.drawn({ in: 'table' })
    expect(JSON.stringify(carried).includes(texts(next)[1]!)).toBe(true)
    await ui.pointer({ type: 'up', x: wrong.x + 1, y: wrong.y + 1, button: 'left' })
    expect(JSON.stringify(await sceneOf(ui))).toBe(before)

    const goal = topOf(await sceneOf(ui), next.drag!.to.find(p => p.startsWith('c'))!)
    await ui.pointer({ type: 'down', ...at(next), button: 'left' })
    await ui.pointer({ type: 'move', x: goal.x + 2, y: goal.y, button: 'left' })
    await ui.pointer({ type: 'up', x: goal.x + 2, y: goal.y, button: 'left' })
    expect(texts(topOf(await sceneOf(ui), goal.pile!))).toEqual(texts(next))
    await ui.unmount()
  })

  test('video poker by mouse on ' + where.surface + ': a click on a card holds it, a second click lets it go', async $ => {
    const ui = (await $.ui.mount({ plugin: 'tldr', component: 'Pane', requestId: 'cards', props: PANE, ...where } as never)) as Ui
    await ui.press({ key: 'play-poker' })
    await ui.press({ key: 'deal' })
    const card = (await sceneOf(ui)).sprites.find(s => s.id === 'card:2')!
    await click(ui, at(card).x, at(card).y + 1)
    expect((await sceneOf(ui)).sprites.find(s => s.id === 'card:2')!.rows![0]!.tone.endsWith('Lit')).toBe(true)
    expect(await ui.find({ key: 'hold2', text: 'Held 3' })).toBeDefined()
    await click(ui, at(card).x, at(card).y + 1)
    expect((await sceneOf(ui)).sprites.find(s => s.id === 'card:2')!.rows![0]!.tone.endsWith('Lit')).toBe(false)
    await ui.unmount()
  })
}

test('a chip stack clicked raises the bet, the bet pile clicked takes a chip back, and a hover lights only what can be pressed', async $ => {
  const ui = (await $.ui.mount({ plugin: 'tldr', component: 'Pane', requestId: 'cards', props: PANE, surface: 'desktop' } as never)) as Ui
  await ui.press({ key: 'play-blackjack' })
  const five = (await sceneOf(ui)).sprites.find(s => s.id === 'chip:5')!
  await click(ui, five.x + 1, five.y)
  expect((await sceneOf(ui)).sprites.find(s => s.id === '' && s.rows?.[0]?.text.startsWith('BET '))!.rows![0]!.text.trim()).toBe('BET 10')
  const bet = (await sceneOf(ui)).sprites.find(s => s.id === 'bet')!
  const lit = '"backgroundColor":"#ff4d5e"'
  expect(JSON.stringify(await ui.drawn({ in: 'table' })).includes(lit)).toBe(false)
  await ui.pointer({ type: 'move', x: bet.x + 1, y: bet.y })
  expect(JSON.stringify(await ui.drawn({ in: 'table' })).includes(lit)).toBe(true)
  await click(ui, bet.x + 1, bet.y)
  expect((await sceneOf(ui)).sprites.find(s => s.rows?.[0]?.text.startsWith('BET '))!.rows![0]!.text.trim()).toBe('BET 5')
  await ui.unmount()
})

test('without the mouse (the terminal main screen, vscode) the table is drawn still and the pile buttons play', async $ => {
  for (const where of [{ surface: 'terminal' as const, viewport: { columns: 80, rows: 30, isFullscreen: false } }, { surface: 'vscode' as const }]) {
    const ui = await $.ui.mount({ plugin: 'tldr', component: 'Pane', requestId: 'cards', props: { ...PANE, bodyColumns: 78, scroll: { offset: 0, bodyRows: 30 } }, ...where } as never)
    expect(await ui.find({ type: 'Client' })).toBe(undefined)
    if (await ui.find({ type: 'Button', key: 'menu' })) await ui.press({ key: 'menu' })
    await ui.press({ key: 'play-solitaire' })
    expect(await ui.find({ type: 'Text', text: /┌/ })).toBeDefined()
    let take = (await ui.findAll({ type: 'Button' })).find(b => /^(col\d|waste)$/.test(b.props.key as string) && /^Take/.test(b.text ?? ''))
    for (let i = 0; i < 60 && !take; i++) {
      await ui.press({ key: 'draw' })
      take = (await ui.findAll({ type: 'Button' })).find(b => /^(col\d|waste)$/.test(b.props.key as string) && /^Take/.test(b.text ?? ''))
    }
    await ui.press({ key: take!.props.key as string })
    expect(await ui.find({ type: 'Button', key: take!.props.key as string, text: 'Back' })).toBeDefined()
    await ui.unmount()
  }
})
