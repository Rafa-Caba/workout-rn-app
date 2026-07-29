// /src/services/health/bridge/healthIOS.bridge.ts

import AppleHealthKit, {
    type HealthInputOptions,
    type HealthKitPermissions,
    type HealthPermission,
} from "react-native-health";

import { extractImportedWorkoutRoute } from "@/src/services/health/bridge/healthRoute.mapper";
import {
    appendHealthDiagnosticEvent,
    createHealthDiagnosticId,
} from "@/src/services/health/diagnostics/healthDiagnostics.service";
import type { NativeHealthBridge } from "@/src/services/health/healthBridge.types";
import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedSleep,
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutRoute,
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
} from "@/src/types/health/cardio/health.types";
import { buildLocalDayRangeISO } from "@/src/utils/dates/localDateTime";
import {
    buildHealthKitSleepQueryRange,
    normalizeHealthKitSleepSamples,
} from "@/src/utils/health/healthSleep.normalizer";
import { toHealthWorkoutDiagnosticSample } from "@/src/utils/health/healthWorkoutDiagnostics.mapper";

/**
 * Helpers
 */
const MILES_TO_KILOMETERS = 1.609344;

type HealthKitWorkoutQueryOptions = {
    startDate: string;
    endDate: string;
    type: "Workout";
};

type HealthKitWorkoutRouteQueryOptions = {
    id: string;
};

type HealthKitArrayQueryOptions = HealthInputOptions | HealthKitWorkoutQueryOptions;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function asNullableNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function toIsoNow(): string {
    return new Date().toISOString();
}

function buildDayRange(date: string): {
    targetDate: string;
    startDate: string;
    endDate: string;
    strategy: "local-calendar-day";
} {
    const range = buildLocalDayRangeISO(date);

    return {
        targetDate: date,
        startDate: range.startAt,
        endDate: range.endAtExclusive,
        strategy: "local-calendar-day",
    };
}

function buildRangeOptions(from: string, to: string): HealthInputOptions {
    return {
        startDate: from,
        endDate: to,
    };
}

function buildWorkoutRangeOptions(
    from: string,
    to: string
): HealthKitWorkoutQueryOptions {
    return {
        startDate: from,
        endDate: to,
        type: "Workout",
    };
}

/**
 * Resolves native methods at call time. react-native-health is patched with a
 * lazy Proxy for Bridgeless/New Architecture, so capturing methods during
 * module initialization can preserve an unavailable native reference.
 */
type NativeHealthKitMethod = {
    invoke: (...args: unknown[]) => unknown;
};

function getHealthKitMethod(name: string): NativeHealthKitMethod | null {
    const moduleValue: unknown = AppleHealthKit;
    if (!isRecord(moduleValue)) return null;

    const candidate = moduleValue[name];
    if (typeof candidate !== "function") return null;

    return {
        invoke: (...args: unknown[]) => Reflect.apply(candidate, moduleValue, args),
    };
}

function nativeErrorMessage(value: unknown): string | null {
    if (value === null || value === undefined || value === false || value === "") {
        return null;
    }

    if (value instanceof Error) return value.message;
    if (typeof value === "string") return value;

    if (isRecord(value)) {
        return asNonEmptyString(value.message) ?? asNonEmptyString(value.localizedDescription);
    }

    return String(value);
}

