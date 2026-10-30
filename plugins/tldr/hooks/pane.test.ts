// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

test('/cards is registered at session start, opens a focused pane and closes it on the next command', async ($, on) => {
  let isOpen = false
  const actions: string[] = []
  on('session.start', () => ({ cwd: '/work' }))
  on('command.register', ($, e) => {
    expect(e.name).toBe('cards')
    expect(e.immediate).toBe(true)
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: isOpen ? [{ id: 'cards', isPlaced: true }] : [] }))
  on('ui.open', ($, e) => {
    expect(e.id).toBe('cards')
    expect(e.focus).toBe(true)
    isOpen = true
    actions.push('open')
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, e) => {
    expect(e.id).toBe('cards')
    isOpen = false
    actions.push('close')
    return { value: undefined }
  })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  expect(await $.command.run({ command: 'cards', args: '' })).toEqual({})
  expect(await $.command.run({ command: 'cards', args: '' })).toEqual({})
  expect(actions).toEqual(['open', 'close'])
})

test('the cards pane opens on the menu and a press plays a game', async $ => {
  const ui = await $.ui.mount({
    plugin: 'tldr',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'cards',
    props: { title: 'Cards', isFocused: true, bodyColumns: 80, placement: 'inline' },
  } as never)
  expect(await ui.find({ type: 'Text', text: /BLACKJACK/ })).toBeDefined()
  await ui.press({ key: 'play-solitaire' })
  expect(await ui.find({ type: 'Text', text: /Press Draw|Stock|New Deal/ })).toBeDefined()
  expect(await ui.find({ key: 'draw' })).toBeDefined()
  await ui.unmount()
})
