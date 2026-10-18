# tldr

A band above the Claude Code prompt with a running TL;DR of the assistant's last replies.
Whatever is waiting on you comes first, in bold, until you answer it.
It also adds `/cards`, a pane of card games to play while the agent works.

## The band

After each reply, the band asks Claude, through your own session and model, to summarise the last few replies.
Nothing is sent anywhere else. There is no telemetry and no setting to change.

## The cards

Type `/cards` to open the pane. Type it again to close it.
Press a number on the menu to pick a game.

| Game | Keys |
|---|---|
| Blackjack | n Deal, h Hit, s Stand, x Double |
| Video Poker | n Deal, 1 to 5 Hold, d Draw |
| Hi-Lo | n Deal, h Higher, l Lower |
| Solitaire | d Draw, w Waste, 1 to 7 Columns, a Auto, n New Deal |
| Any game | m Menu, k New Chips |

## Licence

Apache-2.0. Copyright Ayers Electronics Inc.
