---
name: letterstream-mail
description: Mails a paper letter through LetterStream (letterstream.com) in the user's Chrome, as Certified Mail with an electronic return receipt, so the user needs no printer, stamps or post office. Use when the user wants a letter sent by post, a dispute or cancellation letter mailed, or certified mail with proof of delivery. It drafts the letter, makes the PDF, fills the job, and stops for the user's approval of the letter and the total.
---

# Mail a letter with LetterStream

LetterStream prints, stamps and posts the letter. Certified Mail includes tracking. No minimum, no monthly fee. A free account is required. The exact total shows when the job is set up; the site lists Certified Mail with an electronic return receipt from about $11.54, so quote the total from the page, never from memory.

## Rules

- The user creates the account, sets the password and adds payment. Never enter credentials or payment details.
- The user approves the exact letter text before any upload.
- The user approves the final total and presses the final send or pay button. Never press it.
- Use your own browser tab, one per task. Close it when the job is done. Never navigate a tab the user is working in.
- Verify every form value with the user before entering it: sender name, return address, recipient.
- Put nothing in the letter the user did not approve. Do not add the user's address to the letter body unless asked; the return address goes in the sender fields of the job.

## Steps

1. Draft the letter in the user's voice. Show it in chat. Wait for approval.
2. Make a PDF of the approved text. Keep it to one page where it fits. Check the text back out of the PDF before uploading.
3. Open your own tab on https://www.letterstream.com/. If the site shows the log-in page, hand the tab to the user and wait.
4. Start a new mailing job. Upload the PDF.
5. Enter the recipient name and address exactly as given. Check them back against the source.
6. Enter the sender (return address) with the values the user confirmed.
7. Choose Certified Mail with the electronic return receipt.
8. Read the page's total aloud to the user in chat: pages, mail type, postage, tax. Stop. Ask for approval.
9. After approval, the user presses the final button. Then read the confirmation page and record the job number and the USPS tracking number.
10. Add a line to the user's checklist: sent, date, tracking number, what the reply or receipt is awaited for.
11. Close your tab.

## Record

For each letter, keep: date, recipient, subject, total paid, job number, tracking number, and when the return receipt arrives.

## Notes from use

Verified in a real run, 27 Oct 2026:

- Account: the sign-up form is https://www.letterstream.com/ls/signup. The user fills username, password and phone and submits.
- Start: My Jobs, "Send Letter(s)". Name the job, choose recipients from "LetterStream Address Book", tick "Add Certified Electronic Return Receipt" (it also ticks Certified Mail). The page shows the starting price: Certified Mail with the return receipt from $11.54 each.
- Advisory popup: "Certified Mail Advisory" says tracking, signature and delivery are not guaranteed and there are no refunds for unsuccessful letters. Clicking "I Understand" accepts it, so ask the user first.
- Address book: "Add New Address", then fill Name 1, Address 1, Address 2, City, State, Zip. Save it with the button inside the popup (scroll the popup), then tick the row and press "Continue Job".
- Return address: the next page asks for it. Ask the user for every value. Never guess a zip.
- Document: "Add A Document", attach the PDF with the file-upload tool on the file input, then press "Upload and Add to Mailing". The PDF must be US Letter. A4 gives a warning. When you build the PDF with weasyprint, set `@page { size: letter; margin: 1in }`.
- A removed document comes back as an empty slot; deleting one may briefly freeze the page. Wait a few seconds.
- "Continue to Recipient Review" shows the recipient and a "View" proof. The proof has two pages: a cover sheet with the certified address block and barcode, then the letter. Read it before going on.
- "Continue" opens Job Confirmation. It holds a REQUIRED box: the user has reviewed the proofs, the job cannot be changed once paid, and refunds are not provided for USPS delivery issues. Never tick it. The user ticks it and pays.
- An interactive read of the page can be huge (the country list). Use `find` for the one control you need.
- Payment: the user pays in the cart. The receipt page says the job "has been paid and released into production". The first one-page certified letter with the electronic return receipt cost $11.64 in total.
- After payment, My Jobs lists the job under "In Production" with the date and job number. The tracking number was not yet shown right after payment; open the job's "view" link later to read it, and record it then.
