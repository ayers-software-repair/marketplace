import assert from "node:assert/strict";

const keys = (value, expected) => {
  assert(value && typeof value === "object" && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort());
};
const numericId = (value) =>
  typeof value === "string" &&
  /^[1-9][0-9]{0,15}$/.test(value) &&
  Number.isSafeInteger(Number(value));
const releaseFields = [
  "repository",
  "tag",
  "commit",
  "package",
  "version",
  "integrity",
  "publicationRunId",
  "publicationRunAttempt",
];

/** GitHub supplies the event; no event field selects policy, credentials, code or shared worker. */
export function deploymentNotification(env, event) {
  try {
    assert.equal(env.GITHUB_ACTIONS, "true");
    assert.equal(env.GITHUB_EVENT_NAME, "repository_dispatch");
    assert.equal(env.GITHUB_REPOSITORY, "ayers-software-repair/marketplace");
    assert.equal(env.GITHUB_REF, "refs/heads/main");
    assert.equal(
      env.GITHUB_WORKFLOW_REF,
      "ayers-software-repair/marketplace/.github/workflows/adopt-lancelot.yml@refs/heads/main",
    );
    assert.match(env.GITHUB_SHA, /^[a-f0-9]{40}$/);
    assert.equal(event.repository?.full_name, env.GITHUB_REPOSITORY);
    assert.equal(event.action, "mcp-deployed");
    assert.deepEqual(
      {
        id: event.sender?.id,
        login: event.sender?.login,
        type: event.sender?.type,
      },
      { id: 350537180, login: "ayers-release-automation[bot]", type: "Bot" },
    );
    assert.equal(event.installation?.id, 177067698);
    const payload = event.client_payload;
    keys(payload, ["schema", "release", "deployment"]);
    assert.equal(payload.schema, 1);
    keys(payload.release, releaseFields);
    assert.equal(payload.release.repository, "ayers-software-repair/lancelot");
    assert.equal(payload.release.package, "@ayerselectronics/lancelot");
    assert(numericId(payload.release.publicationRunId));
    assert(
      Number.isSafeInteger(payload.release.publicationRunAttempt) &&
        payload.release.publicationRunAttempt > 0,
    );
    keys(payload.deployment, [
      "repository",
      "workflow",
      "commit",
      "runId",
      "runAttempt",
      "phase",
      "artifactId",
      "receiptDigest",
    ]);
    const deployment = payload.deployment;
    assert.equal(deployment.repository, "ayers-software-repair/ayers.repair");
    assert.equal(deployment.workflow, ".github/workflows/deploy-mcp.yml");
    assert.match(deployment.commit, /^[a-f0-9]{40}$/);
    assert(numericId(deployment.runId) && numericId(deployment.artifactId));
    assert(
      Number.isSafeInteger(deployment.runAttempt) && deployment.runAttempt > 0,
    );
    assert(["accept", "recovery-accept"].includes(deployment.phase));
    assert.match(deployment.receiptDigest, /^sha256:[a-f0-9]{64}$/);
    return { release: payload.release, deployment };
  } catch {
    throw new Error("Marketplace deployment notification refused");
  }
}

/** The verifier, fixed context and immutable worker policy come from reviewed consumer source. */
export async function verifyDeployedLancelot(env, event, options) {
  try {
    const request = deploymentNotification(env, event);
    const {
      verifyMcpAcceptance,
      fixedConsumerContext,
      worker,
      companyToken,
      sourceToken,
    } = options;
    assert.equal(typeof verifyMcpAcceptance, "function");
    for (const token of [companyToken, sourceToken])
      assert(
        typeof token === "string" && token.length > 0 && !/[\r\n]/.test(token),
      );
    assert.notEqual(companyToken, sourceToken);
    const result = await verifyMcpAcceptance(fixedConsumerContext, request, {
      worker,
      companyToken,
      sourceToken,
    });
    assert.deepEqual(
      result.release,
      request.release,
      "Verified release differs",
    );
    const { receipt } = result;
    assert.match(receipt.releaseId, /^[a-f0-9]{64}$/);
    assert.equal(receipt.verificationCommit, request.deployment.commit);
    assert.equal(receipt.workflow, request.deployment.workflow);
    assert.equal(receipt.runId, request.deployment.runId);
    assert.equal(receipt.runAttempt, request.deployment.runAttempt);
    // Never publish the private receipt's image/provider/runtime observations.
    return {
      schema: 1,
      ...request,
      acceptance: Object.fromEntries(
        [
          "releaseId",
          "verificationCommit",
          "workflow",
          "runId",
          "runAttempt",
        ].map((name) => [name, receipt[name]]),
      ),
    };
  } catch {
    throw new Error("Marketplace deployed release verification refused");
  }
}
