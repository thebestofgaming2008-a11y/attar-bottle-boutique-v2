// Keep three browser-asset generations so an open tab or delayed crawler can
// still load the hashed modules referenced by a previous HTML response.
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function retainReleaseAssets(projectRoot) {
  const root = path.resolve(projectRoot);
  const assets = path.join(root, ".output", "public", "assets");
  const history = path.join(root, ".release-assets");
  const files = (await readdir(assets, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  if (!files.length) throw new Error("No built browser assets; refusing to change release history");
  const id = createHash("sha256").update(files.join("\n")).digest("hex").slice(0, 32);
  const snapshot = path.join(history, id);
  await mkdir(snapshot, { recursive: true });
  await Promise.all(
    files.map((name) => copyFile(path.join(assets, name), path.join(snapshot, name))),
  );
  let previous = [];
  try {
    previous = JSON.parse(await readFile(path.join(history, "releases.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!Array.isArray(previous) || previous.some((entry) => !/^[a-f0-9]{32}$/.test(entry))) {
    throw new Error("Invalid asset history; refusing to touch cached releases");
  }
  const releases = [id, ...previous.filter((entry) => entry !== id)].slice(0, 3);
  const currentNames = new Set(files);
  let retained = 0;
  for (const release of releases.slice(1)) {
    const directory = path.join(history, release);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isFile() || currentNames.has(entry.name)) continue;
      await copyFile(path.join(directory, entry.name), path.join(assets, entry.name));
      currentNames.add(entry.name);
      retained++;
    }
  }
  await writeFile(path.join(history, "releases.json"), JSON.stringify(releases));
  for (const release of previous.filter((entry) => !releases.includes(entry))) {
    // Only our validated, content-addressed build-cache subdirectories can be pruned.
    const target = path.resolve(history, release);
    if (path.dirname(target) !== history || !/^[a-f0-9]{32}$/.test(path.basename(target))) {
      throw new Error("Unsafe asset-cache cleanup path");
    }
    await rm(target, { recursive: true, force: true });
  }
  return { currentAssets: files.length, retainedAssets: retained, releases: releases.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await retainReleaseAssets(process.cwd())));
}
