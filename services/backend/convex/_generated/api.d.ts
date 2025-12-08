/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adhocGoal from "../adhocGoal.js";
import type * as appinfo from "../appinfo.js";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as auth_google from "../auth/google.js";
import type * as checklists from "../checklists.js";
import type * as cleanupTasks from "../cleanupTasks.js";
import type * as crypto from "../crypto.js";
import type * as dashboard from "../dashboard.js";
import type * as discussions from "../discussions.js";
import type * as domain from "../domain.js";
import type * as fireGoal from "../fireGoal.js";
import type * as goal from "../goal.js";
import type * as migration from "../migration.js";
import type * as pendingGoals from "../pendingGoals.js";
import type * as presentations from "../presentations.js";
import type * as serviceDesk from "../serviceDesk.js";
import type * as system_auth_google from "../system/auth/google.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adhocGoal: typeof adhocGoal;
  appinfo: typeof appinfo;
  attendance: typeof attendance;
  auth: typeof auth;
  "auth/google": typeof auth_google;
  checklists: typeof checklists;
  cleanupTasks: typeof cleanupTasks;
  crypto: typeof crypto;
  dashboard: typeof dashboard;
  discussions: typeof discussions;
  domain: typeof domain;
  fireGoal: typeof fireGoal;
  goal: typeof goal;
  migration: typeof migration;
  pendingGoals: typeof pendingGoals;
  presentations: typeof presentations;
  serviceDesk: typeof serviceDesk;
  "system/auth/google": typeof system_auth_google;
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
