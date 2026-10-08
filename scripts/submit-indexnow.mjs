const origin = new URL(process.argv[2] || "https://houseofbadr.com").origin;
const key = "6f84c29b8d7e4a3fa1652cb907e1d438";
const keyLocation = `${origin}/${key}.txt`;

const sitemapResponse = await fetch(`${origin}/sitemap.xml`, {
  signal: AbortSignal.timeout(20_000),
});
if (!sitemapResponse.ok) {
  throw new Error(`Cannot read sitemap: HTTP ${sitemapResponse.status}`);
}

const sitemap = await sitemapResponse.text();
const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
  .map((match) => match[1])
  .filter((url) => new URL(url).origin === origin);

if (!urlList.length) throw new Error("Sitemap contains no canonical URLs");

const keyResponse = await fetch(keyLocation, { signal: AbortSignal.timeout(20_000) });
if (!keyResponse.ok || (await keyResponse.text()).trim() !== key) {
  throw new Error("IndexNow key file is not publicly available");
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(origin).host, key, keyLocation, urlList }),
  signal: AbortSignal.timeout(20_000),
});

if (![200, 202].includes(response.status)) {
  throw new Error(
    `IndexNow rejected the URL set: HTTP ${response.status} ${await response.text()}`,
  );
}

console.log(`Submitted ${urlList.length} canonical URLs to IndexNow (HTTP ${response.status}).`);
