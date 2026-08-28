import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env["VITE_CONVEX_URL"];

if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL. Add it to .env.local to enable Convex.");
}

export const convex = new ConvexReactClient(convexUrl);
