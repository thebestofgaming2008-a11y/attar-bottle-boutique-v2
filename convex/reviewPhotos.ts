import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export function decodeReviewPhoto(encoded: string): Uint8Array {
  if (!encoded || encoded.length > 700_000)
    throw new Error("Review photos must be smaller than 500 KB after compression.");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  } catch {
    throw new Error("Invalid photo data.");
  }
  if (
    bytes.length < 20 ||
    bytes.length > 500_000 ||
    String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
    String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
  ) {
    throw new Error("Upload a valid compressed WebP photo.");
  }
  return bytes;
}

export const upload = action({
  args: {
    reviewId: v.id("reviews"),
    data: v.string(),
    orderNumber: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, { data, ...proof }) => {
    const bytes = decodeReviewPhoto(data);
    const token = process.env.ADMIN_UPLOAD_TOKEN;
    const site = process.env.PUBLIC_SITE_URL || process.env.SITE_URL;
    if (!token || !site || !site.startsWith("https://"))
      throw new Error(
        "Photo uploads are temporarily unavailable. Your written review can still be submitted.",
      );
    await ctx.runMutation(internal.reviews.reservePhotoUpload, proof);
    const response = await fetch(`${site.replace(/\/+$/, "")}/api/media/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(bytes.byteLength),
        "x-file-name": "customer-review.webp",
        "x-admin-upload-token": token,
      },
      body: bytes as BodyInit,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok)
      throw new Error("Photo upload failed. Your written review is saved; please retry the photo.");
    const result = (await response.json()) as { url?: string };
    if (!result.url?.startsWith("https://"))
      throw new Error("Photo upload did not return a valid URL.");
    await ctx.runMutation(internal.reviews.attachPhoto, {
      reviewId: proof.reviewId,
      url: result.url,
    });
    return result.url;
  },
});
