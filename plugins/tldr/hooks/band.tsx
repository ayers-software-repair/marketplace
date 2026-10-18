// Copyright Ayers Electronics Inc. All rights reserved.

// The live TL;DR band: after every reply, a few short lines above the prompt. What the reader is being
// waited on for comes first and stays there until they answer it.

import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { NOTHING_WAITING, SYSTEM, askFor, asksOf, fallbackLines, keepRecent, linesOf } from './shape'

const lines = atom({ plugin: 'tldr', key: 'lines' } as const, [] as string[])
const recent = atom({ plugin: 'tldr', key: 'recent' } as const, [] as string[])
const lastPrompt = atom({ plugin: 'tldr', key: 'lastPrompt' } as const, '')

export const registerBand: Register = on => {
  // Only the newest turn's summary may land: an older call that answers late is dropped.
  let newest = 0

  on('prompt.submit', async ($, e, next) => {
    await update($, lastPrompt, () => e.text)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const isMainAnswer = e.agentId === undefined && e.reason === 'answer' && e.answer.trim() !== ''

    if (isMainAnswer) {
      const replies = keepRecent(await read($, recent), e.answer)
      await update($, recent, () => replies)
      const held = await read($, lines)
      const said = await read($, lastPrompt)
      newest += 1
      const mine = newest

      // The summary runs after the turn has ended, so the turn never waits on it.
      $.clock.after(0, async () => {
        const reply = await $.model.complete({
          model: 'haiku',
          system: SYSTEM,
          prompt: askFor(replies, asksOf(held), said),
          effort: 'low',
          maxTokens: 400,
          timeoutMs: 20000,
        })

        if (mine !== newest) {
          return
        }

        const shown = reply.isAnswered ? linesOf(reply.text) : fallbackLines(held, replies[replies.length - 1] ?? '')
        await update($, lines, () => shown)
      })
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const shown = await read($, lines)
    // While the cards pane is on screen it shows these lines itself, under the table.
    const isInPane = (await $.ui.panes()).some(pane => pane.id === 'cards' && pane.isPlaced)
    if (e.props.hasSurvey || isInPane) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    if (shown.length === 0) {
      return <Text dimColor>TL;DR shows here after the next reply.</Text>
    }

    return (
      <Box flexDirection="column">
        <Text bold>TL;DR</Text>
        {shown.map((line, i) => {
          const isAsk = line.startsWith('YOU:')

          return (
            <Text
              key={`line-${i}`}
              bold={isAsk && line !== NOTHING_WAITING}
              dimColor={isAsk ? line === NOTHING_WAITING : e.props.isWorking}
              wrap="wrap"
            >
              {isAsk ? line : `• ${line}`}
            </Text>
          )
        })}
      </Box>
    )
  })
}
