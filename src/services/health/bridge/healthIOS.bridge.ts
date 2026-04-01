// /src/services/health/bridge/healthIOS.bridge.ts

import AppleHealthKit, {
    type HealthInputOptions,
    type HealthKitPermissions,
    type HealthPermission,
    type HealthValue,
} from "react-native-health";

import type { NativeHealthBridge } from "@/src/services/health/healthBridge.types";
import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedSleep,
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
} from "@/src/types/health/health.types";

/**
 * Helpers
 */
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

function buildDayRange(date: string): { startDate: string; endDate: string } {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
    };
}

function buildRangeOptions(from: string, to: string): HealthInputOptions {
    return {
        startDate: from,
        endDate: to,
    };
}

/**
 * Defensive module access.
 * In some dev builds / native-linking issues, the imported module may exist
 * but native functions can still be undefined.
 */
type AppleHealthKitModuleLike = {
    isAvailable?: (callback: (error: string | null, result: boolean) => void) => void;
    initHealthKit?: (permissions: HealthKitPermissions, callback: (error: string | null) => void) => void;
    getSleepSamples?: (options: HealthInputOptions, callback: (error: string | null, results: HealthValue[]) => void) => void;
    getSamples?: (options: HealthInputOptions, callback: (error: string | null, results: HealthValue[]) => void) => void;
    getHeartRateSamples?: (options: HealthInputOptions, callback: (error: string | null, results: HealthValue[]) => void) => void;
    getDailyStepCountSamples?: (options: HealthInputOptions, callback: (error: string | null, results: HealthValue[]) => void) => void;
    getDistanceWalkingRunning?: (
        options: HealthInputOptions,
        callback: (error: string | null, result: HealthValue) => void
    ) => void;
    getActiveEnergyBurned?: (
        options: HealthInputOptions,
        callback: (error: string | null, results: HealthValue[]) => void
    ) => void;
    Constants?: {
        Permissions?: Record<string, HealthPermission | undefined>;
    };
};

function getHealthModule(): AppleHealthKitModuleLike | null {
    const moduleCandidate: unknown = AppleHealthKit;

    if (!moduleCandidate || typeof moduleCandidate !== "object") {
        return null;
    }

    return moduleCandidate as AppleHealthKitModuleLike;
}

function hasFunction<K extends keyof AppleHealthKitModuleLike>(
    moduleRef: AppleHealthKitModuleLike | null,
    key: K
): moduleRef is AppleHealthKitModuleLike & Required<Pick<AppleHealthKitModuleLike, K>> {
    return Boolean(moduleRef && typeof moduleRef[key] === "function");
}

