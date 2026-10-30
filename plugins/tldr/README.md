# TL;DR

A band above the Claude Code prompt with a running TL;DR of the assistant's last replies.
Whatever is waiting on you comes first, in bold, until you answer it.
It also adds `/cards`, a pane of card games to play while the agent works.

## Install

In Claude Code:

```text
/plugin marketplace add ayers-software-repair/marketplace
/plugin install tldr@ayerselectronics
```

Restart Claude Code after installing. The band appears after the next main assistant reply;
type `/cards` to open the games.

TLDR requires Claude Code's **mods (plugin hook modules)**, including its terminal UI and pane API.
The tested host is Claude Code CLI **2.1.312 on Linux x86-64**; other versions and native
Desktop/editor rendering are unverified. A generated Agent Plugins manifest does not port the
hooks to another agent.

Installed mods must be permitted by your Claude Code settings, organization policy and Anthropic's
rollout. If the band and `/cards` are absent, check `/plugin` and the debug log using
[Claude Code's mod troubleshooting guide](https://code.claude.com/docs/en/plugins/mods/troubleshoot).
See [compatibility evidence](HOST-COMPATIBILITY.md) for the exact scenarios checked and limits.

## The band

After a completed, nonempty main assistant answer, TLDR schedules a separate **Haiku** request
through Claude Code's model API. It sends up to three recent replies (each shortened to roughly
4,000 characters), the existing waiting items, and up to 1,500 characters of your latest prompt.
It requests at most 400 output tokens with a 20-second timeout. This uses your Claude Code model
access and may consume usage or incur charges under your configuration; it does not inherit the
conversation's selected model.

The band shows up to four waiting items first in bold, then up to three summary lines. The model
is asked to carry unanswered items forward and remove them when your message or the latest reply
settles them. If the summary is unavailable or empty, TLDR keeps the existing waiting items and
shows the reply's opening lines. Summaries can be mistaken; keep the full reply for context.

TLDR has no separate service, credentials or telemetry. It does not read or write your project
files; replies, waiting items and card state live in Claude Code's plugin state. The summary
request sends the text described above through your configured Claude Code provider. Disable
the plugin to stop its background summary requests:

```text
/plugin disable tldr@ayerselectronics
```

## The cards

Type `/cards` to open the pane. Type it again to close it.
Choose a game with the menu buttons or keys **1–9, then 0**: Klondike Solitaire, FreeCell,
Spider, Pyramid, Blackjack, Video Poker, Texas Hold'em, Baccarat, Hi-Lo and War.
The pane keeps waiting items and the TL;DR visible beneath the table.

Use the action buttons and their displayed hotkeys to play. The ordinary terminal draws a static
table; the fullscreen terminal also has a mouse client for clicking and dragging. These mouse
interactions have automated host-harness coverage; native terminal painting needs a real-session
check. The menu also offers card backs, felt colors, Klondike draw count and chip refill size.

| Game | Keys |
|---|---|
| Blackjack | n Deal, h Hit, s Stand, x Double |
| Video Poker | n Deal, 1 to 5 Hold, d Draw |
| Hi-Lo | n Deal, h Higher, l Lower |
| Solitaire | d Draw, w Waste, 1 to 7 Columns, a Auto, n New Deal |
| Betting games | k New Chips |
| Any game | m Menu; use the displayed game-specific buttons for other moves |

Chips are pretend money. You start with 100; the initial bet is 5 and can be changed at betting tables.

## Update or remove

```text
/plugin update tldr@ayerselectronics
/plugin uninstall tldr@ayerselectronics
```

## Reproduce a demo

Install TLDR with the commands above and start a trusted Claude Code terminal session. A live
demo uses model access and should be run only with the account owner's approval.

1. Ask: `Explain this imaginary parser repair in two sentences, then ask me whether to call it parseLine or readLine.`
2. After the answer and background summary, confirm the naming question appears first as a bold
   `YOU:` item. Reply `Use parseLine` and wait for the next summary to clear the question.
3. Run `/cards`, choose Solitaire, draw a card and return to the menu. Confirm the waiting items
   and summary remain under the table. Run `/cards` again to close it and restore the band.

For automated checks without signing in or calling a model, use Claude Code's own
[test harness](https://code.claude.com/docs/en/plugins/mods/test):

```sh
claude plugin validate plugins/tldr --strict --profile directory --json
claude plugin test plugins/tldr
```

The harness stubs model responses and clocks. It exercises hooks, game rules and UI descriptions;
it does not prove native painting or the quality of a live model's summaries. Passing directory
validation also leaves executable-hook review to the directory's developer portal.

## Support

Report reproducible problems in [GitHub issues](https://github.com/ayers-software-repair/marketplace/issues),
including the Claude Code version, OS, terminal mode and steps. Remove private conversation text
and credentials from logs before attaching them.

## Licence

Apache-2.0. Copyright Ayers Electronics Inc.
