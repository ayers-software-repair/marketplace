# LetterStream Mail

Prepare a paper letter for Certified Mail with an electronic return receipt through LetterStream.
The assistant drafts the letter, creates a PDF, and prepares the mailing job. You review the letter,
proof, recipient, return address, and final total, then complete payment yourself.

## Install

In Claude Code:

```text
/plugin install letterstream-mail --marketplace ayers-software-repair/marketplace
```

For an already-added marketplace, use `/plugin install letterstream-mail@ayerselectronics`.
To update, run `claude plugin update letterstream-mail@ayerselectronics` from your shell.

## Requirements

- Current Claude Code signed in through `/login` with a direct Anthropic paid plan that supports Chrome integration. API-key, setup-token and third-party-provider authentication do not enable that integration.
- Google Chrome with Claude in Chrome installed and signed in to the same account and organization as Claude Code. Start with `claude --chrome`; use `/chrome` to check the connection and permissions. The Chrome integration does not support WSL.
- Your own LetterStream account and payment method, entered by you.
- PDF creation, text extraction and page rendering facilities available to your assistant. The plugin supplies instructions, not a bundled PDF engine.

See Anthropic's [Chrome setup](https://code.claude.com/docs/en/chrome) and
[plugin installation reference](https://code.claude.com/docs/en/discover-plugins) for current host requirements.
The bundle uses the standard `skills/<name>/SKILL.md` layout; no MCP server or API key is required by this plugin.
Portable manifest files do not establish compatibility with other agents.

## Use

Ask Claude to prepare a letter for Certified Mail. Provide the letter's purpose and the facts you want included.
The skill asks for the sender and recipient details rather than inventing them.

- You approve the exact letter before upload.
- You confirm every sender and recipient address field before entry.
- You enter credentials and payment details yourself.
- You read and accept the Certified Mail Advisory yourself.
- You review the mailing proof and final price before sending.
- You accept the final acknowledgment and press the payment/send button.
- The assistant records the observed job status and tracking information when available. Tracking may be pending immediately after payment; production, USPS acceptance and delivery are separate states.

LetterStream charges for printing and postage. Use the total shown for the prepared job.

The [skill instructions](skills/letterstream-mail/SKILL.md) describe the complete workflow and approval boundaries.
Personal letters, addresses, credentials, and payment information do not belong in this repository.
The assistant keeps job and tracking records only in your chosen private location. The plugin has no telemetry or mailing backend; your approved document and mailing details go to LetterStream through your browser.

## Verification and demonstration

The skill retains notes from a real mailing on 27 October 2026. The current instruction reconciliation
has not repeated that mailing. Manifest validation checks packaging; it does not prove a clean install,
connected Chrome workflow, upload, payment or delivery. Fresh supported-host workflow proof remains outstanding.

The [synthetic replay proposal](DEMO.md) gives the website maintainer a sample letter and the review
stops for a demonstration. It is an illustrative walkthrough of the recorded workflow, not a live mailing service or a new mailing test.

## License

Apache-2.0. Copyright Ayers Electronics Inc.
