# TLDR host compatibility evidence

These are scenario results, not directory approval or proof of every host surface.

## Installed baseline — 30 October 2026

| Field | Evidence |
| --- | --- |
| Source | `b8fc2daf8e95d0a35f5da2f8c01ebad6089bfde0`, TLDR `0.1.0` |
| Bundle | Normalized source archive (command below), SHA-256 `3004dcf35babb0cb6b297f2702b67cdd415f46f2505b0c1890d493d6a8f37e5f` |
| Host/harness | Native Claude Code CLI `2.1.312`, its built-in `claude plugin test` harness |
| Host binary | SHA-256 `4f4178ce41d83e23341ebfbaecdbcf8ea6bf7baea0690025abe49eeec3a5d01d` |
| OS | Ubuntu 24.04.5 LTS, Linux x86-64 |
| Integration | `hooks/hooks.json` loads `register.tsx`; Claude Code mods, state, model, clock, commands and terminal UI APIs. No MCP transport. |
| Configuration | Fresh empty `CLAUDE_CONFIG_DIR`; local marketplace path at the source commit, user-scope `tldr@ayerselectronics` installation. No credentials copied or settings/rollout override. |
| Installation | **Pass** at `2026-10-30T14:35:44.892Z`: installer reported `outcome: ok`, version `0.1.0` and the exact source commit. Recursive comparison of installed files with the archived source had no differences. |
| Validation | **Pass**: strict directory-profile validation, no manifest/hook errors or warnings. Directory result explicitly has `incomplete: true`: executable-hook rules require separate portal review. |
| Pane smoke | **Pass**: the existing `pane.test.ts` loaded the menu, pressed `play-solitaire` and found the draw control, **1 pass / 0 fail**. Only that test file was copied into a probe beside the installed runtime files; this was not a full-suite run. |

The filesystem sandbox prevented the harness child from reporting (`the file did not load;
its run ended without a report (exit code 0)`). The same single offline probe outside that
sandbox passed. This is a runner limitation; no plugin policy or sandbox setting was bypassed
inside Claude Code itself.

## Summary repair — candidate 0.1.1

New band tests were first run against copies of the unchanged installed 0.1.0 runtime. The
host harness reported **4 pass / 2 fail**: an answered-but-empty summary erased waiting items,
and a denied model request left stale facts while the timer callback threw. The existing
unavailable-result fallback, ignored-turn filter and late-summary guard passed.

The repair catches a rejected completion and applies the existing fallback when the result is
unavailable or whitespace-only. It preserves waiting items and uses the current reply's opening
lines without blocking the assistant turn.

Focused checks after the repair:

- `band.test.ts`: **7 pass / 0 fail**. Covers deferred scheduling, Haiku request bounds,
  previous waiting items/latest prompt/recent replies, bold asks, unavailable/empty/denied
  results, ignored subagent/interrupted/empty turns, stale-summary rejection, and yielding to
  surveys/a placed cards pane before restoring the band.
- `pane.test.ts`: **2 pass / 0 fail**. Covers session command registration, focused open/close
  toggle, and the existing Solitaire smoke.
- Strict directory-profile validation passes; generated manifests match the source manifest.

These focused probes use the real Claude Code hook engine with stubbed model/clock/UI-host
responses. They make no provider requests, start no Claude session and need no sign-in.

## Fresh installed-host suite — 30 October 2026

[PR 4](https://github.com/ayers-software-repair/marketplace/pull/4) head
`2a31beed7c151ee842e47d46a572ceec499ff4ce` passed the complete suite in
[hosted run 41074499738](https://github.com/ayers-software-repair/marketplace/actions/runs/41074499738),
job `124126951409`: **110 pass / 0 fail across 17 files**. GitHub tested merge checkout
`4d6c25fcd199f759538f6808a1e15f01a701807d` on Ubuntu 24.04.5 x86-64 with freshly npm-installed
Claude Code `2.1.312` and Node `22.23.4`, at `2026-10-30T14:46:04Z`.

The job installed TLDR `0.1.1` into a fresh configuration, verified a single contained install
path, compared every installed file with source, and passed all-plugin/generated-manifest
checks plus installed TLDR's strict directory validation and offline tests. Coverage includes
the summary lifecycle, command/pane behavior, game rules, terminal/Desktop mouse-client
descriptions and layouts at multiple terminal sizes.

[Evidence artifact 12985933671](https://github.com/ayers-software-repair/marketplace/actions/runs/41074499738/artifacts/12985933671)
contains host identity, installation output, validation JSON and complete test output; ZIP
SHA-256 `6ae7ca90fd851dfa35ac3192b42a65f292dea619051aa858b454f37f1a4307d8`.
That first run's archive digest used variable timestamps. Its installed-file comparison and
test results are valid; use the normalized archive command below for reproducible bundle hashes.
The follow-up workflow fixes that command; its exact-source results are in the PR checks.

## Reproduce and review

From a clean source checkout, use an empty absolute directory for `CLAUDE_CONFIG_DIR` and run:

```sh
claude --version
claude plugin install tldr --marketplace "$PWD" --scope user --json
```

Read that configuration directory's `plugins/installed_plugins.json` for the installed
`tldr@ayerselectronics` `installPath`. Compare its files with `plugins/tldr`, then run:

```sh
claude plugin validate "$installPath" --strict --profile directory --json
claude plugin test "$installPath"
```

Record the source commit and a normalized source bundle hash with each run (replace `HEAD`
with the baseline commit above to reproduce its hash):

```sh
git -c tar.umask=0002 archive --format=tar --mtime=1970-01-01T00:00:00Z HEAD:plugins/tldr | sha256sum
```

The test harness checks the host's hook engine and UI descriptions; it does not paint the native
terminal, Desktop or editor UI. A full live workflow, real Haiku output, native fullscreen
mouse behavior, other OSes/host versions and directory acceptance remain **unverified** here.
Use the README's demo steps only with permission for the account's model usage. Other-agent
adaptations are outside this compatibility claim.
