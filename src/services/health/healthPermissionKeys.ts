// /src/services/health/healthPermissionKeys.ts

/**
 * App-level permission keys.
 * These remain stable even if native libraries evolve.
 *
 * IMPORTANT:
 * We intentionally do NOT add a synthetic "outdoor" permission key here,
 * because native providers still grant access through the underlying
 * concrete data domains:
 * - workouts
 * - heart-rate
 * - steps
 * - distance
 * - active-energy
 *
 * Instead, outdoor flows should request the grouped helper array
 * OUTDOOR_HEALTH_READ_PERMISSIONS.
 */
export type HealthPermissionKey =
    | "sleep"
    | "workouts"
    | "heart-rate"
    | "steps"
    | "distance"
    | "active-energy";

/**
 * Full default read scope currently used by the app.
 */
export const DEFAULT_HEALTH_READ_PERMISSIONS: HealthPermissionKey[] = [
    "sleep",
    "workouts",
    "heart-rate",
    "steps",
    "distance",
    "active-energy",
];

/**
 * Minimal permission group for outdoor walking/running flows.
 *
 * Why these:
 * - workouts: required to read the session itself
 * - heart-rate: enrich avg/max HR
 * - steps: session/day step support
 * - distance: distance-based walking/running metrics
 * - active-energy: active calories
 *
 * Route/location is intentionally NOT represented here because current
 * bridges do not expose route reads yet, and route permissions differ
 * by provider/native implementation.
 */
export const OUTDOOR_HEALTH_READ_PERMISSIONS: HealthPermissionKey[] = [
    "workouts",
    "heart-rate",
    "steps",
    "distance",
    "active-energy",
];

/**
 * Focused permission group for sleep-only flows.
 */
export const SLEEP_HEALTH_READ_PERMISSIONS: HealthPermissionKey[] = ["sleep"];

/**
 * Focused permission group for generic workout import flows
 * that do not necessarily need sleep.
 */
export const WORKOUT_HEALTH_READ_PERMISSIONS: HealthPermissionKey[] = [
    "workouts",
    "heart-rate",
    "steps",
    "distance",
    "active-energy",
];