function getHKReadPermissions(keys: HealthPermissionKey[]): HealthPermission[] {
    const permissionsMap = AppleHealthKit.Constants?.Permissions ?? {};
    const read: HealthPermission[] = [];

    for (const key of keys) {
        if (key === "sleep" && permissionsMap.SleepAnalysis) {
            read.push(permissionsMap.SleepAnalysis);
        }

        if (key === "workouts") {
            if (permissionsMap.Workout) {
                read.push(permissionsMap.Workout);
            }

            // A workout route is a separate HealthKit series type. Requesting
            // it together with workouts lets getWorkoutRouteSamples read the
            // GPS locations already visible in Apple Fitness.
            if (permissionsMap.WorkoutRoute) {
                read.push(permissionsMap.WorkoutRoute);
            }
        }

        if (key === "heart-rate" && permissionsMap.HeartRate) {
            read.push(permissionsMap.HeartRate);
        }

        if (key === "steps" && permissionsMap.Steps) {
            read.push(permissionsMap.Steps);
        }

        if (key === "distance" && permissionsMap.DistanceWalkingRunning) {
            read.push(permissionsMap.DistanceWalkingRunning);
        }

        if (key === "active-energy") {
            if (permissionsMap.ActiveEnergyBurned) {
                read.push(permissionsMap.ActiveEnergyBurned);
            }

            if (permissionsMap.BasalEnergyBurned) {
                read.push(permissionsMap.BasalEnergyBurned);
            }
        }
    }

    return Array.from(new Set(read));
}

function mapPermissionsStatus(
    requested: HealthPermissionKey[],
    available: boolean
): HealthPermissionsStatus {
    const permissions: Record<string, "granted" | "unknown"> = {};

    for (const key of requested) {
        permissions[key] = available ? "granted" : "unknown";
    }

    return {
        provider: "healthkit",
        available,
        permissions,
        checkedAt: toIsoNow(),
    };
}

type HealthKitAvailabilityResult = {
    available: boolean;
    nativeFunctionAvailable: boolean;
    errorMessage: string | null;
};

function hkCheckAvailability(): Promise<HealthKitAvailabilityResult> {
    return new Promise((resolve) => {
        const method = getHealthKitMethod("isAvailable");

        if (!method) {
            resolve({
                available: false,
                nativeFunctionAvailable: false,
                errorMessage: "HealthKit native function isAvailable is unavailable.",
            });
            return;
        }

        method.invoke((error: unknown, available: unknown) => {
            const errorMessage = nativeErrorMessage(error);
            resolve({
                available: errorMessage === null && available === true,
                nativeFunctionAvailable: true,
                errorMessage,
            });
        });
    });
}

async function logAvailability(result: HealthKitAvailabilityResult): Promise<void> {
    await appendHealthDiagnosticEvent({
        id: createHealthDiagnosticId("availability"),
        createdAt: toIsoNow(),
        provider: "healthkit",
        level: result.available ? "info" : "warning",
        kind: "availability",
        available: result.available,
        nativeFunctionAvailable: result.nativeFunctionAvailable,
        errorMessage: result.errorMessage,
    });
}

type HealthKitInitializationResult = {
    completed: boolean;
    errorMessage: string | null;
};

function hkInitHealthKit(
    readPermissions: HealthPermission[]
): Promise<HealthKitInitializationResult> {
    return new Promise((resolve) => {
        const method = getHealthKitMethod("initHealthKit");

        if (!method) {
            resolve({
                completed: false,
                errorMessage: "HealthKit native function initHealthKit is unavailable.",
            });
            return;
        }

        const permissions: HealthKitPermissions = {
            permissions: {
                read: readPermissions,
                write: [],
            },
        };

        method.invoke(permissions, (error: unknown) => {
            const errorMessage = nativeErrorMessage(error);
            resolve({
                completed: errorMessage === null,
                errorMessage,
            });
        });
    });
}

type MissingArrayMethodBehavior = "reject" | "empty";

function hkGetArraySamples(
    methodName: string,
    options: HealthKitArrayQueryOptions,
    missingBehavior: MissingArrayMethodBehavior
): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
        const method = getHealthKitMethod(methodName);

        if (!method) {
            if (missingBehavior === "reject") {
                reject(new Error(`HealthKit native function ${methodName} is unavailable.`));
            } else {
                resolve([]);
            }
            return;
        }

        method.invoke(options, (error: unknown, results: unknown) => {
            const errorMessage = nativeErrorMessage(error);
            if (errorMessage) {
                reject(new Error(errorMessage));
                return;
            }

            resolve(Array.isArray(results) ? results : []);
        });
    });
}

