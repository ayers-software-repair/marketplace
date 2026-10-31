import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lancelotFiles } from "./lancelot-update.mjs";

const repository = "ayers-software-repair/marketplace";
const prefix = `repos/${repository}`;
const sha = (value) =>
  typeof value === "string" && /^[a-f0-9]{40}$/.test(value);

export function marketplaceApi(token, execute = execFileSync) {
  assert(
    typeof token === "string" && token.length > 0 && !/[\r\n]/.test(token),
  );
  return (path, body, missing = false) => {
    try {
      assert(path.startsWith(prefix + "/"));
      const args = [
        "api",
        "--hostname",
        "github.com",
        "--include",
        "--method",
        body ? "POST" : "GET",
        path,
      ];
      if (body) args.push("--input", "-");
      let bytes;
      try {
        bytes = execute("gh", args, {
          env: {
            PATH: process.env.PATH,
            GH_TOKEN: token,
            GH_HOST: "github.com",
            GH_DEBUG: "",
            GH_PROMPT_DISABLED: "1",
          },
          input: body ? JSON.stringify(body) : undefined,
          timeout: 15000,
          maxBuffer: 1024 * 1024,
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (error) {
        if (missing && /^HTTP\/[0-9.]+ 404 /.test(String(error.stdout)))
          return null;
        throw new Error("Marketplace API request refused");
      }
      const buffer = Buffer.from(bytes);
      assert(buffer.length <= 1024 * 1024);
      const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      assert(text.length <= 1024 * 1024 && /^HTTP\/[0-9.]+ 20[01] /.test(text));
      const start = text.search(/\r?\n\r?\n/);
      assert(start >= 0);
      return JSON.parse(text.slice(start).trim());
    } catch {
      throw new Error("Marketplace API request refused");
    }
  };
}

/** Normal PR creation only. Never merge, approve, force-update a ref or change repository rules. */
export function createLancelotPullRequest(plan, { api } = {}) {
  try {
    assert.equal(plan.schema, 1);
    assert(sha(plan.base));
    const { release, deployment } = plan;
    assert.equal(release.repository, "ayers-software-repair/lancelot");
    assert.equal(release.package, "@ayerselectronics/lancelot");
    assert.match(
      release.version,
      /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/,
    );
    assert.equal(release.tag, `v${release.version}`);
    assert(sha(release.commit));
    assert.match(release.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/);
    assert.equal(deployment.repository, "ayers-software-repair/ayers.repair");
    assert(sha(deployment.commit));
    assert.match(deployment.runId, /^[1-9][0-9]{0,15}$/);
    assert(
      Number.isSafeInteger(deployment.runAttempt) && deployment.runAttempt > 0,
    );
    assert(
      Array.isArray(plan.files) && plan.files.length === lancelotFiles.length,
    );
    assert.deepEqual(
      plan.files.map((file) => file.path).sort(),
      [...lancelotFiles].sort(),
    );
    assert(
      plan.files.every(
        (file) =>
          typeof file.content === "string" &&
          Buffer.byteLength(file.content) <= 512 * 1024,
      ),
    );
    assert(Buffer.byteLength(JSON.stringify(plan)) <= 1024 * 1024);
    const canonicalRelease = Object.fromEntries(
      [
        "repository",
        "tag",
        "commit",
        "package",
        "version",
        "integrity",
        "publicationRunId",
        "publicationRunAttempt",
      ].map((name) => [name, release[name]]),
    );
    assert.deepEqual(release, canonicalRelease);
    const identity = createHash("sha256")
      .update(JSON.stringify(canonicalRelease))
      .digest("hex")
      .slice(0, 16);
    const branch = `codex/lancelot-${release.version}-${identity}`;
    const main = api(`${prefix}/git/ref/heads/main`);
    assert.equal(
      main.object.sha,
      plan.base,
      "Marketplace main changed; prepare again",
    );
    let ref = api(`${prefix}/git/ref/heads/${branch}`, undefined, true);
    const pulls = api(
      `${prefix}/pulls?state=open&head=ayers-software-repair:${branch}&base=main&per_page=100`,
    );
    assert(Array.isArray(pulls) && pulls.length <= 1, "Ambiguous release PR");
    const verifyHead = (head) => {
      assert(sha(head));
      const commit = api(`${prefix}/git/commits/${head}`);
      assert.deepEqual(
        commit.parents.map((parent) => parent.sha),
        [plan.base],
      );
      const compare = api(`${prefix}/compare/${plan.base}...${head}`);
      assert.equal(compare.ahead_by, 1);
      assert.equal(compare.behind_by, 0);
      assert.deepEqual(
        compare.files.map((file) => file.filename).sort(),
        [...lancelotFiles].sort(),
      );
      for (const file of plan.files) {
        const actual = api(`${prefix}/contents/${file.path}?ref=${head}`);
        assert.equal(actual.type, "file");
        assert.equal(actual.encoding, "base64");
        assert.equal(
          Buffer.from(actual.content, "base64").toString("utf8"),
          file.content,
        );
      }
    };
    if (ref) verifyHead(ref.object.sha);
    else {
      assert.equal(pulls.length, 0);
      const base = api(`${prefix}/git/commits/${plan.base}`);
      const tree = api(`${prefix}/git/trees`, {
        base_tree: base.tree.sha,
        tree: plan.files.map((file) => ({
          path: file.path,
          mode: "100644",
          type: "blob",
          content: file.content,
        })),
      });
      assert(sha(tree.sha));
      const commit = api(`${prefix}/git/commits`, {
        message: `chore(lancelot): adopt deployed ${release.version}\n\nVerified release ${release.commit}; archive ${release.integrity}.\n\nSigned-off-by: Ayers Release Automation <350537180+ayers-release-automation[bot]@users.noreply.github.com>`,
        tree: tree.sha,
        parents: [plan.base],
      });
      assert(sha(commit.sha));
      ref = api(`${prefix}/git/refs`, {
        ref: `refs/heads/${branch}`,
        sha: commit.sha,
      });
      assert.equal(ref.object.sha, commit.sha);
    }
    if (pulls.length) {
      assert.equal(pulls[0].head.sha, ref.object.sha);
      assert.equal(pulls[0].head.repo.full_name, repository);
      assert.equal(pulls[0].head.ref, branch);
      assert.equal(pulls[0].base.ref, "main");
      assert.equal(pulls[0].state, "open");
      assert(Number.isSafeInteger(pulls[0].number) && pulls[0].number > 0);
      assert.equal(
        pulls[0].html_url,
        `https://github.com/${repository}/pull/${pulls[0].number}`,
      );
      return {
        number: pulls[0].number,
        url: pulls[0].html_url,
        head: ref.object.sha,
        reused: true,
      };
    }
    const body = [
      `Adopt verified deployed Lancelot ${release.version} across the canonical plugin inputs, lock and generated manifests.`,
      `Release: ${release.repository}@${release.commit} (${release.tag}); original publication run ${release.publicationRunId}, attempt ${release.publicationRunAttempt}.`,
      `Archive: ${release.integrity}`,
      `Company acceptance: https://github.com/${deployment.repository}/actions/runs/${deployment.runId}/attempts/${deployment.runAttempt}; source ${deployment.commit}; receipt ${deployment.receiptDigest}.`,
      "Shared deployment/publication verification, generator freshness and strict plugin checks precede this PR. Independent review, applicable installed-version QA and required CI remain delivery gates. This automation never approves or merges its own PR.",
    ].join("\n\n");
    const pr = api(`${prefix}/pulls`, {
      title: `chore(lancelot): adopt deployed ${release.version}`,
      head: branch,
      base: "main",
      body,
      maintainer_can_modify: false,
    });
    assert.equal(pr.head.sha, ref.object.sha);
    assert.equal(pr.base.ref, "main");
    assert(Number.isSafeInteger(pr.number) && pr.number > 0);
    assert.equal(
      pr.html_url,
      `https://github.com/${repository}/pull/${pr.number}`,
    );
    return {
      number: pr.number,
      url: pr.html_url,
      head: ref.object.sha,
      reused: false,
    };
  } catch {
    throw new Error("Marketplace Lancelot PR delivery refused");
  }
}
