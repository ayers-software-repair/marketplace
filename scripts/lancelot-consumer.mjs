import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  deploymentNotification,
  verifyDeployedLancelot,
} from "./lancelot-deployment.mjs";
import { lancelotFiles, prepareLancelotUpdate } from "./lancelot-update.mjs";
import { createLancelotPullRequest, marketplaceApi } from "./lancelot-pr.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const digest = (bytes) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const sha = (value) =>
  typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const fileBytes = (file, maximum = 1024 * 1024) => {
  const info = lstatSync(file);
  assert(
    info.isFile() &&
      !info.isSymbolicLink() &&
      info.size > 0 &&
      info.size <= maximum,
  );
  const bytes = readFileSync(file);
  assert(bytes.length <= maximum);
  return bytes;
};
const read = (file, maximum) =>
  JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(fileBytes(file, maximum)),
  );
const keys = (value, fields) =>
  assert.deepEqual(Object.keys(value).sort(), [...fields].sort());

export function consumerSettings(settings) {
  keys(settings, ["schema", "company", "platform", "workers"]);
  assert.equal(settings.schema, 1);
  keys(settings.company, ["repository", "commit", "configPath", "policyPath"]);
  assert.equal(
    settings.company.repository,
    "ayers-software-repair/ayers.repair",
  );
  assert(sha(settings.company.commit));
  assert.equal(settings.company.configPath, ".github/mcp-deployment.json");
  assert.equal(settings.company.policyPath, "infra/mcp/adoption-policy.json");
  keys(settings.platform, ["repository", "commit"]);
  assert.equal(settings.platform.repository, "ayers-software-repair/platform");
  assert(sha(settings.platform.commit), "Released Platform pin is unfinished");
  keys(settings.workers, ["accept", "recovery-accept"]);
  for (const [phase, worker] of Object.entries(settings.workers)) {
    assert(worker, "Approved shared worker is unfinished");
    keys(worker, ["repository", "workflowFilePath", "ref", "sha"]);
    assert.equal(worker.repository, settings.platform.repository);
    assert.equal(worker.sha, settings.platform.commit);
    assert.equal(
      worker.workflowFilePath,
      `.github/workflows/${phase === "accept" ? "deploy" : "recover"}-mcp.yml`,
    );
    assert.equal(typeof worker.ref, "string");
    assert(
      worker.ref.startsWith(`${worker.repository}/${worker.workflowFilePath}@`),
    );
    assert(!/[\s\x00-\x1f\x7f]/.test(worker.ref) && worker.ref.length < 300);
  }
  return settings;
}

export function prepareVerifiedPlan(verified, base, sourceRun, options) {
  assert(sha(base));
  keys(verified, ["schema", "release", "deployment", "acceptance"]);
  assert.equal(verified.schema, 1);
  keys(verified.acceptance, [
    "releaseId",
    "verificationCommit",
    "workflow",
    "runId",
    "runAttempt",
  ]);
  const result = prepareLancelotUpdate(verified.release, options);
  if (!result.changed) return null;
  assert.deepEqual([...result.files].sort(), [...lancelotFiles].sort());
  return {
    schema: 1,
    base,
    sourceRun,
    release: verified.release,
    deployment: verified.deployment,
    acceptance: verified.acceptance,
    files: lancelotFiles.map((path) => ({
      path,
      content: readFileSync(join(options.root, path), "utf8"),
    })),
  };
}

export function checkedPlan(file, expectedDigest, env) {
  assert.match(expectedDigest, /^sha256:[a-f0-9]{64}$/);
  const bytes = fileBytes(file);
  assert.equal(digest(bytes), expectedDigest);
  const plan = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  );
  assert.equal(plan.base, env.GITHUB_SHA);
  assert.deepEqual(plan.sourceRun, {
    runId: env.GITHUB_RUN_ID,
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT),
  });
  assert.deepEqual(
    plan.files.map((item) => item.path).sort(),
    [...lancelotFiles].sort(),
  );
  return plan;
}

