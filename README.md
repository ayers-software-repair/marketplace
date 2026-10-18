# Ayers plugins for Claude Code

This is a plugin marketplace from Ayers Electronics.
Today it holds one plugin, `tldr`.

## What you get

- **The band.** A short TL;DR of the assistant's last replies, shown above your prompt.
- **The waiting-on-you list.** Anything the agent is waiting on you for is shown first, in bold, until you answer it.
- **The cards.** Type `/cards` for Solitaire, Blackjack, Video Poker and Hi-Lo to play while the agent works. The same waiting items show on top.

Text copy of the look (the real band uses your terminal's colours):

```
TL;DR
• Added the login page and wired it to the API.
• Tests pass except one flaky timeout.
YOU: pick a name for the new table
```

## Install

In Claude Code, type these two lines:

```
/plugin marketplace add ayers-software-repair/marketplace
/plugin install tldr@ayersrepair
```

Or from a shell:

```
claude plugin marketplace add ayers-software-repair/marketplace
claude plugin install tldr@ayersrepair --scope user
```

Then:

- For the band, type nothing. It appears after the next reply.
- For the games, type `/cards`. Type it again to close the pane.

## Update and remove

Update:

```
claude plugin update tldr@ayersrepair
```

Remove:

```
claude plugin uninstall tldr@ayersrepair
```

There is no version number. Every new commit here is an update.

## What it needs

Claude Code with plugin hook modules.
It was built on Claude Code 2.1.291.
Older versions are untested.

## Privacy

- After each reply, the band asks Claude to summarise the last few replies.
- That request goes through your own Claude Code session and your own model setup.
- Nothing is sent anywhere else.
- There is no telemetry.
- The plugin does not read or write your files.
- Card game state is kept in Claude Code's own plugin state.

## The games

Open `/cards`, then press a number to pick a game.

| Game | Key | What it does |
|---|---|---|
| Menu | 1 to 4 | Blackjack, Video Poker, Hi-Lo, Solitaire |
| Blackjack | n, h, s, x | Deal, Hit, Stand, Double |
| Video Poker | n, 1 to 5, d | Deal, hold a card, Draw |
| Hi-Lo | n, h, l | Deal, Higher, Lower |
| Solitaire | d, w, 1 to 7, a, n | Draw, take the waste card, take or place on a column, Auto, New Deal |
| Any game | m, k | Back to the menu, New Chips |

Everyone starts with 100 chips. A bet is 5 chips. These are not real money.

## For developers

```
.claude-plugin/marketplace.json   the marketplace listing
plugins/tldr/                     the plugin
  .claude-plugin/plugin.json
  hooks/                          the hook modules
  types/
```

Check the plugin before you push:

```
claude plugin validate --strict plugins/tldr
claude plugin test plugins/tldr
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## Licence

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
