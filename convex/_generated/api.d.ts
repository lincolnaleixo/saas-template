/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as invitations from "../invitations.js";
import type * as organizationCleanup from "../organizationCleanup.js";
import type * as permissions from "../permissions.js";
import type * as profile from "../profile.js";
import type * as settings from "../settings.js";
import type * as subscriptions from "../subscriptions.js";
import type * as waitlist from "../waitlist.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  invitations: typeof invitations;
  organizationCleanup: typeof organizationCleanup;
  permissions: typeof permissions;
  profile: typeof profile;
  settings: typeof settings;
  subscriptions: typeof subscriptions;
  waitlist: typeof waitlist;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