function hkGetSleepSamples(options: HealthInputOptions): Promise<unknown[]> {
    return hkGetArraySamples("getSleepSamples", options, "reject");
}

function hkGetWorkoutSamples(options: HealthKitWorkoutQueryOptions): Promise<unknown[]> {
    return hkGetArraySamples("getSamples", options, "empty");
}

function isMissingWorkoutRouteError(message: string): boolean {
    const normalized = message.trim().toLowerCase();
    return (
        normalized.includes("does not have a route") ||
        normalized.includes("activity possibly does not have a route") ||
        normalized.includes("no workout route") ||
        normalized.includes("route not found")
    );
}

function hkGetWorkoutRouteSamples(
    options: HealthKitWorkoutRouteQueryOptions
): Promise<unknown | null> {
    return new Promise((resolve, reject) => {
        const method = getHealthKitMethod("getWorkoutRouteSamples");

        if (!method) {
            resolve(null);
            return;
        }

        method.invoke(options, (error: unknown, result: unknown) => {
            const errorMessage = nativeErrorMessage(error);
            if (errorMessage) {
                if (isMissingWorkoutRouteError(errorMessage)) {
                    resolve(null);
                    return;
                }

                reject(new Error(errorMessage));
                return;
            }

            resolve(result ?? null);
        });
    });
}

function hkGetHeartRateSamples(options: HealthInputOptions): Promise<unknown[]> {
    return hkGetArraySamples("getHeartRateSamples", options, "empty");
}

function hkGetDailyStepCountSamples(options: HealthInputOptions): Promise<unknown[]> {
    return hkGetArraySamples("getDailyStepCountSamples", options, "empty");
}

function hkGetDistanceWalkingRunning(options: HealthInputOptions): Promise<unknown | null> {
    return new Promise((resolve, reject) => {
        const method = getHealthKitMethod("getDistanceWalkingRunning");

        if (!method) {
            resolve(null);
            return;
        }

        method.invoke(options, (error: unknown, result: unknown) => {
            const errorMessage = nativeErrorMessage(error);
            if (errorMessage) {
                reject(new Error(errorMessage));
                return;
            }

            resolve(result ?? null);
        });
    });
}

function hkGetActiveEnergyBurned(options: HealthInputOptions): Promise<unknown[]> {
    return hkGetArraySamples("getActiveEnergyBurned", options, "empty");
}

function hkGetBasalEnergyBurned(options: HealthInputOptions): Promise<unknown[]> {
    return hkGetArraySamples("getBasalEnergyBurned", options, "empty");
}

function secondsBetween(startAt: string | null, endAt: string | null): number | null {
    if (!startAt || !endAt) return null;

    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return null;
    }

    return Math.round((endMs - startMs) / 1000);
}

function milesToKilometers(value: number | null): number | null {
    return value === null ? null : value * MILES_TO_KILOMETERS;
}

function extractWorkoutType(sample: Record<string, unknown>): string {
    return (
        asNonEmptyString(sample.activityName) ??
        asNonEmptyString(sample.workoutActivityType) ??
        asNonEmptyString(sample.type) ??
        "Workout"
    );
}

