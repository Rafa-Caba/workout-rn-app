// /src/services/health/bridge/healthAndroid.bridge.ts

import {
    initialize,
    readRecords,
    requestPermission,
} from "react-native-health-connect";

import type { NativeHealthBridge } from "@/src/services/health/healthBridge.types";
import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedSleep,
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
} from "@/src/types/health.types";

/**
 * Supported Health Connect record types used by this app.
 * Typed as literal union so readRecords(...) accepts them.
 */
type HealthConnectSupportedRecordType =
    | "SleepSession"
    | "ExerciseSession"
    | "HeartRate"
    | "Steps"
    | "Distance"
    | "ActiveCaloriesBurned";

/**
 * Read-only permission shape compatible with requestPermission(...)
 */
type HealthConnectReadPermission = {
    accessType: "read";
    recordType: HealthConnectSupportedRecordType;
};

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

function buildDayRange(date: string): { startTime: string; endTime: string } {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
    };
}

function buildTimeRangeFilter(startTime: string, endTime: string): {
    operator: "between";
    startTime: string;
    endTime: string;
} {
    return {
        operator: "between",
        startTime,
        endTime,
    };
}

function getHCReadPermissions(keys: HealthPermissionKey[]): HealthConnectReadPermission[] {
    const permissions: HealthConnectReadPermission[] = [];

    for (const key of keys) {
        if (key === "sleep") {
            permissions.push({ accessType: "read", recordType: "SleepSession" });
        }

        if (key === "workouts") {
            permissions.push({ accessType: "read", recordType: "ExerciseSession" });
        }

        if (key === "heart-rate") {
            permissions.push({ accessType: "read", recordType: "HeartRate" });
        }

        if (key === "steps") {
            permissions.push({ accessType: "read", recordType: "Steps" });
        }

        if (key === "distance") {
            permissions.push({ accessType: "read", recordType: "Distance" });
        }

        if (key === "active-energy") {
            permissions.push({ accessType: "read", recordType: "ActiveCaloriesBurned" });
        }
    }

    return permissions;
}

function mapPermissionsStatus(
    requested: HealthPermissionKey[],
    granted: boolean
): HealthPermissionsStatus {
    const permissions: Record<string, "granted" | "unknown"> = {};

    for (const key of requested) {
        permissions[key] = granted ? "granted" : "unknown";
    }

    return {
        provider: "health-connect",
        available: granted,
        permissions,
        checkedAt: toIsoNow(),
    };
}

async function hcInitialize(): Promise<boolean> {
    try {
        return await initialize();
    } catch {
        return false;
    }
}