function getHKReadPermissions(keys: HealthPermissionKey[]): HealthPermission[] {
    const moduleRef = getHealthModule();
    const permissionsMap = moduleRef?.Constants?.Permissions ?? {};
    const read: HealthPermission[] = [];

    for (const key of keys) {
        if (key === "sleep" && permissionsMap.SleepAnalysis) {
            read.push(permissionsMap.SleepAnalysis);
        }

        if (key === "workouts" && permissionsMap.Workout) {
            read.push(permissionsMap.Workout);
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

        if (key === "active-energy" && permissionsMap.ActiveEnergyBurned) {
            read.push(permissionsMap.ActiveEnergyBurned);
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

function hkIsAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const moduleRef = getHealthModule();

        if (!hasFunction(moduleRef, "isAvailable")) {
            resolve(false);
            return;
        }

        moduleRef.isAvailable((error: string | null, available: boolean) => {
            if (error) {
                resolve(false);
                return;
            }

            resolve(Boolean(available));
        });
    });
}

function hkInitHealthKit(readPermissions: HealthPermission[]): Promise<boolean> {
    return new Promise((resolve) => {
        const moduleRef = getHealthModule();

        if (!hasFunction(moduleRef, "initHealthKit")) {
            resolve(false);
            return;
        }

        const permissions: HealthKitPermissions = {
            permissions: {
                read: readPermissions,
                write: [],
            },
        };

        moduleRef.initHealthKit(permissions, (error: string | null) => {
            resolve(!error);
        });
    });
}

function hkGetSleepSamples(options: HealthInputOptions): Promise<HealthValue[]> {
    return new Promise((resolve, reject) => {
        const moduleRef = getHealthModule();

        if (!hasFunction(moduleRef, "getSleepSamples")) {
            resolve([]);
            return;
        }

        moduleRef.getSleepSamples(options, (error: string | null, results: HealthValue[]) => {
            if (error) {
                reject(new Error(error));
                return;
            }

            resolve(Array.isArray(results) ? results : []);
        });
    });
}

function hkGetWorkoutSamples(options: HealthInputOptions): Promise<HealthValue[]> {
    return new Promise((resolve, reject) => {
        const moduleRef = getHealthModule();

        if (!hasFunction(moduleRef, "getSamples")) {
            resolve([]);
            return;
        }

        moduleRef.getSamples(options, (error: string | null, results: HealthValue[]) => {
            if (error) {
                reject(new Error(error));
                return;
            }

            resolve(Array.isArray(results) ? results : []);
        });
    });
}

function hkGetHeartRateSamples(options: HealthInputOptions): Promise<HealthValue[]> {
    return new Promise((resolve, reject) => {
        const moduleRef = getHealthModule();

        if (!hasFunction(moduleRef, "getHeartRateSamples")) {
            resolve([]);
            return;
        }

        moduleRef.getHeartRateSamples(options, (error: string | null, results: HealthValue[]) => {
            if (error) {
                reject(new Error(error));
                return;
            }

            resolve(Array.isArray(results) ? results : []);
        });
    });
}

function hkGetDailyStepCountSamples(options: HealthInputOptions): Promise<HealthValue[]> {
    return new Promise((resolve, reject) => {
        const moduleRef = getHealthModule();

        if (!hasFunction(moduleRef, "getDailyStepCountSamples")) {
            resolve([]);
            return;
        }

        moduleRef.getDailyStepCountSamples(options, (error: string | null, results: HealthValue[]) => {
            if (error) {
                reject(new Error(error));
                return;
            }

            resolve(Array.isArray(results) ? results : []);
        });
    });
}

function hkGetDistanceWalkingRunning(options: HealthInputOptions): Promise<HealthValue | null> {
    return new Promise((resolve, reject) => {
        const moduleRef = getHealthModule();

        if (!hasFunction(moduleRef, "getDistanceWalkingRunning")) {
            resolve(null);
            return;
        }

        moduleRef.getDistanceWalkingRunning(options, (error: string | null, result: HealthValue) => {
            if (error) {
                reject(new Error(error));
                return;
            }

            resolve(result ?? null);
        });
    });
}

function hkGetActiveEnergyBurned(options: HealthInputOptions): Promise<HealthValue[]> {
    return new Promise((resolve, reject) => {
        const moduleRef = getHealthModule();

        if (!hasFunction(moduleRef, "getActiveEnergyBurned")) {
            resolve([]);
            return;
        }

        moduleRef.getActiveEnergyBurned(options, (error: string | null, results: HealthValue[]) => {
            if (error) {
                reject(new Error(error));
                return;
            }

            resolve(Array.isArray(results) ? results : []);
        });
    });
}

function minutesBetween(startAt: string | null, endAt: string | null): number | null {
    if (!startAt || !endAt) return null;

    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return null;
    }

    return Math.round((endMs - startMs) / 60000);
}

function classifySleepBucket(sample: Record<string, unknown>): "awake" | "rem" | "deep" | "core" | "in-bed" | "asleep" | "unknown" {
    const raw =
        asNonEmptyString(sample.value) ??
        asNonEmptyString(sample.stage) ??
        asNonEmptyString(sample.sleepAnalysis) ??
        "";

    const normalized = raw.toLowerCase();

    if (normalized.includes("awake")) return "awake";
    if (normalized.includes("rem")) return "rem";
    if (normalized.includes("deep")) return "deep";
    if (normalized.includes("core")) return "core";
    if (normalized.includes("light")) return "core";
    if (normalized.includes("inbed")) return "in-bed";
    if (normalized.includes("in bed")) return "in-bed";
    if (normalized.includes("asleep")) return "asleep";

    return "unknown";
}

function mapSleepSamplesToImportedSleep(date: string, samples: HealthValue[]): HealthImportedSleep | null {
    if (!samples.length) return null;

    let timeAsleepMinutes = 0;
    let timeInBedMinutes = 0;
    let awakeMinutes = 0;
    let remMinutes = 0;
    let coreMinutes = 0;
    let deepMinutes = 0;
    let sourceDevice: string | null = null;

    for (const rawSample of samples) {
        if (!isRecord(rawSample)) continue;

        const startAt =
            asNonEmptyString(rawSample.startDate) ??
            asNonEmptyString(rawSample.start) ??
            null;

        const endAt =
            asNonEmptyString(rawSample.endDate) ??
            asNonEmptyString(rawSample.end) ??
            null;

        const sampleMinutes = minutesBetween(startAt, endAt);
        if (sampleMinutes === null || sampleMinutes <= 0) continue;

        const sourceName =
            asNonEmptyString(rawSample.sourceName) ??
            asNonEmptyString(rawSample.source) ??
            null;

        if (!sourceDevice && sourceName) {
            sourceDevice = sourceName;
        }

        const bucket = classifySleepBucket(rawSample);

        if (bucket === "awake") {
            awakeMinutes += sampleMinutes;
            continue;
        }

        if (bucket === "rem") {
            remMinutes += sampleMinutes;
            timeAsleepMinutes += sampleMinutes;
            continue;
        }

        if (bucket === "deep") {
            deepMinutes += sampleMinutes;
            timeAsleepMinutes += sampleMinutes;
            continue;
        }

        if (bucket === "core") {
            coreMinutes += sampleMinutes;
            timeAsleepMinutes += sampleMinutes;
            continue;
        }

        if (bucket === "in-bed") {
            timeInBedMinutes += sampleMinutes;
            continue;
        }

        if (bucket === "asleep") {
            timeAsleepMinutes += sampleMinutes;
        }
    }

    if (timeInBedMinutes === 0 && timeAsleepMinutes > 0) {
        timeInBedMinutes = timeAsleepMinutes + awakeMinutes;
    }

    return {
        date,
        timeAsleepMinutes: timeAsleepMinutes || null,
        timeInBedMinutes: timeInBedMinutes || null,
        score: null,
        awakeMinutes: awakeMinutes || null,
        remMinutes: remMinutes || null,
        coreMinutes: coreMinutes || null,
        deepMinutes: deepMinutes || null,
        source: "healthkit",
        sourceDevice,
        importedAt: toIsoNow(),
        lastSyncedAt: toIsoNow(),
        raw: samples,
    };
}

