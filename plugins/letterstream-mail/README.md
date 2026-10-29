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
Requires Claude Code, Claude in Chrome, and your own LetterStream account.

## Use

Ask Claude to prepare a letter for Certified Mail. Provide the letter's purpose and the facts you want included.
The skill asks for the sender and recipient details rather than inventing them.

- You approve the exact letter before upload.
- You enter credentials and payment details yourself.
- You review the mailing proof and final price before sending.
- You accept the final acknowledgment and press the payment/send button.
- The assistant records the job and tracking information shown after payment.

LetterStream charges for printing and postage. Use the total shown for the prepared job.

The [skill instructions](skills/letterstream-mail/SKILL.md) describe the complete workflow and approval boundaries.
Personal letters, addresses, credentials, and payment information do not belong in this repository.

## License

Apache-2.0. Copyright Ayers Electronics Inc.