async function hcReadRecords(
    recordType: HealthConnectSupportedRecordType,
    startTime: string,
    endTime: string
): Promise<unknown[]> {
    const result = await readRecords(recordType, {
        timeRangeFilter: buildTimeRangeFilter(startTime, endTime),
    });

    if (!isRecord(result)) return [];
    const records = result.records;
    return Array.isArray(records) ? records : [];
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

function classifyAndroidSleepStage(stage: unknown): "awake" | "rem" | "deep" | "core" | "unknown" {
    if (!isRecord(stage)) return "unknown";

    const raw =
        asNonEmptyString(stage.stage) ??
        asNonEmptyString(stage.stageType) ??
        asNonEmptyString(stage.type) ??
        "";

    const normalized = raw.toLowerCase();

    if (normalized.includes("awake")) return "awake";
    if (normalized.includes("rem")) return "rem";
    if (normalized.includes("deep")) return "deep";
    if (normalized.includes("light")) return "core";
    if (normalized.includes("core")) return "core";
    if (normalized.includes("sleeping")) return "core";

    return "unknown";
}

function mapAndroidSleepRecords(date: string, records: unknown[]): HealthImportedSleep | null {
    if (!records.length) return null;

    let timeAsleepMinutes = 0;
    let timeInBedMinutes = 0;
    let awakeMinutes = 0;
    let remMinutes = 0;
    let coreMinutes = 0;
    let deepMinutes = 0;
    let sourceDevice: string | null = null;

    for (const rawRecord of records) {
        if (!isRecord(rawRecord)) continue;

        const sessionStart =
            asNonEmptyString(rawRecord.startTime) ??
            asNonEmptyString(rawRecord.startDateTime) ??
            null;

        const sessionEnd =
            asNonEmptyString(rawRecord.endTime) ??
            asNonEmptyString(rawRecord.endDateTime) ??
            null;

        const sessionMinutes = minutesBetween(sessionStart, sessionEnd);
        if (sessionMinutes !== null) {
            timeInBedMinutes += sessionMinutes;
        }

        const metadata = isRecord(rawRecord.metadata) ? rawRecord.metadata : null;
        const dataOrigin =
            metadata && asNonEmptyString(metadata.dataOrigin)
                ? asNonEmptyString(metadata.dataOrigin)
                : null;

        if (!sourceDevice && dataOrigin) {
            sourceDevice = dataOrigin;
        }

        const stages = Array.isArray(rawRecord.stages) ? rawRecord.stages : [];

        if (!stages.length && sessionMinutes !== null) {
            timeAsleepMinutes += sessionMinutes;
            continue;
        }

        for (const stage of stages) {
            if (!isRecord(stage)) continue;

            const stageStart =
                asNonEmptyString(stage.startTime) ??
                sessionStart;

            const stageEnd =
                asNonEmptyString(stage.endTime) ??
                sessionEnd;

            const stageMinutes = minutesBetween(stageStart, stageEnd);
            if (stageMinutes === null || stageMinutes <= 0) continue;

            const bucket = classifyAndroidSleepStage(stage);

            if (bucket === "awake") {
                awakeMinutes += stageMinutes;
                continue;
            }

            if (bucket === "rem") {
                remMinutes += stageMinutes;
                timeAsleepMinutes += stageMinutes;
                continue;
            }

            if (bucket === "deep") {
                deepMinutes += stageMinutes;
                timeAsleepMinutes += stageMinutes;
                continue;
            }

            if (bucket === "core") {
                coreMinutes += stageMinutes;
                timeAsleepMinutes += stageMinutes;
                continue;
            }
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
        source: "health-connect",
        sourceDevice,
        importedAt: toIsoNow(),
        lastSyncedAt: toIsoNow(),
        raw: records,
    };
}

function mapAndroidWorkoutRecord(record: unknown): HealthImportedWorkoutSessionMinimal | null {
    if (!isRecord(record)) return null;

    const startAt =
        asNonEmptyString(record.startTime) ??
        asNonEmptyString(record.startDateTime) ??
        null;

    const endAt =
        asNonEmptyString(record.endTime) ??
        asNonEmptyString(record.endDateTime) ??
        null;

    const metadata = isRecord(record.metadata) ? record.metadata : null;

    return {
        externalId:
            metadata && asNonEmptyString(metadata.id)
                ? asNonEmptyString(metadata.id)
                : null,
        type:
            asNonEmptyString(record.exerciseType) ??
            asNonEmptyString(record.title) ??
            "Workout",
        startAt,
        endAt,
        metrics: {
            durationSeconds:
                (() => {
                    const minutes = minutesBetween(startAt, endAt);
                    return minutes === null ? null : minutes * 60;
                })(),
            activeKcal:
                isRecord(record.energy)
                    ? asNullableNumber(record.energy.inKilocalories)
                    : null,
            totalKcal: null,
            avgHr: null,
            maxHr: null,
            distanceKm:
                isRecord(record.distance)
                    ? asNullableNumber(record.distance.inKilometers)
                    : null,
            steps: null,
            elevationGainM: null,
            paceSecPerKm: null,
            cadenceRpm: null,
            effortRpe: null,
        },
        notes: asNonEmptyString(record.notes),
        source: "health-connect",
        sourceDevice:
            metadata && asNonEmptyString(metadata.dataOrigin)
                ? asNonEmptyString(metadata.dataOrigin)
                : null,
        importedAt: toIsoNow(),
        lastSyncedAt: toIsoNow(),
        sessionKind: "device-import",
        raw: record,
    };
}

function sumFromEnergyRecords(records: unknown[]): number | null {
    let total = 0;
    let found = false;

    for (const rawRecord of records) {
        if (!isRecord(rawRecord)) continue;
        const energy = isRecord(rawRecord.energy) ? rawRecord.energy : null;
        const kcal = energy ? asNullableNumber(energy.inKilocalories) : null;

        if (kcal !== null) {
            total += kcal;
            found = true;
        }
    }

    return found ? total : null;
}

function sumFromStepRecords(records: unknown[]): number | null {
    let total = 0;
    let found = false;

    for (const rawRecord of records) {
        if (!isRecord(rawRecord)) continue;

        const count = asNullableNumber(rawRecord.count);
        if (count !== null) {
            total += count;
            found = true;
        }
    }

    return found ? total : null;
}

function sumFromDistanceRecords(records: unknown[]): number | null {
    let total = 0;
    let found = false;

    for (const rawRecord of records) {
        if (!isRecord(rawRecord)) continue;

        const distance = isRecord(rawRecord.distance) ? rawRecord.distance : null;
        const km = distance ? asNullableNumber(distance.inKilometers) : null;

        if (km !== null) {
            total += km;
            found = true;
        }
    }

    return found ? total : null;
}

function collectHeartRateValues(records: unknown[]): number[] {
    const values: number[] = [];

    for (const rawRecord of records) {
        if (!isRecord(rawRecord)) continue;

        const bpm = asNullableNumber(rawRecord.beatsPerMinute);
        if (bpm !== null) {
            values.push(bpm);
        }

        const samples = Array.isArray(rawRecord.samples) ? rawRecord.samples : [];
        for (const sample of samples) {
            if (!isRecord(sample)) continue;

            const sampleBpm = asNullableNumber(sample.beatsPerMinute);
            if (sampleBpm !== null) {
                values.push(sampleBpm);
            }
        }
    }

    return values;
}

function avg(values: number[]): number | null {
    if (!values.length) return null;
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round(total / values.length);
}

function max(values: number[]): number | null {
    if (!values.length) return null;
    return values.reduce((acc, value) => Math.max(acc, value), values[0] ?? 0);
}

export const healthAndroidBridge: NativeHealthBridge = {
    platform: "android",

    async isAvailable(): Promise<boolean> {
        return hcInitialize();
    },

    async requestPermissions(input): Promise<HealthPermissionsStatus> {
        const available = await hcInitialize();

        if (!available) {
            return mapPermissionsStatus(input.permissions, false);
        }

        const permissions = getHCReadPermissions(input.permissions);

        try {
            await requestPermission(permissions);
            return mapPermissionsStatus(input.permissions, true);
        } catch {
            return mapPermissionsStatus(input.permissions, false);
        }
    },

    async readSleepByDate(input): Promise<HealthImportedSleep | null> {
        const range = buildDayRange(input.date);
        const records = await hcReadRecords("SleepSession", range.startTime, range.endTime);
        return mapAndroidSleepRecords(input.date, records);
    },

    async readWorkoutsByDate(input): Promise<HealthImportedWorkoutSessionMinimal[]> {
        const range = buildDayRange(input.date);
        const records = await hcReadRecords("ExerciseSession", range.startTime, range.endTime);

        const mapped: HealthImportedWorkoutSessionMinimal[] = [];

        for (const record of records) {
            const session = mapAndroidWorkoutRecord(record);
            if (session) {
                mapped.push(session);
            }
        }

        return mapped;
    },

    async readMetricsByRange(input): Promise<HealthImportedWorkoutMetrics | null> {
        const [energyRecords, stepRecords, distanceRecords, heartRateRecords] = await Promise.all([
            hcReadRecords("ActiveCaloriesBurned", input.from, input.to).catch(() => []),
            hcReadRecords("Steps", input.from, input.to).catch(() => []),
            hcReadRecords("Distance", input.from, input.to).catch(() => []),
            hcReadRecords("HeartRate", input.from, input.to).catch(() => []),
        ]);

        const heartRates = collectHeartRateValues(heartRateRecords);

        return {
            durationSeconds: null,
            activeKcal: sumFromEnergyRecords(energyRecords),
            totalKcal: null,
            avgHr: avg(heartRates),
            maxHr: max(heartRates),
            distanceKm: sumFromDistanceRecords(distanceRecords),
            steps: sumFromStepRecords(stepRecords),
            elevationGainM: null,
            paceSecPerKm: null,
            cadenceRpm: null,
            effortRpe: null,
        };
    },
};