const INDEXNOW_KEY = "61fbb4ef675648bc9241202d677ee755";

export async function notifySearchEngines(paths: string[]) {
  if (typeof window === "undefined" || !paths.length) return;
  const urls = Array.from(
    new Set(paths.map((path) => new URL(path, window.location.origin).toString())),
  );
  await Promise.allSettled(
    urls.map((url) =>
      fetch(`https://www.bing.com/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`, {
        mode: "no-cors",
        keepalive: true,
      }),
    ),
  );
}
