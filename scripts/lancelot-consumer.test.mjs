import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { checkedPlan } from "./lancelot-consumer.mjs";
import { lancelotFiles } from "./lancelot-update.mjs";

test("PR handoff binds one read of exact bytes to current source/run/attempt before credentials", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "marketplace-plan-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "plan.json"),
    env = {
      GITHUB_SHA: "a".repeat(40),
      GITHUB_RUN_ID: "123456",
      GITHUB_RUN_ATTEMPT: "2",
    };
  const plan = {
    schema: 1,
    base: env.GITHUB_SHA,
    sourceRun: { runId: env.GITHUB_RUN_ID, runAttempt: 2 },
    files: lancelotFiles.map((path) => ({ path, content: "synthetic" })),
  };
  const bytes = Buffer.from(JSON.stringify(plan)),
    digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  writeFileSync(file, bytes);
  assert.deepEqual(checkedPlan(file, digest, env), plan);
  assert.throws(() =>
    checkedPlan(file, digest, { ...env, GITHUB_RUN_ATTEMPT: "3" }),
  );
  assert.throws(() =>
    checkedPlan(file, digest, { ...env, GITHUB_SHA: "b".repeat(40) }),
  );
  writeFileSync(file, Buffer.concat([bytes, Buffer.from(" ")]));
  assert.throws(() => checkedPlan(file, digest, env));
});

test("workflow isolates private verification, credential-free package editing and normal PR writing", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/adopt-lancelot.yml", import.meta.url),
    "utf8",
  );
  const [head, verifyRest] = workflow.split("\n  verify:\n"),
    [verify, prepareRest] = verifyRest.split("\n  prepare:\n"),
    [prepare, writer] = prepareRest.split("\n  pr:\n");
  assert.match(head, /types: \[mcp-deployed\]/);
  assert.doesNotMatch(head, /secrets\./);
  assert.match(verify, /ref: \$\{\{ needs.gate.outputs.company-commit \}\}/);
  assert.doesNotMatch(verify, /client_payload.*commit/);
  assert.match(verify, /repositories: ayers.repair/);
  assert.match(verify, /permission-actions: read/);
  assert.match(
    verify,
    /SOURCE_READ_TOKEN: \$\{\{ secrets.LANCELOT_SOURCE_READ_TOKEN \}\}/,
  );
  assert.doesNotMatch(prepare, /secrets\.|GH_TOKEN|create-github-app-token/);
  assert.match(
    prepare,
    /VERIFIED_JSON: \$\{\{ needs.verify.outputs.verified-json \}\}/,
  );
  assert.match(writer, /repositories: marketplace/);
  assert.match(writer, /permission-pull-requests: write/);
  assert(
    writer.indexOf("check-plan") <
      writer.indexOf("Create Marketplace-only PR token"),
  );
  assert.doesNotMatch(
    writer,
    /npm |gh pr merge|--auto|--approve|force: true|_company/,
  );
  assert.equal((workflow.match(/skip-token-revoke: false/g) ?? []).length, 2);
  assert.doesNotMatch(
    workflow,
    /continue-on-error|workflow_dispatch|pull_request_target/,
  );
});

test("actual gate CLI refuses missing trusted context with no output", () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./lancelot-consumer.mjs", import.meta.url)),
      "gate",
    ],
    { env: {}, encoding: "utf8", timeout: 5000 },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "Marketplace Lancelot adoption refused\n");
});
