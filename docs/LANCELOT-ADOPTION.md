# Lancelot deployment adoption

The `adopt-lancelot.yml` consumer handles Company `mcp-deployed` notifications only after
shared deployment acceptance. It creates one deterministic normal PR; it never approves,
merges, force-updates a branch or changes repository rules. Required source review, applicable
installed-version QA and exact-head CI remain the maintainer's delivery gates.

## Trust and credential boundaries

The event must be supplied by GitHub to this repository's main workflow from Release App bot
`350537180` / `ayers-release-automation[bot]`, installation `177067698`. The exact payload is
`{schema:1,release,deployment}`. Release is the existing eight-field immutable identity;
deployment selects only the exact Company acceptance run/attempt/artifact and receipt digest.
Event data cannot select source code, policy, credentials or shared worker configuration.

The credential-free gate loads `.github/lancelot-adoption.json`. Company configuration comes
from a fixed immutable **private** checkout, never from the event's deployment commit. Only
`.github/mcp-deployment.json` and its reviewed `infra/mcp/adoption-policy.json` select the
shared verifier's context. No private configuration is copied into this public repository.
The approved immutable Platform source and accept/recovery worker identities are fixed in
the same consumer settings. Unfinished or malformed pins fail before credential use.

The verification job uses the pinned shared `verifyMcpAcceptance` implementation. It authenticates
the external Company acceptance artifact/job/source and persisted accepted release, then reuses
original source publication, archive, signed npm provenance and MCP Registry verification.
It receives distinct `companyToken` and `sourceToken` read credentials. No fabricated current
Company job environment or trusted-event-only shortcut is used. Only normalized release,
deployment selectors and the receipt's releaseId/verificationCommit/workflow/runId/runAttempt
summary cross the job boundary. Private state, images, provider/runtime checks and configuration
are never uploaded or placed in PR text.

Setup requires owner-controlled `RELEASE_APP_PRIVATE_KEY` for App `5549557`, installed on the
existing Company and Marketplace repositories. The Company token is restricted to Company
Contents/Actions read. `LANCELOT_SOURCE_READ_TOKEN` is a separate source-publication read
credential; access to Lancelot artifacts must be verified rather than assumed from a Company
installation. The Marketplace writer token is separately restricted to Marketplace Contents
and Pull requests write. Both App tokens use pinned action post-job revocation. That cleanup
attempt can warn on deletion failure; green execution alone is not successful-revocation proof.
No permission, key, token or account is created by source preparation.

## Package and PR preparation

After verification, a separate job with no credentials updates the canonical plugin manifest,
launcher and package dependency/lock, then runs the existing `agent-plugins.mjs` generator and
strict plugin validation. npm is isolated from user/global configuration and tokens, uses the
fixed public registry and lifecycle-disabled lock-only installation. The exact package integrity
must match the verified release. No package bin/build/provider call runs. Only the six existing
Lancelot inputs/generated files may change. Exact duplicate versions/bytes are a no-op;
automatic downgrades, drift and same-version different bytes refuse. Failure restores owned files.

The PR plan binds these six files to the current Marketplace source/run/attempt and a trusted
job-output SHA256. The writer validates those bytes before reading credentials and again before
delivery. It refuses if main advanced. A branch is derived from the normalized release identity;
an existing branch/PR is reused only after matching parent, exact changed paths and every file's
bytes. Conflicts and duplicate PRs refuse rather than overwrite. New refs and PRs use normal
GitHub APIs; main is never mutated. App credentials are not passed to package preparation.

## Current integration status

The Company development configuration baseline is `bd86568555e2050e7758b62da3571df1914866a4`.
Root is still completing final production configuration/S3 roles and the released Platform
worker pin. Those Platform/worker values are deliberately unset and fail closed; this is not a
production cutover or an inactive-delivery claim. Root must supply reviewed final immutable pins,
connect the required read/write credentials and authorize production integration. The shared
verifier's local unreleased source is not a usable released pin.

Focused offline proof uses fake shared verification/API/npm transports and the real generator
on temporary copies. It checks event authority, immutable settings, receipt privacy, token
separation, plan digest/run binding, scope-limited idempotent PR delivery, refusal/rollback and
fixed diagnostics. Run `node --test scripts/lancelot-*.test.mjs` and actionlint for the two affected
workflows. No push-triggered CI, real package/network operation, credential use, dispatch, merge
or deployment is implied by these tests. Full production acceptance still requires the actual
authorized release to deploy and create the reviewed Marketplace adoption PR.
