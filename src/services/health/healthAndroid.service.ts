// src/services/health/healthAndroid.service.ts

import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedSleep,
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
} from "@/src/types/health/health.types";
import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";

/**
 * Android Health Connect bridge contract.
 * The concrete implementation is registered once and reused by the facade.
 */
export type HealthAndroidPermissionsRequest = {
    permissions: HealthPermissionKey[];
};

export type HealthAndroidReadSleepInput = {
    date: ISODate;
};

export type HealthAndroidReadWorkoutsInput = {
    date: ISODate;
};

export type HealthAndroidReadMetricsRangeInput = {
    from: ISODateTime;
    to: ISODateTime;
};

export interface HealthAndroidAdapter {
    isAvailable(): Promise<boolean>;

    requestPermissions(input: HealthAndroidPermissionsRequest): Promise<HealthPermissionsStatus>;

    readSleepByDate(input: HealthAndroidReadSleepInput): Promise<HealthImportedSleep | null>;

    readWorkoutsByDate(
        input: HealthAndroidReadWorkoutsInput
    ): Promise<HealthImportedWorkoutSessionMinimal[]>;

    readMetricsByRange(
        input: HealthAndroidReadMetricsRangeInput
    ): Promise<HealthImportedWorkoutMetrics | null>;
}

let adapter: HealthAndroidAdapter | null = null;

/**
 * Register the concrete native Health Connect adapter at app bootstrap.
 */
export function registerHealthAndroidAdapter(nextAdapter: HealthAndroidAdapter): void {
    adapter = nextAdapter;
}

/**
 * Optional utility for tests / dev bootstrap resets.
 */
export function resetHealthAndroidAdapter(): void {
    adapter = null;
}

function getAdapter(): HealthAndroidAdapter {
    if (!adapter) {
        throw new Error(
            "HealthAndroid adapter is not registered. Register a Health Connect bridge before calling healthAndroid service."
        );
    }

    return adapter;
}

export function hasHealthAndroidAdapter(): boolean {
    return adapter !== null;
}

export async function isHealthAndroidAvailable(): Promise<boolean> {
    if (!adapter) return false;
    return adapter.isAvailable();
}

export async function requestHealthAndroidPermissions(
    input: HealthAndroidPermissionsRequest
): Promise<HealthPermissionsStatus> {
    return getAdapter().requestPermissions(input);
}

export async function readHealthAndroidSleepByDate(
    input: HealthAndroidReadSleepInput
): Promise<HealthImportedSleep | null> {
    return getAdapter().readSleepByDate(input);
}

export async function readHealthAndroidWorkoutsByDate(
    input: HealthAndroidReadWorkoutsInput
): Promise<HealthImportedWorkoutSessionMinimal[]> {
    return getAdapter().readWorkoutsByDate(input);
}

export async function readHealthAndroidMetricsByRange(
    input: HealthAndroidReadMetricsRangeInput
): Promise<HealthImportedWorkoutMetrics | null> {
    return getAdapter().readMetricsByRange(input);
}