async function main(env) {
  const mode = process.argv[2];
  assert.equal(process.argv.length, 3);
  const output = (values) => {
    for (const [key, value] of Object.entries(values)) {
      assert(!/[\r\n]/.test(String(value)));
      writeFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`, { flag: "a" });
    }
  };
  if (mode === "gate" || mode === "verify") {
    const settings = consumerSettings(
      read(join(root, ".github/lancelot-adoption.json"), 16384),
    );
    const event = read(env.GITHUB_EVENT_PATH);
    deploymentNotification(env, event);
    if (mode === "gate") {
      output({
        "company-commit": settings.company.commit,
        "platform-commit": settings.platform.commit,
      });
      return;
    }
    const git = (directory) =>
      execFileSync("git", ["-c", "core.fsmonitor=false", "rev-parse", "HEAD"], {
        cwd: directory,
        env: { PATH: env.PATH },
        timeout: 15000,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    const company = join(root, "_company"),
      platform = join(root, "_platform");
    assert.equal(git(company), settings.company.commit);
    assert.equal(git(platform), settings.platform.commit);
    const { loadMcpContext } = await import(
      pathToFileURL(join(platform, "codestyle/ci/release/mcp-config.mjs"))
    );
    const { verifyMcpAcceptance } = await import(
      pathToFileURL(join(platform, "codestyle/ci/release/mcp-acceptance.mjs"))
    );
    const fixedConsumerContext = loadMcpContext(
      company,
      settings.company.configPath,
    );
    assert.equal(
      fixedConsumerContext.config.policyPath,
      settings.company.policyPath,
    );
    const verified = await verifyDeployedLancelot(env, event, {
      verifyMcpAcceptance,
      fixedConsumerContext,
      worker: settings.workers[event.client_payload.deployment.phase],
      companyToken: env.COMPANY_READ_TOKEN,
      sourceToken: env.SOURCE_READ_TOKEN,
    });
    output({ "verified-json": JSON.stringify(verified) });
    return;
  }
  if (mode === "prepare") {
    assert(Buffer.byteLength(env.VERIFIED_JSON) <= 16384);
    const verified = JSON.parse(env.VERIFIED_JSON);
    const plan = prepareVerifiedPlan(
      verified,
      env.GITHUB_SHA,
      { runId: env.GITHUB_RUN_ID, runAttempt: Number(env.GITHUB_RUN_ATTEMPT) },
      { root },
    );
    if (!plan) {
      output({ changed: "false" });
      return;
    }
    const changed = execFileSync("git", ["diff", "--name-only"], {
      cwd: root,
      env: { PATH: env.PATH },
      encoding: "utf8",
      timeout: 15000,
    })
      .trim()
      .split("\n");
    assert.deepEqual(changed.sort(), [...lancelotFiles].sort());
    execFileSync("git", ["diff", "--check"], {
      cwd: root,
      env: { PATH: env.PATH },
      timeout: 15000,
      stdio: "pipe",
    });
    execFileSync(
      "claude",
      ["plugin", "validate", "--strict", "plugins/lancelot"],
      {
        cwd: root,
        env: {
          PATH: env.PATH,
          CLAUDE_CONFIG_DIR: join(env.RUNNER_TEMP, "lancelot-validation"),
        },
        timeout: 30000,
        stdio: "pipe",
      },
    );
    const bytes = Buffer.from(JSON.stringify(plan) + "\n");
    assert(bytes.length <= 1024 * 1024);
    writeFileSync(join(env.RUNNER_TEMP, "lancelot-pr-plan.json"), bytes, {
      flag: "wx",
    });
    output({ changed: "true", "plan-digest": digest(bytes) });
    return;
  }
  assert(mode === "check-plan" || mode === "pr");
  const plan = checkedPlan(
    join(env.RUNNER_TEMP, "lancelot-plan/lancelot-pr-plan.json"),
    env.PLAN_DIGEST,
    env,
  );
  if (mode === "check-plan") return;
  const result = createLancelotPullRequest(plan, {
    api: marketplaceApi(env.GH_TOKEN),
  });
  output({ "pr-url": result.url, "pr-head": result.head });
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main(process.env).catch(() => {
    console.error("Marketplace Lancelot adoption refused");
    process.exitCode = 1;
  });
}
