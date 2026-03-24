// /src/services/health/healthPermissionKeys.ts

/**
 * App-level permission keys.
 * These remain stable even if native libraries evolve.
 */
export type HealthPermissionKey =
    | "sleep"
    | "workouts"
    | "heart-rate"
    | "steps"
    | "distance"
    | "active-energy";

export const DEFAULT_HEALTH_READ_PERMISSIONS: HealthPermissionKey[] = [
    "sleep",
    "workouts",
    "heart-rate",
    "steps",
    "distance",
    "active-energy",
];