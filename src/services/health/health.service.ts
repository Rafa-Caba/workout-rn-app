// src/services/health/health.service.ts

import { Platform } from "react-native";

import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedSleep,
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
    HealthProvider,
} from "@/src/types/health/health.types";
import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";

import {
    isHealthAndroidAvailable,
    readHealthAndroidMetricsByRange,
    readHealthAndroidSleepByDate,
    readHealthAndroidWorkoutsByDate,
    requestHealthAndroidPermissions,
} from "@/src/services/health/healthAndroid.service";
import {
    isHealthIOSAvailable,
    readHealthIOSMetricsByRange,
    readHealthIOSSleepByDate,
    readHealthIOSWorkoutsByDate,
    requestHealthIOSPermissions,
} from "@/src/services/health/healthIOS.service";

/**
 * Facade input types
 */
export type HealthPermissionsRequest = {
    permissions: HealthPermissionKey[];
};

export type HealthReadSleepInput = {
    date: ISODate;
};

export type HealthReadWorkoutsInput = {
    date: ISODate;
};

export type HealthReadMetricsRangeInput = {
    from: ISODateTime;
    to: ISODateTime;
};

function isIOS(): boolean {
    return Platform.OS === "ios";
}

function isAndroid(): boolean {
    return Platform.OS === "android";
}

function getCurrentProvider(): HealthProvider | null {
    if (isIOS()) return "healthkit";
    if (isAndroid()) return "health-connect";
    return null;
}

function buildUnavailablePermissionsStatus(): HealthPermissionsStatus {
    return {
        provider: getCurrentProvider() ?? "healthkit",
        available: false,
        permissions: {},
        checkedAt: new Date().toISOString(),
    };
}

function throwUnsupportedPlatform(): never {
    throw new Error("Health service is only supported on iOS and Android.");
}

export async function isHealthAvailable(): Promise<boolean> {
    if (isIOS()) {
        return isHealthIOSAvailable();
    }

    if (isAndroid()) {
        return isHealthAndroidAvailable();
    }

    return false;
}

export async function getHealthProvider(): Promise<HealthProvider | null> {
    return getCurrentProvider();
}

/**
 * Unique platform facade:
 * - detects platform
 * - delegates to iOS or Android implementation
 */
export async function requestHealthPermissions(
    input: HealthPermissionsRequest
): Promise<HealthPermissionsStatus> {
    if (isIOS()) {
        return requestHealthIOSPermissions(input);
    }

    if (isAndroid()) {
        return requestHealthAndroidPermissions(input);
    }

    return buildUnavailablePermissionsStatus();
}

export async function readHealthSleepByDate(
    input: HealthReadSleepInput
): Promise<HealthImportedSleep | null> {
    if (isIOS()) {
        return readHealthIOSSleepByDate(input);
    }

    if (isAndroid()) {
        return readHealthAndroidSleepByDate(input);
    }

    return null;
}

export async function readHealthWorkoutsByDate(
    input: HealthReadWorkoutsInput
): Promise<HealthImportedWorkoutSessionMinimal[]> {
    if (isIOS()) {
        return readHealthIOSWorkoutsByDate(input);
    }

    if (isAndroid()) {
        return readHealthAndroidWorkoutsByDate(input);
    }

    return [];
}

export async function readHealthMetricsByRange(
    input: HealthReadMetricsRangeInput
): Promise<HealthImportedWorkoutMetrics | null> {
    if (isIOS()) {
        return readHealthIOSMetricsByRange(input);
    }

    if (isAndroid()) {
        return readHealthAndroidMetricsByRange(input);
    }

    return null;
}

/**
 * Convenience helper for day bootstrap:
 * returns both sleep and imported workouts for the same date.
 */
export async function readHealthDayBundleByDate(input: {
    date: ISODate;
}): Promise<{
    provider: HealthProvider | null;
    sleep: HealthImportedSleep | null;
    workouts: HealthImportedWorkoutSessionMinimal[];
}> {
    const provider = getCurrentProvider();

    const [sleep, workouts] = await Promise.all([
        readHealthSleepByDate({ date: input.date }),
        readHealthWorkoutsByDate({ date: input.date }),
    ]);

    return {
        provider,
        sleep,
        workouts,
    };
}

/**
 * Useful strict helper when a caller explicitly expects native mobile only.
 */
export function assertHealthSupportedPlatform(): void {
    if (isIOS() || isAndroid()) return;
    throwUnsupportedPlatform();
}