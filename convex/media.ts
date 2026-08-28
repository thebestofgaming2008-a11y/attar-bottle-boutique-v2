import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { isAdminEmail } from "./lib";

const MAX_PRODUCT_MEDIA_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export const assertCurrentUserIsAdmin = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any);
    const email = (user as any)?.email?.trim().toLowerCase();
    if (!user || !isAdminEmail(email)) throw new Error("Admin access required.");
    return true;
  },
});

export const createProductMediaUpload = action({
  args: {
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    productId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required.");
    await ctx.runQuery(internal.media.assertCurrentUserIsAdmin, { userId });

    if (!ALLOWED_TYPES.has(args.contentType))
      throw new Error("Only product images and MP4/WebM videos can be uploaded.");
    if (!Number.isFinite(args.size) || args.size <= 0 || args.size > MAX_PRODUCT_MEDIA_BYTES) {
      throw new Error("Product media must be 25 MB or smaller.");
    }

    const siteUrl = (
      process.env.PUBLIC_SITE_URL ||
      "https://badr-boutique-studio-v2.thebestofgaming2008.workers.dev"
    ).replace(/\/+$/, "");
    return {
      uploadUrl: `${siteUrl}/api/media/upload`,
      method: "POST",
      publicUrl: null,
      headers: {
        "Content-Type": args.contentType,
        "x-file-name": args.fileName || "product-media",
        "x-admin-upload-token": env("ADMIN_UPLOAD_TOKEN"),
      },
    };
  },
});
