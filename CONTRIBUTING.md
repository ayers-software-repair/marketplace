# Contributing

Thank you for helping.

1. Fork the repo and make your change on a branch.
2. Check the manifest: `claude plugin validate --strict plugins/tldr`
3. Run the tests: `claude plugin test plugins/tldr`
4. Both must pass before you open a pull request.
5. Keep one change per pull request.
6. Give each plugin a `version` in its `plugin.json`, and raise it when the plugin changes.
7. No emoji, and no copyright year in any copyright line.
8. Write short comments in plain words.
9. By sending a pull request you agree your work is licensed under Apache-2.0,
   the same licence as this repo (inbound = outbound).
