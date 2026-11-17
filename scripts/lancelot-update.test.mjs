import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { lancelotFiles, prepareLancelotUpdate } from "./lancelot-update.mjs";
import { prepareVerifiedPlan } from "./lancelot-consumer.mjs";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const integrity = `sha512-${Buffer.alloc(64, 1).toString("base64")}`;
const release = {
  repository: "ayers-software-repair/lancelot",
  package: "@ayerselectronics/lancelot",
  version: "0.3.4",
  tag: "v0.3.4",
  commit: "a".repeat(40),
  integrity,
  publicationRunId: "123456",
  publicationRunAttempt: 1,
};
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "marketplace-update-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = [
    ".claude-plugin/marketplace.json",
    "scripts/agent-plugins.mjs",
    ...lancelotFiles,
  ];
  for (const name of ["tldr", "letterstream-mail", "lancelot"])
    for (const path of [
      ".claude-plugin/plugin.json",
      ".mcp.json",
      "plugin.json",
      "mcp.json",
      "GENERATED.md",
    ])
      files.push(`plugins/${name}/${path}`);
  for (const path of new Set(files))
    if (existsSync(join(source, path))) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      copyFileSync(join(source, path), join(root, path));
    }
  const before = new Map(
    lancelotFiles.map((path) => [path, readFileSync(join(root, path))]),
  );
  const calls = [];
  const execute = (command, args, options) => {
    assert.deepEqual(
      Object.keys(options.env).sort(),
      [
        "PATH",
        "HOME",
        "NPM_CONFIG_USERCONFIG",
        "NPM_CONFIG_GLOBALCONFIG",
        "NPM_CONFIG_CACHE",
      ].sort(),
    );
    calls.push({ command, args });
    if (command !== "npm") return execFileSync(command, args, options);
    assert(
      args.includes("--ignore-scripts") && args.includes("--package-lock-only"),
    );
    assert.equal(
      args[args.indexOf("--registry") + 1],
      "https://registry.npmjs.org",
    );
    const path = join(root, lancelotFiles[3]),
      lock = JSON.parse(readFileSync(path));
    lock.packages[""].dependencies[release.package] = release.version;
    Object.assign(lock.packages[`node_modules/${release.package}`], {
      version: release.version,
      integrity,
      resolved: `https://registry.npmjs.org/@ayerselectronics/lancelot/-/lancelot-${release.version}.tgz`,
    });
    writeFileSync(path, JSON.stringify(lock, null, 2) + "\n");
  };
  return { root, before, execute, calls };
}

test("verified release edits only six canonical/generated inputs with token-free npm", (t) => {
  const f = fixture(t);
  const unrelated = readFileSync(join(f.root, "plugins/tldr/plugin.json"));
  const result = prepareLancelotUpdate(release, f);
  assert.deepEqual(result.files.sort(), [...lancelotFiles].sort());
  assert.equal(result.changed, true);
  assert.equal(
    JSON.parse(readFileSync(join(f.root, "plugins/lancelot/plugin.json")))
      .version,
    "0.3.4",
  );
  assert.deepEqual(
    JSON.parse(readFileSync(join(f.root, "plugins/lancelot/mcp.json")))
      .mcpServers.lancelot.args,
    ["-y", "@ayerselectronics/lancelot@0.3.4"],
  );
  assert.deepEqual(
    readFileSync(join(f.root, "plugins/tldr/plugin.json")),
    unrelated,
  );
  assert.equal(f.calls.filter((c) => c.command === "npm").length, 1);
});

test("exact duplicate is no-op; downgrade, drift and same-version different bytes refuse", (t) => {
  const f = fixture(t),
    lock = JSON.parse(f.before.get(lancelotFiles[3]));
  const current = {
    ...release,
    tag: "v0.3.3",
    version: "0.3.3",
    integrity: lock.packages[`node_modules/${release.package}`].integrity,
  };
  assert.deepEqual(prepareLancelotUpdate(current, f), {
    changed: false,
    version: "0.3.3",
    files: [],
  });
  assert.equal(f.calls.length, 0);
  assert.throws(
    () => prepareLancelotUpdate({ ...current, integrity }, f),
    /update refused/,
  );
  assert.throws(
    () =>
      prepareLancelotUpdate({ ...release, tag: "v0.3.2", version: "0.3.2" }, f),
    /update refused/,
  );
  const path = join(f.root, lancelotFiles[1]),
    mcp = JSON.parse(readFileSync(path));
  mcp.mcpServers.lancelot.args = ["-y", "@ayerselectronics/lancelot@latest"];
  writeFileSync(path, JSON.stringify(mcp));
  assert.throws(() => prepareLancelotUpdate(release, f), /update refused/);
});

test("package failure or mismatched lock restores all owned files and hides diagnostics", (t) => {
  for (const corrupt of [false, true]) {
    const f = fixture(t);
    const execute = (command, args, options) => {
      if (command === "npm" && !corrupt)
        throw new Error("private-registry-response");
      const result = f.execute(command, args, options);
      if (command === "npm") {
        const path = join(f.root, lancelotFiles[3]),
          lock = JSON.parse(readFileSync(path));
        lock.packages[`node_modules/${release.package}`].integrity = "wrong";
        writeFileSync(path, JSON.stringify(lock));
      }
      return result;
    };
    assert.throws(() => prepareLancelotUpdate(release, { ...f, execute }), {
      message: "Marketplace Lancelot update refused",
    });
    for (const [path, bytes] of f.before)
      assert.deepEqual(readFileSync(join(f.root, path)), bytes);
  }
});

test("verified release summary becomes the exact six-file normal PR plan without private receipt data", (t) => {
  const f = fixture(t);
  const verified = {
    schema: 1,
    release,
    deployment: {
      repository: "ayers-software-repair/ayers.repair",
      workflow: ".github/workflows/deploy-mcp.yml",
      commit: "b".repeat(40),
      runId: "456789",
      runAttempt: 2,
      phase: "accept",
      artifactId: "789",
      receiptDigest: `sha256:${"c".repeat(64)}`,
    },
    acceptance: {
      releaseId: "d".repeat(64),
      verificationCommit: "b".repeat(40),
      workflow: ".github/workflows/deploy-mcp.yml",
      runId: "456789",
      runAttempt: 2,
    },
  };
  const plan = prepareVerifiedPlan(
    verified,
    "e".repeat(40),
    { runId: "999", runAttempt: 1 },
    f,
  );
  assert.equal(plan.files.length, 6);
  assert.deepEqual(plan.release, release);
  assert.equal(
    JSON.parse(
      plan.files.find((file) => file.path === lancelotFiles[0]).content,
    ).version,
    release.version,
  );
  assert.deepEqual(plan.acceptance, verified.acceptance);
  assert.throws(() =>
    prepareVerifiedPlan(
      {
        ...verified,
        acceptance: { ...verified.acceptance, privateImage: "never-public" },
      },
      "e".repeat(40),
      { runId: "999", runAttempt: 1 },
      f,
    ),
  );
});
