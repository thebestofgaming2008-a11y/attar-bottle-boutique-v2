import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { retainReleaseAssets } from "./retain-release-assets.mjs";

test("a deployment keeps two previous generations without replacing current modules", async () => {
  const root = await mkdtemp(path.join(process.cwd(), ".release-assets-test-"));
  const assets = path.join(root, ".output", "public", "assets");
  try {
    for (let version = 1; version <= 4; version++) {
      await rm(assets, { recursive: true, force: true });
      await mkdir(assets, { recursive: true });
      await writeFile(path.join(assets, `route-v${version}.js`), `release ${version}`);
      await writeFile(path.join(assets, "shared-hash.js"), "unchanged");
      const result = await retainReleaseAssets(root);
      assert.equal(result.releases, Math.min(version, 3));
      assert.equal(
        await readFile(path.join(assets, `route-v${version}.js`), "utf8"),
        `release ${version}`,
      );
      if (version > 1) {
        assert.equal(
          await readFile(path.join(assets, `route-v${version - 1}.js`), "utf8"),
          `release ${version - 1}`,
        );
      }
    }
    await assert.rejects(readFile(path.join(assets, "route-v1.js")), { code: "ENOENT" });
    assert.equal(await readFile(path.join(assets, "route-v2.js"), "utf8"), "release 2");
  } finally {
    // The exact temporary directory was created above in this project's workspace.
    if (
      path.dirname(root) === process.cwd() &&
      path.basename(root).startsWith(".release-assets-test-")
    ) {
      await rm(root, { recursive: true, force: true });
    }
  }
});
