/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addresses from "../addresses.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib from "../lib.js";
import type * as media from "../media.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as shipping from "../shipping.js";
import type * as users from "../users.js";
import type * as wishlists from "../wishlists.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addresses: typeof addresses;
  admin: typeof admin;
  auth: typeof auth;
  crons: typeof crons;
  http: typeof http;
  lib: typeof lib;
  media: typeof media;
  orders: typeof orders;
  products: typeof products;
  reviews: typeof reviews;
  seed: typeof seed;
  shipping: typeof shipping;
  users: typeof users;
  wishlists: typeof wishlists;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
