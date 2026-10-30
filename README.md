# Ayers plugins for AI agents

This is a plugin marketplace from Ayers Electronics, with plugins and MCP servers for AI agents.
Browse the plugins below for supported agents, installation, and requirements.

## The tldr plugin

- **The band.** A short TL;DR of the assistant's last replies, shown above your prompt.
- **The waiting-on-you list.** Anything the agent is waiting on you for is shown first, in bold, until you answer it.
- **The cards.** Type `/cards` for ten games: Klondike Solitaire, FreeCell, Spider, Pyramid, Blackjack, Video Poker, Texas Hold'em, Baccarat, Hi-Lo and War. The waiting items and summary stay beneath the table while you play.

TLDR requires Claude Code's mods (plugin hook modules), terminal UI and pane API. The tested
host is Claude Code CLI **2.1.312 on Linux x86-64**, using its offline test harness. Native
terminal/Desktop/editor rendering, live model summaries, other versions and OSes remain
unverified. Installed mods must be allowed by your settings, organization policy and Anthropic's
rollout. A generated manifest does not make these hooks work in another agent.

See the [TLDR README](plugins/tldr/README.md) for installation and usage, and its
[compatibility evidence](plugins/tldr/HOST-COMPATIBILITY.md) for exact checked scenarios.

Text copy of the look (the real band uses your terminal's colours):

```
TL;DR
YOU: pick a name for the new table
• Added the login page and wired it to the API.
• Tests pass except one flaky timeout.
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
- **Where it runs.** Requires a client that supports MCP over stdio and can launch `npx` with `LANCEDB_PATH` set to an existing LanceDB database folder.

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

- After installation and restart, the band appears after the next completed main assistant reply.
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

- **Cursor.** Cursor reads a plugin folder that has a root `plugin.json`. Use the host requirements below when choosing a plugin.

Host requirements:

| Plugin | Requirements |
|---|---|
| `tldr` | Claude Code mods with terminal UI/panes; tested CLI 2.1.312 on Linux x86-64 through the offline harness. [Scope and limits](plugins/tldr/HOST-COMPATIBILITY.md). |
| `letterstream-mail` | Claude Code (needs the Claude in Chrome extension) |
| `lancelot` | MCP over stdio, with `npx` available to the client. In Claude Code, configure the database folder through the plugin prompt. In other clients, set `LANCEDB_PATH` to an existing LanceDB database folder in the server's environment; optionally set `OPENAI_API_KEY` for embeddings. |

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

`tldr` needs Claude Code with installed mods permitted; see its [tested host and limits](plugins/tldr/README.md#install).

`letterstream-mail` needs the Claude in Chrome extension and a LetterStream account.
It was built on Claude Code 2.1.291.
Older versions are untested.

## Privacy

`letterstream-mail` sends nothing anywhere itself. Your letter goes to LetterStream through your own browser session, and you enter your own sign-in and payment. It has no telemetry.

For `tldr`:

- After each completed, nonempty main assistant answer, TLDR schedules a separate **Haiku**
  request through Claude Code's model API. It does not inherit the conversation's selected model.
- The request sends up to three recent replies (each shortened to roughly 4,000 characters),
  existing waiting items and up to 1,500 characters of your latest prompt through your configured
  Claude Code provider. It requests at most 400 output tokens with a 20-second timeout.
- This uses your Claude Code model access and may consume usage or incur charges under your
  configuration. Disable TLDR to stop its background summary requests.
- TLDR has no separate service, credentials or telemetry, and does not read or write project
  files. Replies, waiting items and card state live in Claude Code's plugin state.

## The games

Open `/cards`, then use the menu buttons or keys 1–9, then 0 to pick a game.
Use each game's displayed buttons and hotkeys for its moves.

| Game | Key | What it does |
|---|---|---|
| Menu | 1 to 9, then 0 | Solitaire, FreeCell, Spider, Pyramid, Blackjack, Video Poker, Texas Hold'em, Baccarat, Hi-Lo, War |
| Blackjack | n, h, s, x | Deal, Hit, Stand, Double |
| Video Poker | n, 1 to 5, d | Deal, hold a card, Draw |
| Hi-Lo | n, h, l | Deal, Higher, Lower |
| Solitaire | d, w, 1 to 7, a, n | Draw, take the waste card, take or place on a column, Auto, New Deal |
| Betting games | k | New Chips, offered when the balance cannot cover a stake |
| Any game | m | Back to the menu |

Everyone starts with 100 chips. The initial bet is 5 and can be changed at betting tables.
Chips are pretend money.

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
