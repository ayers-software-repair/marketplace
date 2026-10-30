// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'tldr', surface: 'terminal', component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false },
} as const
const TURN = { turnId: 'main', reason: 'answer', durationMs: 1, isAborted: false, usage: null } as const
const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

test('the band summarises off the turn, carries open items and the latest prompt, and puts asks first in bold', async ($, on) => {
  const clock = mock.clock(on)
  const prompts: string[] = []
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.panes', () => ({ value: [] }))
  on('model.complete', ($, e) => {
    expect(e.model).toBe('haiku')
    expect(e.maxTokens).toBe(400)
    expect(e.timeoutMs).toBe(20000)
    prompts.push(e.prompt)
    return { value: { isAnswered: true, text: 'Tests passed\nYOU: pick a name', usage } }
  })

  expect(await $.prompt.submit({ text: 'Please repair the parser' })).toEqual({ text: 'Please repair the parser' })
  expect(await $.turn.complete({ ...TURN, answer: 'Parser repaired. Which name?' })).toEqual({ text: '' })
  expect(prompts).toEqual([])
  await clock.settle()
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: 'YOU: pick a name' }))?.props.bold).toBe(true)
  expect(await ui.find({ type: 'Text', text: '• Tests passed' })).toBeDefined()
  await ui.unmount()

  await $.prompt.submit({ text: 'What about the tests?' })
  await $.turn.complete({ ...TURN, answer: 'All tests passed.' })
  await clock.settle()
  expect(prompts[1]).toContain('OPEN ITEMS BEFORE:\nYOU: pick a name')
  expect(prompts[1]).toContain("THE READER'S LATEST MESSAGE:\nWhat about the tests?")
  expect(prompts[1]).toContain('REPLY 1 of 2:\nParser repaired. Which name?')
  expect(prompts[1]).toContain('REPLY 2 of 2:\nAll tests passed.')
})

for (const failure of ['unavailable', 'empty', 'denied']) test(failure + ' summaries retain open items and show the current reply', async ($, on) => {
  const clock = mock.clock(on)
  let mode = 'seed'
  on('turn.complete', () => ({ text: '' }))
  on('ui.panes', () => ({ value: [] }))
  on('model.complete', () => mode === 'denied'
    ? { deny: 'model unavailable' }
    : { value: { isAnswered: mode !== 'unavailable', text: mode === 'seed' ? 'YOU: approve the plan\nOld fact' : '', usage } })

  await $.turn.complete({ ...TURN, answer: 'Approve the plan?' })
  await clock.settle()
  mode = failure
  await $.turn.complete({ ...TURN, answer: 'Current reply.' })
  await clock.settle()
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: 'YOU: approve the plan' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '• Current reply.' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '• Old fact' })).toBeUndefined()
  await ui.unmount()
})

test('subagent, interrupted and empty turns do not ask for a summary', async ($, on) => {
  const clock = mock.clock(on)
  let calls = 0
  on('turn.complete', () => ({ text: '' }))
  on('model.complete', () => {
    calls += 1
    return { value: { isAnswered: false, text: '', usage } }
  })
  await $.turn.complete({ ...TURN, agentId: 'worker', answer: 'Worker answer' })
  await $.turn.complete({ ...TURN, reason: 'interrupted', isAborted: true, answer: 'Partial answer' })
  await $.turn.complete({ ...TURN, answer: '   ' })
  await clock.settle()
  expect(calls).toBe(0)
})

test('a late older summary cannot overwrite the newest summary', async ($, on) => {
  const clock = mock.clock(on)
  let calls = 0
  on('turn.complete', () => ({ text: '' }))
  on('ui.panes', () => ({ value: [] }))
  on('model.complete', async () => {
    calls += 1
    if (calls === 1) {
      await clock.sleep(1000)
      return { value: { isAnswered: true, text: 'Old summary', usage } }
    }
    return { value: { isAnswered: true, text: 'Newest summary', usage } }
  })
  await $.turn.complete({ ...TURN, answer: 'Old answer' })
  await clock.settle()
  expect(calls).toBe(1)
  await $.turn.complete({ ...TURN, answer: 'New answer' })
  await clock.settle()
  await clock.advance(1000)
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: '• Newest summary' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '• Old summary' })).toBeUndefined()
  await ui.unmount()
})

test('the band yields to surveys and a placed cards pane, and returns when the pane closes', async ($, on) => {
  let isPlaced = false
  on('ui.panes', () => ({ value: isPlaced ? [{ id: 'cards', isPlaced: true }] : [] }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['Host content'] }))
  const survey = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true } })
  expect(await survey.find({ type: 'Text', text: 'Host content' })).toBeDefined()
  await survey.unmount()
  isPlaced = true
  const cards = await $.ui.mount(BAND)
  expect(await cards.find({ type: 'Text', text: 'Host content' })).toBeDefined()
  await cards.unmount()
  isPlaced = false
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Text', text: 'TL;DR shows here after the next reply.' })).toBeDefined()
  await band.unmount()
})
