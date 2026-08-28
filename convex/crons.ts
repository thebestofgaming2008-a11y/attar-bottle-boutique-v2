import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "release abandoned checkout reservations",
  { minutes: 5 },
  internal.orders.cleanupExpiredCheckoutIntents,
);
crons.interval(
  "recover captured Razorpay checkouts",
  { minutes: 5 },
  internal.orders.reconcileCapturedPayments,
);
crons.daily(
  "audit recent Razorpay payments",
  { hourUTC: 1, minuteUTC: 40 },
  internal.orders.auditRecentRazorpayPayments,
);
crons.daily(
  "remove expired payment technical records",
  { hourUTC: 2, minuteUTC: 20 },
  internal.orders.cleanupPaymentTechnicalRecords,
);

export default crons;
