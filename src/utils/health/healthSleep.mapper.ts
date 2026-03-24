// src/utils/health/healthSleep.mapper.ts

import type { HealthImportedSleep } from "@/src/types/health.types";
import type {
    SleepBlock,
    WorkoutDataSource,
    WorkoutSourceDevice,
} from "@/src/types/workoutDay.types";

function asNullableString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function asNullableNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function toNonNegativeIntOrNull(value: unknown): number | null {
    const parsed = asNullableNumber(value);
    if (parsed === null) {
        return null;
    }

    return Math.max(0, Math.trunc(parsed));
}

function toIsoNow(): string {
    return new Date().toISOString();
}

function toWorkoutDataSource(value: unknown): WorkoutDataSource | null {
    return value === "manual" || value === "healthkit" || value === "health-connect"
        ? value
        : null;
}

/**
 * Detects whether imported sleep contains at least one meaningful metric.
 */
export function hasMeaningfulImportedSleep(
    input: HealthImportedSleep | null | undefined
): boolean {
    if (!input) {
        return false;
    }

    return [
        input.timeAsleepMinutes,
        input.timeInBedMinutes,
        input.score,
        input.awakeMinutes,
        input.remMinutes,
        input.coreMinutes,
        input.deepMinutes,
    ].some((value) => typeof value === "number" && Number.isFinite(value));
}

/**
 * Converts neutral imported health sleep data into the app SleepBlock.
 */
export function mapImportedSleepToSleepBlock(input: HealthImportedSleep): SleepBlock {
    return {
        timeAsleepMinutes: toNonNegativeIntOrNull(input.timeAsleepMinutes),
        timeInBedMinutes: toNonNegativeIntOrNull(input.timeInBedMinutes),
        score: toNonNegativeIntOrNull(input.score),

        awakeMinutes: toNonNegativeIntOrNull(input.awakeMinutes),
        remMinutes: toNonNegativeIntOrNull(input.remMinutes),
        coreMinutes: toNonNegativeIntOrNull(input.coreMinutes),
        deepMinutes: toNonNegativeIntOrNull(input.deepMinutes),

        source: toWorkoutDataSource(input.source),
        sourceDevice: asNullableString(input.sourceDevice) as WorkoutSourceDevice | null,

        importedAt: asNullableString(input.importedAt) ?? toIsoNow(),
        lastSyncedAt: asNullableString(input.lastSyncedAt) ?? toIsoNow(),

        raw: input.raw ?? null,
    };
}