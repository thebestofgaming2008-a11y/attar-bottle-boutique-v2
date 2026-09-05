// Stop a disconnected browser from spinning forever. This does not cancel a
// server-side payment operation; callers must retain the checkout attempt ID.
export function checkoutDeadline<T>(
  operation: Promise<T>,
  message: string,
  timeoutMs = 45000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    operation.then(
      (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
