// /src/services/health/healthBridge.types.ts

import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedSleep,
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
} from "@/src/types/health/health.types";
import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";

/**
 * Supported native health platforms.
 */
export type NativeHealthPlatform = "ios" | "android";

/**
 * Generic permission request used by bridge adapters.
 */
export type NativeHealthPermissionsRequest = {
    permissions: HealthPermissionKey[];
};

/**
 * Read sleep by a single canonical app day (YYYY-MM-DD).
 */
export type NativeHealthReadSleepByDateInput = {
    date: ISODate;
};

/**
 * Read workouts by a single canonical app day (YYYY-MM-DD).
 */
export type NativeHealthReadWorkoutsByDateInput = {
    date: ISODate;
};

/**
 * Read aggregate metrics by explicit ISO datetime range.
 */
export type NativeHealthReadMetricsByRangeInput = {
    from: ISODateTime;
    to: ISODateTime;
};

/**
 * Unified bridge contract that each platform adapter must satisfy.
 * This is the native-facing contract already normalized to the app-neutral health types.
 */
export interface NativeHealthBridge {
    readonly platform: NativeHealthPlatform;

    isAvailable(): Promise<boolean>;

    requestPermissions(
        input: NativeHealthPermissionsRequest
    ): Promise<HealthPermissionsStatus>;

    readSleepByDate(
        input: NativeHealthReadSleepByDateInput
    ): Promise<HealthImportedSleep | null>;

    readWorkoutsByDate(
        input: NativeHealthReadWorkoutsByDateInput
    ): Promise<HealthImportedWorkoutSessionMinimal[]>;

    readMetricsByRange(
        input: NativeHealthReadMetricsByRangeInput
    ): Promise<HealthImportedWorkoutMetrics | null>;
}