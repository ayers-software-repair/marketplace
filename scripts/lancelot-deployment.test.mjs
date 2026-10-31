import assert from "node:assert/strict";
import test from "node:test";
import {
  deploymentNotification,
  verifyDeployedLancelot,
} from "./lancelot-deployment.mjs";
import { consumerSettings } from "./lancelot-consumer.mjs";

const env = {
  GITHUB_ACTIONS: "true",
  GITHUB_EVENT_NAME: "repository_dispatch",
  GITHUB_REPOSITORY: "ayers-software-repair/marketplace",
  GITHUB_REF: "refs/heads/main",
  GITHUB_SHA: "a".repeat(40),
  GITHUB_WORKFLOW_REF:
    "ayers-software-repair/marketplace/.github/workflows/adopt-lancelot.yml@refs/heads/main",
};
const release = {
  repository: "ayers-software-repair/lancelot",
  tag: "v0.3.4",
  commit: "b".repeat(40),
  package: "@ayerselectronics/lancelot",
  version: "0.3.4",
  integrity: `sha512-${Buffer.alloc(64, 1).toString("base64")}`,
  publicationRunId: "123456",
  publicationRunAttempt: 1,
};
const deployment = {
  repository: "ayers-software-repair/ayers.repair",
  workflow: ".github/workflows/deploy-mcp.yml",
  commit: "c".repeat(40),
  runId: "456789",
  runAttempt: 2,
  phase: "accept",
  artifactId: "789",
  receiptDigest: `sha256:${"d".repeat(64)}`,
};
const event = () => ({
  action: "mcp-deployed",
  repository: { full_name: env.GITHUB_REPOSITORY },
  sender: {
    id: 350537180,
    login: "ayers-release-automation[bot]",
    type: "Bot",
  },
  installation: { id: 177067698 },
  client_payload: {
    schema: 1,
    release: { ...release },
    deployment: { ...deployment },
  },
});

test("authentic event calls only the shared external verifier with separate trusted read inputs", async () => {
  const fixedConsumerContext = { reviewed: true },
    worker = { immutable: true };
  let calls = 0;
  const verified = await verifyDeployedLancelot(env, event(), {
    fixedConsumerContext,
    worker,
    companyToken: "synthetic-company-read",
    sourceToken: "synthetic-source-read",
    verifyMcpAcceptance: async (context, input, options) => {
      calls++;
      assert.equal(context, fixedConsumerContext);
      assert.equal(options.worker, worker);
      assert.notEqual(options.companyToken, options.sourceToken);
      assert.deepEqual(input, { release, deployment });
      return {
        release,
        receipt: {
          releaseId: "e".repeat(64),
          verificationCommit: deployment.commit,
          workflow: deployment.workflow,
          runId: deployment.runId,
          runAttempt: deployment.runAttempt,
          privateImage: "must-not-be-serialized",
          privateObservations: ["never-public"],
        },
      };
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(
    Object.keys(verified.acceptance).sort(),
    [
      "releaseId",
      "verificationCommit",
      "workflow",
      "runId",
      "runAttempt",
    ].sort(),
  );
  assert.doesNotMatch(
    JSON.stringify(verified),
    /must-not-be-serialized|never-public|synthetic-company/,
  );
});

test("forged, legacy and event-selected policies refuse before any shared read", async () => {
  for (const mutate of [
    (e) => e.sender.id++,
    (e) => e.installation.id++,
    (e) => {
      e.action = "mcp-release";
    },
    (e) => {
      e.client_payload.policy = {};
    },
    (e) => {
      e.client_payload.deployment.repository = "foreign/repo";
    },
    (e) => {
      e.client_payload.deployment.phase = "runtime";
    },
    (e) => {
      e.client_payload.deployment.artifactId = "../other";
    },
    (e) => {
      e.client_payload.release.versionOnly = true;
    },
  ]) {
    const e = event();
    mutate(e);
    let called = false;
    await assert.rejects(
      verifyDeployedLancelot(env, e, {
        verifyMcpAcceptance: async () => {
          called = true;
        },
      }),
      { message: "Marketplace deployed release verification refused" },
    );
    assert.equal(called, false);
  }
  assert.throws(() =>
    deploymentNotification(
      { ...env, GITHUB_REF: "refs/heads/foreign" },
      event(),
    ),
  );
  await assert.rejects(
    verifyDeployedLancelot(env, event(), {
      companyToken: "same",
      sourceToken: "same",
      verifyMcpAcceptance: async () => {
        throw new Error("private-response");
      },
    }),
    { message: "Marketplace deployed release verification refused" },
  );
  await assert.rejects(
    verifyDeployedLancelot(env, event(), {
      companyToken: "one",
      sourceToken: "two",
      verifyMcpAcceptance: async () => {
        throw new Error("private-response");
      },
    }),
    { message: "Marketplace deployed release verification refused" },
  );
});

test("production settings cannot run with unfinished pins or event policy", () => {
  const settings = {
    schema: 1,
    company: {
      repository: deployment.repository,
      commit: deployment.commit,
      configPath: ".github/mcp-deployment.json",
      policyPath: "infra/mcp/adoption-policy.json",
    },
    platform: { repository: "ayers-software-repair/platform", commit: null },
    workers: { accept: null, "recovery-accept": null },
  };
  assert.throws(() => consumerSettings(settings));
  const sha = "f".repeat(40);
  settings.platform.commit = sha;
  for (const [phase, file] of [
    ["accept", "deploy-mcp.yml"],
    ["recovery-accept", "recover-mcp.yml"],
  ])
    settings.workers[phase] = {
      repository: settings.platform.repository,
      workflowFilePath: `.github/workflows/${file}`,
      ref: `${settings.platform.repository}/.github/workflows/${file}@v0.0.1`,
      sha,
    };
  assert.equal(consumerSettings(settings), settings);
  assert.throws(() => consumerSettings({ ...settings, eventPolicy: {} }));
});