function extractWorkoutType(sample: Record<string, unknown>): string {
    return (
        asNonEmptyString(sample.activityName) ??
        asNonEmptyString(sample.workoutActivityType) ??
        asNonEmptyString(sample.type) ??
        "Workout"
    );
}

function mapWorkoutSample(sample: HealthValue): HealthImportedWorkoutSessionMinimal | null {
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
        (() => {
            const mins = minutesBetween(startAt, endAt);
            return mins === null ? null : mins * 60;
        })();

    return {
        externalId:
            asNonEmptyString(sample.id) ??
            asNonEmptyString(sample.uuid) ??
            null,
        type: extractWorkoutType(sample),
        startAt,
        endAt,
        metrics: {
            durationSeconds,
            activeKcal:
                asNullableNumber(sample.activeEnergyBurned) ??
                asNullableNumber(sample.activeEnergy) ??
                asNullableNumber(sample.kcal) ??
                null,
            totalKcal:
                asNullableNumber(sample.totalEnergyBurned) ??
                asNullableNumber(sample.energy) ??
                null,
            avgHr: null,
            maxHr: null,
            distanceKm:
                asNullableNumber(sample.distance) ??
                asNullableNumber(sample.distanceKm) ??
                null,
            steps: null,
            elevationGainM: asNullableNumber(sample.elevationAscended),
            paceSecPerKm: null,
            cadenceRpm: null,
            effortRpe: null,
        },
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

function sumNumericFromUnknownArray(values: HealthValue[], keys: string[]): number | null {
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

function avgNumericFromUnknownArray(values: HealthValue[], keys: string[]): number | null {
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

function maxNumericFromUnknownArray(values: HealthValue[], keys: string[]): number | null {
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

function extractDistanceKm(value: HealthValue | null): number | null {
    if (!value || !isRecord(value)) return null;

    return (
        asNullableNumber(value.value) ??
        asNullableNumber(value.distance) ??
        asNullableNumber(value.distanceKm) ??
        null
    );
}

function extractEnergyKcal(values: HealthValue[]): number | null {
    return sumNumericFromUnknownArray(values, ["value", "kcal", "activeEnergyBurned", "activeEnergy"]);
}

export const healthIOSBridge: NativeHealthBridge = {
    platform: "ios",

    async isAvailable(): Promise<boolean> {
        return hkIsAvailable();
    },

    async requestPermissions(input): Promise<HealthPermissionsStatus> {
        const available = await hkIsAvailable();

        if (!available) {
            return mapPermissionsStatus(input.permissions, false);
        }

        const readPermissions = getHKReadPermissions(input.permissions);
        const granted = await hkInitHealthKit(readPermissions);

        return mapPermissionsStatus(input.permissions, granted);
    },

    async readSleepByDate(input): Promise<HealthImportedSleep | null> {
        const range = buildDayRange(input.date);
        const samples = await hkGetSleepSamples(buildRangeOptions(range.startDate, range.endDate));
        return mapSleepSamplesToImportedSleep(input.date, samples);
    },

    async readWorkoutsByDate(input): Promise<HealthImportedWorkoutSessionMinimal[]> {
        const range = buildDayRange(input.date);
        const samples = await hkGetWorkoutSamples(buildRangeOptions(range.startDate, range.endDate));

        const mapped: HealthImportedWorkoutSessionMinimal[] = [];

        for (const sample of samples) {
            const workout = mapWorkoutSample(sample);
            if (workout) {
                mapped.push(workout);
            }
        }

        return mapped;
    },

    async readMetricsByRange(input): Promise<HealthImportedWorkoutMetrics | null> {
        const options = buildRangeOptions(input.from, input.to);

        const [heartRateSamples, stepSamples, distanceResult, energyResults] = await Promise.all([
            hkGetHeartRateSamples(options).catch((): HealthValue[] => []),
            hkGetDailyStepCountSamples(options).catch((): HealthValue[] => []),
            hkGetDistanceWalkingRunning(options).catch((): HealthValue | null => null),
            hkGetActiveEnergyBurned(options).catch((): HealthValue[] => []),
        ]);

        return {
            durationSeconds: null,
            activeKcal: extractEnergyKcal(energyResults),
            totalKcal: null,
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