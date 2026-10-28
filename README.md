# Ayers plugins for AI agents

This is a plugin marketplace from Ayers Electronics, with plugins and MCP servers for AI agents.
Today it holds three: `tldr`, `letterstream-mail` and `lancelot`.

## The tldr plugin

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

## The letterstream-mail plugin

- **What it does.** It mails a paper letter for you through LetterStream, as Certified Mail with an electronic return receipt. You need no printer, stamps or post office trip.
- **How it works.** Claude drafts the letter, builds the PDF, and fills the LetterStream job in your Chrome with Claude in Chrome.
- **You stay in control.** You create the account and add payment. You approve the letter text, read the proof, tick the acknowledgment and pay. Claude never enters credentials or presses the final button.
- **Cost.** A one-page certified letter with the return receipt cost $11.64 in our first run. LetterStream shows the exact total before you pay.

After you install it, ask Claude to mail a letter.

## The lancelot plugin

- **What it does.** An MCP server that answers search and retrieval queries against a local LanceDB database. It uses OpenAI embeddings when `OPENAI_API_KEY` is set and text search otherwise.
- **Tools.** `lancedb_search`, `lancedb_query`, `lancedb_status` and `lancedb_version`.
- **Setup.** Claude Code asks for your database folder and, optionally, an OpenAI API key when you install it.
- **Where it runs.** Runs in any MCP client; the plugin form targets Claude Code, the direct form works anywhere `npx` runs.

See [plugins/lancelot/README.md](plugins/lancelot/README.md) for the tools, settings and the direct form.

## Install

In Claude Code, add the marketplace, then install the plugin you want:

```
/plugin marketplace add ayers-software-repair/marketplace
/plugin install tldr@ayerselectronics
/plugin install letterstream-mail@ayerselectronics
/plugin install lancelot@ayerselectronics
```

Or from a shell:

```
claude plugin marketplace add ayers-software-repair/marketplace
claude plugin install tldr@ayerselectronics --scope user
claude plugin install letterstream-mail@ayerselectronics --scope user
claude plugin install lancelot@ayerselectronics --scope user
```

For tldr:

- For the band, type nothing. It appears after the next reply.
- For the games, type `/cards`. Type it again to close the pane.

## Other agents

The same plugins are published in the Agent Plugins open format (`plugin.json` and `mcp.json` in each plugin folder, generated from the Claude manifests by `scripts/agent-plugins.mjs`).

- **Copilot CLI.**

  ```
  copilot plugin marketplace add ayers-software-repair/marketplace
  copilot plugin install <name>@ayerselectronics
  ```

- **VS Code.** Add the marketplace to `chat.plugins.marketplaces` in `settings.json`:

  ```
  "chat.plugins.marketplaces": ["ayers-software-repair/marketplace"]
  ```

- **Cursor.** Cursor reads a plugin folder that has a root `plugin.json`. It is not listed in the Cursor Marketplace yet.

Where each plugin runs today:

| Plugin | Runs in |
|---|---|
| `tldr` | Claude Code only (hook modules) |
| `letterstream-mail` | Claude Code (needs the Claude in Chrome extension) |
| `lancelot` | Any MCP client. Outside Claude Code, set `LANCEDB_PATH` and optionally `OPENAI_API_KEY` in your client's settings for the server, as the Agent Plugins format has no install-time prompt. |

## Update and remove

Update:

```
claude plugin update <plugin>@ayerselectronics
```

Remove:

```
claude plugin uninstall <plugin>@ayerselectronics
```

Each plugin carries a version in its `plugin.json`. Update to get the latest.

## What it needs

`tldr` needs Claude Code with plugin hook modules.
`letterstream-mail` needs the Claude in Chrome extension and a LetterStream account.
It was built on Claude Code 2.1.291.
Older versions are untested.

## Privacy

`letterstream-mail` sends nothing anywhere itself. Your letter goes to LetterStream through your own browser session, and you enter your own sign-in and payment. It has no telemetry.

For `tldr`:

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

Regenerate the Agent Plugins files after you change a Claude manifest:

```
node scripts/agent-plugins.mjs
```

Check the plugin before you push:

```
claude plugin validate --strict plugins/tldr
claude plugin test plugins/tldr
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## Licence

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
