// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import { KEPT_REPLIES, MAX_ASKS, MAX_FACTS, NOTHING_WAITING, askFor, asksOf, cutReply, fallbackLines, keepRecent, linesOf } from './shape'

test('keeps only the last few replies, newest last, and skips an empty one', () => {
  let kept: string[] = []
  for (const reply of ['one', 'two', '   ', 'three', 'four']) kept = keepRecent(kept, reply)

  expect(kept.length).toBe(KEPT_REPLIES)
  expect(kept).toEqual(['two', 'three', 'four'])
})

test('open items come first whatever order the summary gave, with bullets stripped and both kinds capped', () => {
  const text = ['- Astra work is committed', 'YOU: run the bootstrap', '* nothing pushed', '2. YOU: clean ffmpeg, yes?', 'a', 'b', 'YOU: 3', 'YOU: 4', 'YOU: 5'].join('\n')
  const lines = linesOf(text)

  expect(lines.slice(0, MAX_ASKS)).toEqual(['YOU: run the bootstrap', 'YOU: clean ffmpeg, yes?', 'YOU: 3', 'YOU: 4'])
  expect(lines.slice(MAX_ASKS)).toEqual(['Astra work is committed', 'nothing pushed', 'a'])
  expect(lines.length).toBe(MAX_ASKS + MAX_FACTS)
  expect(linesOf('a'.repeat(300))[1]?.length).toBe(110)
})

test('a summary with no open item says so, and that line is not carried as an open item', () => {
  const lines = linesOf('the merge is done')

  expect(lines).toEqual([NOTHING_WAITING, 'the merge is done'])
  expect(asksOf(lines)).toEqual([])
})

test('the summariser is handed the open items, the reader\'s latest message and every kept reply', () => {
  const ask = askFor(['first reply', 'second reply'], ['YOU: pick a plan'], 'go with the first')

  expect(ask.includes('OPEN ITEMS BEFORE:\nYOU: pick a plan')).toBe(true)
  expect(ask.includes("THE READER'S LATEST MESSAGE:\ngo with the first")).toBe(true)
  expect(ask.includes('REPLY 2 of 2:\nsecond reply')).toBe(true)
  expect(askFor(['r'], [], '').includes('OPEN ITEMS BEFORE:\nnone')).toBe(true)
})

test('with no summary the open items already held stay on the band', () => {
  const lines = fallbackLines(['YOU: pick a plan', 'old fact'], 'New work landed.\nTests pass.')

  expect(lines).toEqual(['YOU: pick a plan', 'New work landed.', 'Tests pass.'])
})

test('a long reply keeps its opening and its end, so a closing question reaches the summariser', () => {
  const cut = cutReply(`Opening line.\n${'filler '.repeat(2000)}\nWhich one do you want?`)

  expect(cut.startsWith('Opening line.')).toBe(true)
  expect(cut.endsWith('Which one do you want?')).toBe(true)
  expect(cut.length < 4100).toBe(true)
})
