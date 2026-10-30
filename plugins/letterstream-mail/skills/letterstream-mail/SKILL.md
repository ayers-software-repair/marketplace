---
name: letterstream-mail
description: Prepare a paper letter for Certified Mail with an electronic return receipt through LetterStream in the user's Chrome. Use when the user wants a letter sent by post, including a dispute or cancellation. Draft the letter, create its PDF, and prepare the job; the user approves the document and addresses, accepts advisories and proof acknowledgments, and completes payment.
---

# Mail a letter with LetterStream

LetterStream prints and posts the letter. Certified Mail provides tracking, but delivery, signature and a return receipt are not guaranteed. A LetterStream account is required. Quote the exact total from the prepared job, never from memory or the historical prices below.

## Before starting

This workflow targets Claude Code with Claude in Chrome. Confirm that browser tools are connected before opening a mailing job; if unavailable, prepare the letter locally and explain the missing integration. Do not imply that a generated manifest makes another host supported. The [plugin README](../../README.md) covers installation and browser setup. Reuse the host's available PDF creation and inspection facilities; no mailing API or separate server is needed.

## Rules

- The user creates the account, sets the password and adds payment. Never enter credentials or payment details.
- The user approves the exact letter text before any upload. Show the generated PDF for review too; if its contents change, obtain approval again.
- The user approves the final total and presses the final send or pay button. Never press it.
- The user accepts consequential advisories, terms and proof acknowledgments themselves. Never click "I Understand" or tick the required proof-review box for them.
- Use your own browser tab, one per task. Never navigate a tab the user is working in. Close your tab after recording the result, unless the user still needs it for review or payment.
- Verify every form value with the user before entering it: sender name, return address, recipient.
- Put nothing in the letter the user did not approve. Do not add the user's address to the letter body unless asked; the return address goes in the sender fields of the job.
- Keep letters, addresses, payment information and job/tracking records in the user's chosen private location, never in a public repository, fixture or demo.

## Steps

1. Draft the letter in the user's voice. Show it in chat. Wait for approval.
2. Make a US Letter PDF (8.5 by 11 inches) of the approved text. Keep it to one page where it fits without losing text. Extract and compare its text, render and inspect every page for clipping or missing content, then show the PDF to the user before upload.
3. Confirm the exact recipient and sender names and address fields with the user, including optional address lines and ZIP codes. Do not guess missing values or silently accept a site's address correction.
4. Open your own tab on https://www.letterstream.com/. Hand sign-up, login, CAPTCHA and payment setup to the user and wait.
5. In My Jobs, choose "Send Letter(s)". Name the job, select "LetterStream Address Book" and "Add Certified Electronic Return Receipt"; verify Certified Mail is selected too. If the Certified Mail Advisory appears, let the user read and accept it before continuing.
6. Select an existing recipient only after checking every address field against the confirmed values, or use "Add New Address" and enter them exactly. Save, select the recipient row and choose "Continue Job". Enter the confirmed return address on the next page.
7. Choose "Add A Document", attach the approved PDF with the browser's file-upload facility, then choose "Upload and Add to Mailing". Confirm the correct document is attached once.
8. Choose "Continue to Recipient Review" and open "View". Inspect all proof pages, including any cover sheet, recipient/address block and the complete letter. Let the user review the proof. Resolve mismatches before continuing; changed letter content needs renewed approval before another upload.
9. Continue to Job Confirmation. Report the displayed total and available breakdown (document pages, mail type, printing, postage, fees and tax). Distinguish document pages from proof cover sheets. Ask for approval of the exact total. Leave the required proof-review acknowledgment unticked for the user to read and accept.
10. The user completes acknowledgment and final payment/send themselves. After they finish, read the receipt and My Jobs status. Record the displayed job number and status; "paid and released into production" is not proof of USPS acceptance or delivery. If payment is unclear, stop and check the existing job with the user rather than create or pay for a duplicate.
11. Record tracking only when the site actually displays it. If absent, mark it pending and tell the user it can be checked later through the job's "view" link; do not invent a number or promise an automatic follow-up. Record any later receipt only when observed.
12. Update the user's checklist with the observed status and date, tracking or "pending", and what remains awaited. Close your tab when the user is finished with it.

Use the observed labels as guidance, not a reason to click a different consequential control. If the live flow differs, inspect it and preserve the same approval boundaries; stop when the next action or outcome is uncertain.

## Record

In the user's private record, keep: date, recipient, subject, observed job status, displayed total (paid only when confirmed), job number, tracking number or pending, and receipt status/date when observed. Do not mark a letter mailed or delivered from payment alone.

## Notes from use

The repository records a real run on 27 Oct 2026. These historical observations inform the steps above; this maintenance pass did not repeat that mailing or verify the current live flow.

- Account: the sign-up form is https://www.letterstream.com/ls/signup. The user fills username, password and phone and submits.
- Start: My Jobs, "Send Letter(s)". Name the job, choose recipients from "LetterStream Address Book", tick "Add Certified Electronic Return Receipt" (it also ticks Certified Mail). The page shows the starting price: Certified Mail with the return receipt from $11.54 each.
- Advisory popup: "Certified Mail Advisory" says tracking, signature and delivery are not guaranteed and there are no refunds for unsuccessful letters. Clicking "I Understand" accepts it; the user must do this themselves.
- Address book: "Add New Address", then fill Name 1, Address 1, Address 2, City, State, Zip. Save it with the button inside the popup (scroll the popup), then tick the row and press "Continue Job".
- Return address: the next page asks for it. Ask the user for every value. Never guess a zip.
- Document: "Add A Document", attach the PDF with the file-upload tool on the file input, then press "Upload and Add to Mailing". The PDF must be US Letter. A4 gives a warning. When you build the PDF with weasyprint, set `@page { size: letter; margin: 1in }`.
- A removed document comes back as an empty slot; deleting one may briefly freeze the page. Wait a few seconds.
- "Continue to Recipient Review" shows the recipient and a "View" proof. The proof has two pages: a cover sheet with the certified address block and barcode, then the letter. Read it before going on.
- "Continue" opens Job Confirmation. It holds a REQUIRED box: the user has reviewed the proofs, the job cannot be changed once paid, and refunds are not provided for USPS delivery issues. Never tick it. The user ticks it and pays.
- An interactive read of the page can be huge (the country list). Use `find` for the one control you need.
- Payment: the user pays in the cart. The receipt page says the job "has been paid and released into production". The first one-page certified letter with the electronic return receipt cost $11.64 in total.
- After payment, My Jobs lists the job under "In Production" with the date and job number. The tracking number was not yet shown right after payment; open the job's "view" link later to read it, and record it then.
