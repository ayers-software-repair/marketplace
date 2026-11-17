import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const lancelotFiles = [
  "plugins/lancelot/.claude-plugin/plugin.json",
  "plugins/lancelot/.mcp.json",
  "plugins/lancelot/package.json",
  "plugins/lancelot/package-lock.json",
  "plugins/lancelot/plugin.json",
  "plugins/lancelot/mcp.json",
];
const packageName = "@ayerselectronics/lancelot";
const versionParts = (value) => {
  assert.equal(typeof value, "string");
  assert.match(value, /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/);
  const parts = value.split(".").map(Number);
  assert(parts.every((n) => n <= 65535));
  return parts;
};

/** The caller independently authenticates deployment and publication before invoking this editor. */
export function prepareLancelotUpdate(
  release,
  { root, execute = execFileSync } = {},
) {
  const before = new Map();
  let temp;
  try {
    assert.equal(release.repository, "ayers-software-repair/lancelot");
    assert.equal(release.package, packageName);
    assert.equal(release.tag, `v${release.version}`);
    assert.match(release.commit, /^[a-f0-9]{40}$/);
    assert.match(release.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/);
    assert.equal(
      Buffer.from(release.integrity.slice(7), "base64").toString("base64"),
      release.integrity.slice(7),
    );
    const next = versionParts(release.version);
    for (const path of lancelotFiles)
      before.set(path, readFileSync(join(root, path)));
    const json = (path) => JSON.parse(before.get(path));
    const [manifest, mcp, pkg, lock, generatedManifest, generatedMcp] =
      lancelotFiles.map(json);
    assert.equal(manifest.name, "lancelot");
    assert.equal(generatedManifest.name, "lancelot");
    assert.equal(pkg.name, "lancelot-plugin");
    assert.equal(lock.name, pkg.name);
    const current = manifest.version;
    const old = versionParts(current);
    const launcher = `@ayerselectronics/lancelot@${current}`;
    assert.deepEqual(mcp.mcpServers.lancelot.args, ["-y", launcher]);
    assert.deepEqual(generatedMcp.mcpServers.lancelot.args, ["-y", launcher]);
    assert.equal(generatedManifest.version, current);
    assert.equal(pkg.dependencies[packageName], current);
    assert.equal(lock.packages[""].dependencies[packageName], current);
    assert.equal(lock.packages[`node_modules/${packageName}`].version, current);
    assert.equal(
      lock.packages[`node_modules/${packageName}`].resolved,
      `https://registry.npmjs.org/@ayerselectronics/lancelot/-/lancelot-${current}.tgz`,
    );
    const difference = next.findIndex((n, i) => n !== old[i]);
    if (difference === -1) {
      assert.equal(
        lock.packages[`node_modules/${packageName}`].integrity,
        release.integrity,
        "same version has different bytes",
      );
      return { changed: false, version: current, files: [] };
    }
    assert(next[difference] > old[difference], "automatic downgrade refused");
    temp = mkdtempSync(join(tmpdir(), "marketplace-lancelot-"));
    const userConfig = join(temp, "user.npmrc"),
      globalConfig = join(temp, "global.npmrc");
    writeFileSync(userConfig, "");
    writeFileSync(globalConfig, "");
    const options = {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        HOME: temp,
        NPM_CONFIG_USERCONFIG: userConfig,
        NPM_CONFIG_GLOBALCONFIG: globalConfig,
        NPM_CONFIG_CACHE: join(temp, "cache"),
      },
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    };
    execute(
      process.execPath,
      ["scripts/agent-plugins.mjs", "--check"],
      options,
    );
    manifest.version = release.version;
    mcp.mcpServers.lancelot.args = ["-y", `${packageName}@${release.version}`];
    pkg.dependencies[packageName] = release.version;
    for (const [index, data] of [
      [0, manifest],
      [1, mcp],
      [2, pkg],
    ])
      writeFileSync(
        join(root, lancelotFiles[index]),
        JSON.stringify(data, null, 2) + "\n",
      );
    execute(
      "npm",
      [
        "install",
        "--package-lock-only",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--save-exact",
        "--registry",
        "https://registry.npmjs.org",
        "--fetch-retries=0",
        "--fetch-timeout=20000",
      ],
      { ...options, cwd: join(root, "plugins/lancelot") },
    );
    const installed = JSON.parse(readFileSync(join(root, lancelotFiles[3])));
    assert.equal(
      installed.packages[""].dependencies[packageName],
      release.version,
    );
    const entry = installed.packages[`node_modules/${packageName}`];
    assert.equal(entry.version, release.version);
    assert.equal(entry.integrity, release.integrity);
    assert.equal(
      entry.resolved,
      `https://registry.npmjs.org/@ayerselectronics/lancelot/-/lancelot-${release.version}.tgz`,
    );
    execute(process.execPath, ["scripts/agent-plugins.mjs"], options);
    execute(
      process.execPath,
      ["scripts/agent-plugins.mjs", "--check"],
      options,
    );
    return {
      changed: true,
      version: release.version,
      files: lancelotFiles.filter(
        (path) => !readFileSync(join(root, path)).equals(before.get(path)),
      ),
    };
  } catch {
    for (const [path, bytes] of before) writeFileSync(join(root, path), bytes);
    throw new Error("Marketplace Lancelot update refused");
  } finally {
    if (temp) rmSync(temp, { recursive: true, force: true });
  }
}
