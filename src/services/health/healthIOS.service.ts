// src/services/health/healthIOS.service.ts

import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedSleep,
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
} from "@/src/types/health/health.types";
import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";

/**
 * iOS HealthKit bridge contract.
 * The native layer can be registered later without changing the rest of the app.
 */
export type HealthIOSPermissionsRequest = {
    permissions: HealthPermissionKey[];
};

export type HealthIOSReadSleepInput = {
    date: ISODate;
};

export type HealthIOSReadWorkoutsInput = {
    date: ISODate;
};

export type HealthIOSReadMetricsRangeInput = {
    from: ISODateTime;
    to: ISODateTime;
};

export interface HealthIOSAdapter {
    isAvailable(): Promise<boolean>;

    requestPermissions(input: HealthIOSPermissionsRequest): Promise<HealthPermissionsStatus>;

    readSleepByDate(input: HealthIOSReadSleepInput): Promise<HealthImportedSleep | null>;

    readWorkoutsByDate(
        input: HealthIOSReadWorkoutsInput
    ): Promise<HealthImportedWorkoutSessionMinimal[]>;

    readMetricsByRange(
        input: HealthIOSReadMetricsRangeInput
    ): Promise<HealthImportedWorkoutMetrics | null>;
}

let adapter: HealthIOSAdapter | null = null;

/**
 * Register the concrete native HealthKit adapter at app bootstrap.
 */
export function registerHealthIOSAdapter(nextAdapter: HealthIOSAdapter): void {
    adapter = nextAdapter;
}

/**
 * Optional utility for tests / dev bootstrap resets.
 */
export function resetHealthIOSAdapter(): void {
    adapter = null;
}

function getAdapter(): HealthIOSAdapter {
    if (!adapter) {
        throw new Error(
            "HealthIOS adapter is not registered. Register a HealthKit bridge before calling healthIOS service."
        );
    }

    return adapter;
}

export function hasHealthIOSAdapter(): boolean {
    return adapter !== null;
}

export async function isHealthIOSAvailable(): Promise<boolean> {
    if (!adapter) return false;
    return adapter.isAvailable();
}

export async function requestHealthIOSPermissions(
    input: HealthIOSPermissionsRequest
): Promise<HealthPermissionsStatus> {
    return getAdapter().requestPermissions(input);
}

export async function readHealthIOSSleepByDate(
    input: HealthIOSReadSleepInput
): Promise<HealthImportedSleep | null> {
    return getAdapter().readSleepByDate(input);
}

export async function readHealthIOSWorkoutsByDate(
    input: HealthIOSReadWorkoutsInput
): Promise<HealthImportedWorkoutSessionMinimal[]> {
    return getAdapter().readWorkoutsByDate(input);
}

export async function readHealthIOSMetricsByRange(
    input: HealthIOSReadMetricsRangeInput
): Promise<HealthImportedWorkoutMetrics | null> {
    return getAdapter().readMetricsByRange(input);
}