#!/usr/bin/env node
// Builds a static snapshot of the app and publishes it to the `gh-pages`
// branch, so the dashboard can be viewed at
// https://<org>.github.io/<repo>/ without depending on Lovable's publish
// flow (useful when Lovable credits/tokens are exhausted).
//
// Uses only git + node — no new hosting account needed, since GitHub
// Pages just serves a branch of the repo we already push to.
//
// This does NOT touch the Lovable/Cloudflare deploy path: the
// DEPLOY_TARGET=github-pages env var only changes vite.config.ts's output
// when set, and is force-ignored inside Lovable's own build sandbox.

import { execFileSync, spawn } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const repoName = "blow-performance-influenciadores";
const basePath = `/${repoName}/`;
const port = 5299;

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { cwd: repoRoot, stdio: "inherit", ...opts });
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: repoRoot, encoding: "utf8", ...opts }).trim();
}

async function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not become ready in time`);
}

async function main() {
  console.log("→ Building static snapshot (DEPLOY_TARGET=github-pages)…");
  rmSync(join(repoRoot, ".output"), { recursive: true, force: true });
  run("npm", ["run", "build"], {
    env: { ...process.env, DEPLOY_TARGET: "github-pages" },
    shell: process.platform === "win32",
  });

  console.log("→ Starting the built server to capture rendered HTML…");
  const server = spawn(process.execPath, [join(repoRoot, ".output/server/index.mjs")], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });

  const siteDir = mkdtempSync(join(tmpdir(), "gh-pages-site-"));
  try {
    const base = `http://localhost:${port}${basePath}`;
    await waitForServer(base);

    const html = await (await fetch(base)).text();
    writeFileSync(join(siteDir, "index.html"), html);
    writeFileSync(join(siteDir, "404.html"), html);
    writeFileSync(join(siteDir, ".nojekyll"), "");

    cpSync(join(repoRoot, ".output/public"), siteDir, { recursive: true });

    console.log("→ Publishing to the gh-pages branch…");
    publishToGhPages(siteDir);
  } finally {
    server.kill();
    rmSync(siteDir, { recursive: true, force: true });
  }

  console.log(
    `\nDone. Once GitHub Pages picks it up, the app is served at:\nhttps://<org>.github.io/${repoName}/\n`,
  );
}

function publishToGhPages(siteDir) {
  const worktreeDir = mkdtempSync(join(tmpdir(), "gh-pages-worktree-"));
  rmSync(worktreeDir, { recursive: true, force: true }); // git worktree add needs the path to not exist
  try {
    const branchExists =
      sh("git", ["branch", "--list", "gh-pages"], { stdio: ["ignore", "pipe", "ignore"] }).length > 0;
    const remoteBranchExists =
      sh("git", ["ls-remote", "--heads", "origin", "gh-pages"], {
        stdio: ["ignore", "pipe", "ignore"],
      }).length > 0;

    if (branchExists) {
      run("git", ["worktree", "add", worktreeDir, "gh-pages"]);
    } else if (remoteBranchExists) {
      run("git", ["worktree", "add", worktreeDir, "-b", "gh-pages", "origin/gh-pages"]);
    } else {
      mkdirSync(worktreeDir, { recursive: true });
      run("git", ["worktree", "add", "--detach", worktreeDir]);
      run("git", ["checkout", "--orphan", "gh-pages"], { cwd: worktreeDir });
      run("git", ["rm", "-rf", "--quiet", "."], { cwd: worktreeDir });
    }

    // clear anything tracked from a previous publish, then drop in the fresh build
    for (const entry of sh("git", ["ls-files"], { cwd: worktreeDir }).split("\n").filter(Boolean)) {
      rmSync(join(worktreeDir, entry), { force: true });
    }
    cpSync(siteDir, worktreeDir, { recursive: true });

    run("git", ["add", "-A"], { cwd: worktreeDir });
    const hasChanges =
      sh("git", ["status", "--porcelain"], { cwd: worktreeDir }).length > 0;
    if (!hasChanges) {
      console.log("  (no changes since last publish)");
      return;
    }
    run(
      "git",
      ["commit", "-m", `Publish static build (${new Date().toISOString()})`],
      { cwd: worktreeDir },
    );
    run("git", ["push", "origin", "gh-pages"], { cwd: worktreeDir });
  } finally {
    run("git", ["worktree", "remove", "--force", worktreeDir]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
