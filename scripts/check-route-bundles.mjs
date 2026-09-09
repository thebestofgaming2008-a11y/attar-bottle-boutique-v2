import { readdir, readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";

// Run after the production build. Exporting Admin from its route accidentally
// bypasses TanStack's lazy splitting and ships dashboard/chart code to shoppers.
const assets = new URL("../.output/public/assets/", import.meta.url);
const ssrHelpers = await readFile(
  new URL("../.output/server/_ssr/ssr-helpers.mjs", import.meta.url),
  "utf8",
);
assert(!/^import\s/m.test(ssrHelpers), "SSR helpers must not import the server they initialize.");
const names = await readdir(assets);
const admin = names.find((name) => /^admin-.*\.js$/.test(name));
assert(admin, "Admin must have its own lazy-loaded production chunk.");
const entries = names.filter((name) => /^index-.*\.js$/.test(name));
assert(entries.length > 0, "Production entry not found. Run npm run build first.");
for (const name of entries) {
  const content = await readFile(new URL(name, assets), "utf8");
  assert(!content.includes("Admin workspace"), "Admin UI leaked into the initial entry.");
  const { size } = await stat(new URL(name, assets));
  assert(size < 450_000, `Initial entry exceeded the 450 KB uncompressed budget: ${size}`);
  console.log(`PASS ${name}: ${size} bytes; admin code is separate (${admin}).`);
}
