// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

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
