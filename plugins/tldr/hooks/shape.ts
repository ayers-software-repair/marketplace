// Copyright Ayers Electronics Inc. All rights reserved.

// The pure half of the mod: which replies are kept, what the summariser is asked, and how its answer
// becomes the band's lines. A line starting "YOU:" is something the reader is being waited on for; those
// are carried from one summary to the next until the reader answers them.

export const KEPT_REPLIES = 3
export const MAX_ASKS = 4
export const MAX_FACTS = 3
export const NOTHING_WAITING = 'YOU: nothing waiting on you'
const REPLY_CHARS = 4000
const REPLY_HEAD_CHARS = 1200
const PROMPT_CHARS = 1500
const LINE_CHARS = 110

// A reply cut to a length one summary call can carry: its opening and its end, because a question to
// the reader sits at the end of a long reply.
export function cutReply(answer: string): string {
  const reply = answer.trim()
  if (reply.length <= REPLY_CHARS) {
    return reply
  }

  return `${reply.slice(0, REPLY_HEAD_CHARS)}\n[...]\n${reply.slice(REPLY_HEAD_CHARS - REPLY_CHARS)}`
}

// The last few replies, newest last.
export function keepRecent(recent: readonly string[], answer: string): string[] {
  const reply = cutReply(answer)
  return reply === '' ? [...recent] : [...recent, reply].slice(-KEPT_REPLIES)
}

// The open items a summary holds: its "YOU:" lines, without the line that says there are none.
export function asksOf(lines: readonly string[]): string[] {
  return lines.filter(line => line.startsWith('YOU:') && line !== NOTHING_WAITING)
}

export const SYSTEM = [
  'You keep a running TL;DR of an assistant\'s replies for a reader with ADHD who finds long text hard to read.',
  'Answer with two kinds of lines and nothing else.',
  `FIRST the open items: each line starts with "YOU:" and names one question or action the assistant is waiting on the reader for, in at most 14 plain words, most urgent first, at most ${MAX_ASKS}.`,
  'Carry over every open item given to you unless the reader\'s latest message answers it or the newest reply settles it. Add the new ones from the replies. Never drop an unanswered one.',
  `If nothing is waiting on the reader, write exactly "${NOTHING_WAITING}".`,
  `THEN at most ${MAX_FACTS} lines of facts: what was done, what is still open, each at most 12 plain words.`,
  'The newest reply matters most. No preamble, no markdown, no bullet characters.',
].join(' ')

export function askFor(recent: readonly string[], openAsks: readonly string[], lastPrompt: string): string {
  const open = openAsks.length === 0 ? 'none' : openAsks.join('\n')
  const said = lastPrompt.trim() === '' ? '(nothing yet)' : lastPrompt.trim().slice(0, PROMPT_CHARS)
  const replies = recent.map((reply, i) => `REPLY ${i + 1} of ${recent.length}:\n${reply}`).join('\n\n')
  return `OPEN ITEMS BEFORE:\n${open}\n\nTHE READER'S LATEST MESSAGE:\n${said}\n\n${replies}\n\nWrite the lines now.`
}

const short = (line: string) => (line.length > LINE_CHARS ? `${line.slice(0, LINE_CHARS - 1)}…` : line)

// The band's lines: bullets and blank lines dropped, the open items first, each cut to one row.
export function linesOf(text: string): string[] {
  const all = text
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(line => line !== '')
    .map(short)
  const asks = all.filter(line => line.startsWith('YOU:')).slice(0, MAX_ASKS)
  const facts = all.filter(line => !line.startsWith('YOU:')).slice(0, MAX_FACTS)
  return [...(asks.length === 0 ? [NOTHING_WAITING] : asks), ...facts]
}

// What the band shows when no summary came back: the open items it already held, then the reply's own
// first lines.
export function fallbackLines(held: readonly string[], reply: string): string[] {
  const asks = asksOf(held)
  const facts = linesOf(reply).filter(line => !line.startsWith('YOU:'))
  return [...(asks.length === 0 ? [NOTHING_WAITING] : asks), ...facts]
}
