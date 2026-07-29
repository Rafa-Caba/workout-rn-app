// src/services/health/healthBridge.types.ts
// Shared strongly typed contract implemented by the iOS HealthKit and Android
// Health Connect bridges.

import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedSleep,
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutRoute,
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
} from "@/src/types/health/cardio/health.types";
import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";

/** Supported native health platforms. */
export type NativeHealthPlatform = "ios" | "android";

/** Generic permission request used by bridge adapters. */
export type NativeHealthPermissionsRequest = {
    permissions: HealthPermissionKey[];
};

/** Reads sleep by one canonical app day in YYYY-MM-DD format. */
export type NativeHealthReadSleepByDateInput = {
    date: ISODate;
};

/** Reads workouts by one canonical app day in YYYY-MM-DD format. */
export type NativeHealthReadWorkoutsByDateInput = {
    date: ISODate;
};

/** Reads the native route associated with one workout identifier. */
export type NativeHealthReadWorkoutRouteByIdInput = {
    externalId: string;
};

/** Reads aggregate metrics by an explicit ISO datetime range. */
export type NativeHealthReadMetricsByRangeInput = {
    from: ISODateTime;
    to: ISODateTime;
};

/**
 * Native-facing contract already normalized to app-neutral health types.
 *
 * Android generally embeds an exercise route inside the exercise-session
 * record, while HealthKit requires a separate query by workout UUID. Both
 * bridges still expose the same method so callers do not fake platform safety.
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

    readWorkoutRouteById(
        input: NativeHealthReadWorkoutRouteByIdInput
    ): Promise<HealthImportedWorkoutRoute | null>;

    readMetricsByRange(
        input: NativeHealthReadMetricsByRangeInput
    ): Promise<HealthImportedWorkoutMetrics | null>;
}
