# Proposed LetterStream walkthrough

For website integration: an illustrative replay based on the skill's recorded 27 October 2026 workflow.
All sample content below is synthetic. No browser job, account, upload or payment is part of this proposal.
Label it visibly: **Sample walkthrough — no letter is sent.** Website layout and implementation remain with the website maintainer.

## Sample letter

```text
30 October 2026

To Example Subscription Office:

Please cancel my example subscription at the end of its current term.
Please send written confirmation of cancellation and let me know whether
any further action is needed.

Thank you,
Example Sender
```

Demonstration-only address values; these are deliberately invalid for mailing:

| Field | Sender | Recipient |
| --- | --- | --- |
| Name | Example Sender | Example Subscription Office |
| Address 1 | 123 Example Street | 456 Sample Avenue |
| Address 2 | (blank) | (blank) |
| City | Example City | Sample City |
| State | XX | XX |
| ZIP | 00000 | 00000 |

## Replay sequence

1. **Draft and approve.** Show the sample letter and an approval pause. Then show a US Letter PDF preview of that same text. Do not add the sample addresses to the letter body.
2. **Prepare the job.** Explain the observed order: Send Letter(s), electronic return receipt plus Certified Mail, user accepts advisory, recipient address book, return address, then approved PDF upload. Show the synthetic address values as a read-only example, never submit them to LetterStream.
3. **Review and stop.** Explain that the user reviews every proof page, the complete addresses and the live final total. Do not fabricate a current quote or reuse the historical price as today's price. Leave acknowledgment and final payment with the user.
4. **Explain the later result.** End with “In a real mailing, payment releases the job into production. Tracking may appear later; delivery and a return receipt are separate observations.” Do not display a fake receipt, job number, tracking number or successful payment.

Use text and the local sample PDF rather than recordings of a signed-in private mailing.
If controls advance the replay, label them as walkthrough navigation. They must not collect personal
data, contact LetterStream, take payment or imply that the walkthrough mails anything.

This proposal supplies content and sequence only. It does not implement a website or a mail backend,
and it is not fresh supported-host compatibility evidence.