function mapWorkoutSample(sample: unknown): HealthImportedWorkoutSessionMinimal | null {
    if (!isRecord(sample)) return null;

    const startAt =
        asNonEmptyString(sample.start) ??
        asNonEmptyString(sample.startDate) ??
        null;

    const endAt =
        asNonEmptyString(sample.end) ??
        asNonEmptyString(sample.endDate) ??
        null;

    const durationSeconds =
        asNullableNumber(sample.duration) ??
        secondsBetween(startAt, endAt);

    const providerWorkoutType = extractWorkoutType(sample);
    const route = extractImportedWorkoutRoute(sample);
    const metadata = isRecord(sample.metadata) ? sample.metadata : null;

    return {
        externalId:
            asNonEmptyString(sample.id) ??
            asNonEmptyString(sample.uuid) ??
            null,
        type: providerWorkoutType,
        providerWorkoutType,
        cardioEnvironment: route ? "outdoor" : null,
        startAt,
        endAt,
        metrics: {
            durationSeconds,
            activeKcal:
                asNullableNumber(sample.calories) ??
                asNullableNumber(sample.activeEnergyBurned) ??
                asNullableNumber(sample.activeEnergy) ??
                asNullableNumber(sample.kcal) ??
                null,
            totalKcal:
                asNullableNumber(sample.totalCalories) ??
                asNullableNumber(sample.totalEnergyBurned) ??
                asNullableNumber(sample.totalKcal) ??
                null,
            totalKcalEstimated: false,
            avgHr: null,
            maxHr: null,
            distanceKm:
                asNullableNumber(sample.distanceKm) ??
                milesToKilometers(asNullableNumber(sample.distance)),
            steps: null,
            elevationGainM:
                asNullableNumber(sample.elevationAscended) ??
                asNullableNumber(sample.elevationGain) ??
                (metadata ? asNullableNumber(metadata.HKElevationAscended) : null),
            paceSecPerKm: null,
            cadenceRpm: null,
            effortRpe:
                asNullableNumber(sample.effortRpe) ??
                (metadata ? asNullableNumber(metadata.HKWorkoutEffortScore) : null),
        },
        route,
        notes: null,
        source: "healthkit",
        sourceDevice:
            asNonEmptyString(sample.sourceName) ??
            asNonEmptyString(sample.source) ??
            null,
        importedAt: toIsoNow(),
        lastSyncedAt: toIsoNow(),
        sessionKind: "device-import",
        raw: sample,
    };
}

function sumNumericFromUnknownArray(values: unknown[], keys: string[]): number | null {
    let total = 0;
    let found = false;

    for (const item of values) {
        if (!isRecord(item)) continue;

        for (const key of keys) {
            const value = asNullableNumber(item[key]);
            if (value !== null) {
                total += value;
                found = true;
                break;
            }
        }
    }

    return found ? total : null;
}

function avgNumericFromUnknownArray(values: unknown[], keys: string[]): number | null {
    let total = 0;
    let count = 0;

    for (const item of values) {
        if (!isRecord(item)) continue;

        for (const key of keys) {
            const value = asNullableNumber(item[key]);
            if (value !== null) {
                total += value;
                count += 1;
                break;
            }
        }
    }

    if (count === 0) return null;
    return Math.round(total / count);
}

function maxNumericFromUnknownArray(values: unknown[], keys: string[]): number | null {
    let max: number | null = null;

    for (const item of values) {
        if (!isRecord(item)) continue;

        for (const key of keys) {
            const value = asNullableNumber(item[key]);
            if (value !== null) {
                max = max === null ? value : Math.max(max, value);
                break;
            }
        }
    }

    return max;
}

function extractDistanceKm(value: unknown | null): number | null {
    if (!value || !isRecord(value)) return null;

    return (
        asNullableNumber(value.value) ??
        asNullableNumber(value.distance) ??
        asNullableNumber(value.distanceKm) ??
        null
    );
}

function extractEnergyKcal(values: unknown[]): number | null {
    return sumNumericFromUnknownArray(values, ["value", "kcal", "activeEnergyBurned", "activeEnergy"]);
}

