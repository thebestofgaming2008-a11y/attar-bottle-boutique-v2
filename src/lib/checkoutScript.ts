// A failed preload must not leave future checkout attempts waiting for an event
// that has already fired. Share in-flight loads and allow a clean retry on failure.
const pending = new Map<string, Promise<void>>();

export function loadCheckoutScript(
  source: string,
  ready: () => boolean,
  errorMessage: string,
  timeoutMs = 15000,
) {
  if (ready()) return Promise.resolve();
  const loading = pending.get(source);
  if (loading) return loading;
  const request = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${source}"]`);
    const script = existing || document.createElement("script");
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      if (error) {
        script.remove();
        reject(error);
      } else resolve();
    };
    const onLoad = () => finish(ready() ? undefined : new Error(errorMessage));
    const onError = () => finish(new Error(errorMessage));
    const timeout = setTimeout(
      () => finish(ready() ? undefined : new Error(errorMessage)),
      timeoutMs,
    );
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = source;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  pending.set(source, request);
  void request.then(
    () => pending.delete(source),
    () => pending.delete(source),
  );
  return request;
}
