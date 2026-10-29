# Listing and installation status

Publisher: **Ayers Electronics**. Marketplace identifier: **`ayerselectronics`**.
GitHub source remains [`ayers-software-repair/marketplace`](https://github.com/ayers-software-repair/marketplace).

The owner completes account-creation and final directory submissions. Source preparation and
validation can proceed independently. A working install link, submission or generated manifest
is not proof of directory acceptance.

## Verified distribution — 29 October 2026

| Surface | Evidence | What remains |
| --- | --- | --- |
| Claude Code marketplace | Main 8098de0 names `ayerselectronics`; root README contains all three install commands. | Fresh host compatibility checks are separate from manifest validation. |
| npm | [`@ayerselectronics/lancelot`](https://www.npmjs.com/package/@ayerselectronics/lancelot) resolves to 0.3.1. | Local dependency repairs require their own checked release. |
| Official MCP Registry | [Registry query](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.ayers-software-repair/lancelot) contains exact identity `io.github.ayers-software-repair/lancelot`, version 0.3.1, npm package `@ayerselectronics/lancelot`. | Published 0.3.1 has no `remotes`. Publish and read back the hosted metadata through the release flow. |
| Hosted MCP | `https://mcp.ayers.repair/lancelot` answered initialization with server version 0.3.1 on 29 October. | Connector review and directory acceptance are separate. |
| Old npm scope | `@ayersrepair/lancelot` still resolves to 0.3.0. | Owner-authorized removal is not complete; authentication alone did not remove it. |

## Bundle checks — 29 October 2026

The installed Claude Code CLI accepted all three bundles with
`claude plugin validate plugins/<name> --strict --profile directory --json`.
Lancelot's existing bundle passed unchanged. LetterStream Mail now has its own README with
installation, browser requirements, document review and final-payment boundaries. TLDR now
includes a square 512-pixel PNG and installation instructions that name its Claude Code hook
requirement.

These checks do not execute hook modules, exercise a browser mailing job, establish other-host
compatibility, or constitute directory acceptance. TLDR's executable hook modules still require
the directory's separate review. No submission was made.

TLDR's vector source is `art/tldr-icon.svg`. Reproduce its raster with
`rsvg-convert --width 512 --height 512 art/tldr-icon.svg --output plugins/tldr/.claude-plugin/icon.png`
(librsvg 2.58.0; DejaVu Sans Mono installed). The icon uses the existing graphite/amber terminal palette.

## Directory queue

No submission ID or independently verified public listing is recorded below. Do not mark these
as submitted or listed until the corresponding evidence exists.

| Destination | Applicable artifact | Next step |
| --- | --- | --- |
| [Anthropic directory](https://claude.com/docs/directory/publish) | Plugin bundles: TLDR, LetterStream Mail, Lancelot. Separate MCP connector: hosted Lancelot. | Validate each bundle against its actual host capabilities; prepare the connector against the live HTTPS endpoint. Owner submits each entry. |
| [OpenAI plugins](https://developers.openai.com/plugins/deploy/submission) | Skills and MCP packages supported by the target host. | Prepare a compatible package and test cases. LetterStream's browser dependency and TLDR's Claude-specific hooks need adaptation and proof; generated manifests alone do not establish support. |
| [Cursor Marketplace](https://cursor.com/docs/plugins) | Supported plugin components. | Test the intended components in Cursor before preparing the owner submission. |
| [Glama](https://glama.ai/mcp/servers) | Lancelot MCP. | Confirm ingestion, ownership and the public entry; neither an account nor `glama.json` proves listing. |
| [GitHub MCP Registry](https://github.com/mcp) | Lancelot MCP. | Verify discoverability independently of the official registry entry. |
| [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | Lancelot MCP. | Prepare an eligible entry, then record the submitted PR and maintainer result separately. |
| [awesome-copilot](https://github.com/github/awesome-copilot) | Only components verified in the relevant Copilot host. | Read current contribution rules and test compatibility before preparing a submission. |

Smithery and mcp.so are excluded by the owner. PulseMCP is not an active submission task; check
its current acceptance policy before proposing it.

## Compatibility evidence

- TLDR uses Claude Code hook modules and terminal UI. A portable manifest does not port that UI.
- LetterStream Mail's current workflow requires Claude in Chrome. Never remove document, price
  or final-send approval to make another host appear supported.
- Lancelot has local stdio and hosted Streamable HTTP forms. Test the exact client, transport
  and configuration; a server initialization alone does not prove a complete host workflow.
- VS Code and Cursor installation links are distribution aids, not marketplace listings. The
  Lancelot repository README owns those links.

## Recording a submission

For each destination, record the artifact commit/version, tested host, prepared package hash,
submission date/ID, review result, public URL and last verification date. Use explicit states:
**preparation**, **ready for owner**, **submitted**, **changes requested**, **listed**, or
**ineligible with a documented reason**. Keep credentials, personal account data and draft
reviewer correspondence out of this public repository.

The company release runbook in `ayers.repair/docs/RUNBOOK-mcp-release.md` owns publication order,
trusted-publisher setup and recovery. This file owns listing evidence.