export const healthIOSBridge: NativeHealthBridge = {
    platform: "ios",

    async isAvailable(): Promise<boolean> {
        const availability = await hkCheckAvailability();
        await logAvailability(availability);
        return availability.available;
    },

    async requestPermissions(input): Promise<HealthPermissionsStatus> {
        const availability = await hkCheckAvailability();
        await logAvailability(availability);

        if (!availability.available) {
            await appendHealthDiagnosticEvent({
                id: createHealthDiagnosticId("permissions"),
                createdAt: toIsoNow(),
                provider: "healthkit",
                level: "warning",
                kind: "permissions",
                requestedPermissions: [...input.permissions],
                nativeRequestCompleted: false,
                readAccessVerification: "unknown",
                errorMessage: "HealthKit is unavailable on this device or build.",
            });

            return mapPermissionsStatus(input.permissions, false);
        }

        const readPermissions = getHKReadPermissions(input.permissions);
        const initialization = await hkInitHealthKit(readPermissions);

        await appendHealthDiagnosticEvent({
            id: createHealthDiagnosticId("permissions"),
            createdAt: toIsoNow(),
            provider: "healthkit",
            level: initialization.completed ? "info" : "error",
            kind: "permissions",
            requestedPermissions: [...input.permissions],
            nativeRequestCompleted: initialization.completed,
            readAccessVerification: initialization.completed ? "requested-only" : "unknown",
            errorMessage: initialization.errorMessage,
        });

        return mapPermissionsStatus(input.permissions, initialization.completed);
    },

    async readSleepByDate(input): Promise<HealthImportedSleep | null> {
        const range = buildHealthKitSleepQueryRange(input.date);

        await appendHealthDiagnosticEvent({
            id: createHealthDiagnosticId("sleep-query"),
            createdAt: toIsoNow(),
            provider: "healthkit",
            level: "info",
            kind: "sleep-query-started",
            range,
        });

        try {
            const samples = await hkGetSleepSamples(
                buildRangeOptions(range.startDate, range.endDate)
            );
            const normalized = normalizeHealthKitSleepSamples(input.date, samples);

            await appendHealthDiagnosticEvent({
                id: createHealthDiagnosticId("sleep-query-result"),
                createdAt: toIsoNow(),
                provider: "healthkit",
                level: samples.length > 0 ? "info" : "warning",
                kind: "sleep-query-result",
                range,
                receivedSampleCount: samples.length,
                storedSampleCount: normalized.diagnostics.diagnosticSamples.length,
                samplesTruncated: normalized.diagnostics.diagnosticSamplesTruncated,
                samples: normalized.diagnostics.diagnosticSamples,
            });

            await appendHealthDiagnosticEvent({
                id: createHealthDiagnosticId("sleep-normalization"),
                createdAt: toIsoNow(),
                provider: "healthkit",
                level:
                    normalized.diagnostics.outcome === "normalized" ? "info" : "warning",
                kind: "sleep-normalization",
                targetDate: input.date,
                receivedSampleCount: normalized.diagnostics.receivedSampleCount,
                validSampleCount: normalized.diagnostics.validSampleCount,
                rejectedSampleCount: normalized.diagnostics.rejectedSampleCount,
                duplicateSampleCount: normalized.diagnostics.duplicateSampleCount,
                targetDateSampleCount: normalized.diagnostics.targetDateSampleCount,
                targetNightSampleCount: normalized.diagnostics.targetNightSampleCount,
                discardedTargetDateSampleCount:
                    normalized.diagnostics.discardedTargetDateSampleCount,
                availableNightKeys: normalized.diagnostics.availableNightKeys,
                nightSummaries: normalized.diagnostics.nightSummaries,
                unknownValues: normalized.diagnostics.unknownValues,
                selectedSourceKey: normalized.diagnostics.selectedSourceKey,
                sourceSummaries: normalized.diagnostics.sourceSummaries,
                totals: normalized.diagnostics.totals,
                outcome: normalized.diagnostics.outcome,
            });

            return normalized.sleep;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const codeMatch = /(?:code|error)\s*[:=]\s*([A-Z0-9_-]+)/i.exec(errorMessage);

            await appendHealthDiagnosticEvent({
                id: createHealthDiagnosticId("sleep-query-error"),
                createdAt: toIsoNow(),
                provider: "healthkit",
                level: "error",
                kind: "sleep-query-error",
                targetDate: input.date,
                range,
                errorMessage,
                nativeCode: codeMatch?.[1] ?? null,
            });

            throw error;
        }
    },

    async readWorkoutsByDate(input): Promise<HealthImportedWorkoutSessionMinimal[]> {
        const range = buildDayRange(input.date);

        await appendHealthDiagnosticEvent({
            id: createHealthDiagnosticId("workout-query"),
            createdAt: toIsoNow(),
            provider: "healthkit",
            level: "info",
            kind: "workout-query-started",
            range,
        });

        try {
            const samples = await hkGetWorkoutSamples(
                buildWorkoutRangeOptions(range.startDate, range.endDate)
            );
            const mapped: HealthImportedWorkoutSessionMinimal[] = [];

            for (const sample of samples) {
                const workout = mapWorkoutSample(sample);
                if (workout) {
                    mapped.push(workout);
                }
            }

            const diagnosticSamples = mapped
                .slice(0, 30)
                .map(toHealthWorkoutDiagnosticSample);

            await appendHealthDiagnosticEvent({
                id: createHealthDiagnosticId("workout-query-result"),
                createdAt: toIsoNow(),
                provider: "healthkit",
                level: samples.length > 0 ? "info" : "warning",
                kind: "workout-query-result",
                range,
                receivedSampleCount: samples.length,
                mappedSampleCount: mapped.length,
                rejectedSampleCount: Math.max(0, samples.length - mapped.length),
                storedSampleCount: diagnosticSamples.length,
                samplesTruncated: mapped.length > diagnosticSamples.length,
                samples: diagnosticSamples,
            });


            return mapped;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const codeMatch = /(?:code|error)\s*[:=]\s*([A-Z0-9_-]+)/i.exec(errorMessage);

            await appendHealthDiagnosticEvent({
                id: createHealthDiagnosticId("workout-query-error"),
                createdAt: toIsoNow(),
                provider: "healthkit",
                level: "error",
                kind: "workout-query-error",
                targetDate: input.date,
                range,
                errorMessage,
                nativeCode: codeMatch?.[1] ?? null,
            });

            throw error;
        }
    },

    async readWorkoutRouteById(input): Promise<HealthImportedWorkoutRoute | null> {
        const externalId = input.externalId.trim();
        if (!externalId) {
            return null;
        }

        const rawRoute = await hkGetWorkoutRouteSamples({ id: externalId });
        return extractImportedWorkoutRoute(rawRoute);
    },

    async readMetricsByRange(input): Promise<HealthImportedWorkoutMetrics | null> {
        const options = buildRangeOptions(input.from, input.to);

        const [
            heartRateSamples,
            stepSamples,
            distanceResult,
            activeEnergyResults,
            basalEnergyResults,
        ] = await Promise.all([
            hkGetHeartRateSamples(options).catch((): unknown[] => []),
            hkGetDailyStepCountSamples(options).catch((): unknown[] => []),
            hkGetDistanceWalkingRunning(options).catch((): unknown | null => null),
            hkGetActiveEnergyBurned(options).catch((): unknown[] => []),
            hkGetBasalEnergyBurned(options).catch((): unknown[] => []),
        ]);

        const activeKcal = extractEnergyKcal(activeEnergyResults);
        const basalKcal = extractEnergyKcal(basalEnergyResults);
        const totalKcal =
            activeKcal !== null && basalKcal !== null
                ? activeKcal + basalKcal
                : null;

        return {
            durationSeconds: null,
            activeKcal,
            totalKcal,
            totalKcalEstimated: totalKcal !== null,
            avgHr: avgNumericFromUnknownArray(heartRateSamples, ["value", "heartRate"]),
            maxHr: maxNumericFromUnknownArray(heartRateSamples, ["value", "heartRate"]),
            distanceKm: extractDistanceKm(distanceResult),
            steps: sumNumericFromUnknownArray(stepSamples, ["value", "steps"]),
            elevationGainM: null,
            paceSecPerKm: null,
            cadenceRpm: null,
            effortRpe: null,
        };
    },
};
