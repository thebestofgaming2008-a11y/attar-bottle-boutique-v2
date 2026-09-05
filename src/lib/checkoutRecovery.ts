export const PAYMENT_RECOVERY_KEY = "badr_pending_payment_v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingPayment = {
  orderId: string;
  attemptId: string;
  email: string;
  cartFingerprint: string;
  createdAt: number;
};

export function cartFingerprint(lines: { id: string; qty: number }[]) {
  return JSON.stringify(lines.map(({ id, qty }) => [id, qty]).sort());
}

export function readPendingPayment(
  storage: Pick<Storage, "getItem">,
  now = Date.now(),
): PendingPayment | null {
  try {
    const value = JSON.parse(storage.getItem(PAYMENT_RECOVERY_KEY) || "null");
    if (
      !value ||
      !/^order_[A-Za-z0-9]+$/.test(value.orderId) ||
      !/^[a-f0-9-]{20,80}$/i.test(value.attemptId) ||
      typeof value.email !== "string" ||
      typeof value.cartFingerprint !== "string" ||
      !Number.isFinite(value.createdAt) ||
      value.createdAt > now ||
      now - value.createdAt > MAX_AGE_MS
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
