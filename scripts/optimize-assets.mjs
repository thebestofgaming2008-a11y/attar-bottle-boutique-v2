import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const assetDirectory = path.resolve("src/assets");
const sourcePattern = /^(scene-|sku-|spin-).+\.(?:jpe?g|png)$/i;
const files = (await readdir(assetDirectory)).filter((file) => sourcePattern.test(file));

let inputBytes = 0;
let outputBytes = 0;
for (const file of files) {
  const input = path.join(assetDirectory, file);
  const output = path.join(assetDirectory, file.replace(/\.(?:jpe?g|png)$/i, ".webp"));
  await sharp(input).rotate().webp({ quality: 86, smartSubsample: true, effort: 6 }).toFile(output);
  inputBytes += (await stat(input)).size;
  outputBytes += (await stat(output)).size;
}

const savedPercent = inputBytes ? Math.round((1 - outputBytes / inputBytes) * 100) : 0;
console.log(
  JSON.stringify({ files: files.length, inputBytes, outputBytes, savedPercent }, null, 2),
);
