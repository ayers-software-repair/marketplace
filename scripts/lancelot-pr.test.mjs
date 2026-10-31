import assert from "node:assert/strict";
import test from "node:test";
import { createLancelotPullRequest, marketplaceApi } from "./lancelot-pr.mjs";
import { lancelotFiles } from "./lancelot-update.mjs";

const prefix = "repos/ayers-software-repair/marketplace";
const base = "a".repeat(40),
  head = "b".repeat(40),
  tree = "c".repeat(40);
const plan = () => ({
  schema: 1,
  base,
  release: {
    repository: "ayers-software-repair/lancelot",
    tag: "v0.3.4",
    commit: "d".repeat(40),
    package: "@ayerselectronics/lancelot",
    version: "0.3.4",
    integrity: `sha512-${Buffer.alloc(64, 1).toString("base64")}`,
    publicationRunId: "123456",
    publicationRunAttempt: 1,
  },
  deployment: {
    repository: "ayers-software-repair/ayers.repair",
    workflow: ".github/workflows/deploy-mcp.yml",
    commit: "e".repeat(40),
    runId: "456789",
    runAttempt: 2,
    phase: "accept",
    artifactId: "789",
    receiptDigest: `sha256:${"f".repeat(64)}`,
  },
  files: lancelotFiles.map((path) => ({
    path,
    content: `${path} synthetic-data\n`,
  })),
});
function fixture(p) {
  const state = {
    main: base,
    ref: null,
    pulls: [],
    writes: [],
    corrupt: false,
  };
  const api = (path, body, missing) => {
    assert(path.startsWith(prefix + "/"));
    assert(!/\/merge|\/reviews|protection|ruleset/.test(path));
    if (body) state.writes.push(path);
    if (path === `${prefix}/git/ref/heads/main`)
      return { object: { sha: state.main } };
    if (path.startsWith(`${prefix}/git/ref/heads/codex/`)) {
      assert.equal(missing, true);
      return state.ref;
    }
    if (path.startsWith(`${prefix}/pulls?`)) return state.pulls;
    if (path === `${prefix}/git/commits/${base}`)
      return { tree: { sha: tree } };
    if (path === `${prefix}/git/commits/${head}`)
      return { parents: [{ sha: base }], tree: { sha: tree } };
    if (path.startsWith(`${prefix}/compare/`))
      return {
        ahead_by: 1,
        behind_by: 0,
        files: lancelotFiles.map((filename) => ({ filename })),
      };
    if (path.startsWith(`${prefix}/contents/`)) {
      const name = path.slice(`${prefix}/contents/`.length).split("?")[0];
      return {
        type: "file",
        encoding: "base64",
        content: Buffer.from(
          state.corrupt
            ? "foreign"
            : p.files.find((file) => file.path === name).content,
        ).toString("base64"),
      };
    }
    if (path === `${prefix}/git/trees`) {
      assert.equal(body.base_tree, tree);
      assert.deepEqual(
        body.tree.map((file) => file.path).sort(),
        [...lancelotFiles].sort(),
      );
      return { sha: tree };
    }
    if (path === `${prefix}/git/commits`) {
      assert.deepEqual(body.parents, [base]);
      return { sha: head };
    }
    if (path === `${prefix}/git/refs`) {
      assert(body.ref.startsWith("refs/heads/codex/lancelot-"));
      state.ref = { object: { sha: head } };
      return state.ref;
    }
    if (path === `${prefix}/pulls`) {
      assert.equal(body.base, "main");
      assert.equal(body.maintainer_can_modify, false);
      assert.doesNotMatch(
        body.body,
        /privateImage|privateProvider|privateObservations/,
      );
      const pr = {
        number: 10,
        html_url:
          "https://github.com/ayers-software-repair/marketplace/pull/10",
        state: "open",
        head: {
          sha: head,
          ref: body.head,
          repo: { full_name: "ayers-software-repair/marketplace" },
        },
        base: { ref: "main" },
      };
      state.pulls.push(pr);
      return pr;
    }
    assert.fail(`unexpected API path: ${path}`);
  };
  return { state, api };
}

test("one deterministic normal PR is created, reused byte-exactly, and never merged", () => {
  const p = plan(),
    f = fixture(p);
  const first = createLancelotPullRequest(p, f);
  assert.equal(first.reused, false);
  assert.equal(f.state.writes.length, 4);
  const second = createLancelotPullRequest(p, f);
  assert.equal(second.reused, true);
  assert.equal(second.head, first.head);
  assert.equal(f.state.writes.length, 4);
  const reordered = {
    ...p,
    release: Object.fromEntries(Object.entries(p.release).reverse()),
  };
  assert.equal(createLancelotPullRequest(reordered, f).reused, true);
});

test("stale main, conflicting branch, extra file and duplicate PR refuse without overwriting", () => {
  for (const variant of [
    "stale",
    "conflict",
    "extra",
    "duplicate",
    "foreign",
  ]) {
    const p = plan(),
      f = fixture(p);
    if (variant === "stale") f.state.main = "f".repeat(40);
    if (variant === "extra")
      p.files.push({ path: ".github/workflows/unsafe.yml", content: "data" });
    if (["conflict", "duplicate", "foreign"].includes(variant)) {
      createLancelotPullRequest(p, f);
      f.state.writes.length = 0;
    }
    if (variant === "conflict") f.state.corrupt = true;
    if (variant === "duplicate") f.state.pulls.push(f.state.pulls[0]);
    if (variant === "foreign")
      f.state.pulls[0].head.repo.full_name = "foreign/repo";
    assert.throws(() => createLancelotPullRequest(p, f), {
      message: "Marketplace Lancelot PR delivery refused",
    });
    assert.equal(f.state.writes.length, 0);
  }
});

test("writer transport uses bounded typed API input and sanitizes malformed response failures", () => {
  const api = marketplaceApi("synthetic-writer", (command, args, options) => {
    assert.equal(command, "gh");
    assert.equal(options.env.GH_TOKEN, "synthetic-writer");
    assert.deepEqual(
      Object.keys(options.env).sort(),
      ["PATH", "GH_TOKEN", "GH_HOST", "GH_DEBUG", "GH_PROMPT_DISABLED"].sort(),
    );
    assert.equal(options.input, JSON.stringify({ title: "synthetic" }));
    assert.equal(args[args.indexOf("--method") + 1], "POST");
    return Buffer.from(
      'HTTP/2.0 201 Created\r\ncontent-type: application/json\r\n\r\n{"number":10}',
    );
  });
  assert.deepEqual(api(`${prefix}/pulls`, { title: "synthetic" }), {
    number: 10,
  });
  for (const execute of [
    () => Buffer.from("HTTP/2.0 200 OK\r\n\r\nSECR3T42 not JSON"),
    () => {
      throw new Error("SECR3T42 transport");
    },
  ]) {
    assert.throws(
      () => marketplaceApi("synthetic", execute)(`${prefix}/pulls`),
      (error) => {
        assert.equal(error.message, "Marketplace API request refused");
        assert.equal(Object.hasOwn(error, "cause"), false);
        return true;
      },
    );
  }
  const missing = marketplaceApi("synthetic", () => {
    throw Object.assign(new Error("404"), {
      stdout: "HTTP/2.0 404 Not Found\r\n\r\n{}",
    });
  });
  assert.equal(
    missing(`${prefix}/git/ref/heads/codex/absent`, undefined, true),
    null,
  );
  assert.throws(() => missing(`${prefix}/git/ref/heads/main`));
});
