// src/utils/health/healthWorkout.mapper.ts

import type {
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal,
} from "@/src/types/health/health.types";
import type {
    ISODate,
    WorkoutDataSource,
    WorkoutSessionMeta,
    WorkoutSessionUpsert,
    WorkoutSourceDevice,
} from "@/src/types/workoutDay.types";
import { resolveWorkoutDateFromDateTime } from "@/src/utils/health/healthDate.utils";

/**
 * This patch shape is focused on updating an existing GymCheck session
 * with imported device metrics, without overriding exercise content.
 */
export type GymCheckMetricsPatch = {
    startAt?: string | null;
    endAt?: string | null;

    durationSeconds?: number | null;

    activeKcal?: number | null;
    totalKcal?: number | null;

    avgHr?: number | null;
    maxHr?: number | null;

    distanceKm?: number | null;
    steps?: number | null;
    elevationGainM?: number | null;

    paceSecPerKm?: number | null;
    cadenceRpm?: number | null;
    effortRpe?: number | null;

    meta?: WorkoutSessionMeta | null;
};

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

function toNonNegativeNumberOrNull(value: unknown): number | null {
    const parsed = asNullableNumber(value);
    if (parsed === null) {
        return null;
    }

    return parsed >= 0 ? parsed : null;
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
 * Detects whether workout metrics contain at least one meaningful imported value.
 */
export function hasMeaningfulImportedWorkoutMetrics(
    input: HealthImportedWorkoutMetrics | null | undefined
): boolean {
    if (!input) {
        return false;
    }

    return [
        input.durationSeconds,
        input.activeKcal,
        input.totalKcal,
        input.avgHr,
        input.maxHr,
        input.distanceKm,
        input.steps,
        input.elevationGainM,
        input.paceSecPerKm,
        input.cadenceRpm,
        input.effortRpe,
    ].some((value) => typeof value === "number" && Number.isFinite(value));
}

/**
 * Resolves the canonical workout date from imported session data.
 * Preference:
 * 1. explicit session.date
 * 2. startAt datetime
 * 3. endAt datetime
 */
export function resolveImportedWorkoutDate(
    input: Pick<HealthImportedWorkoutSessionMinimal, "date" | "startAt" | "endAt">
): ISODate | null {
    if (typeof input.date === "string" && input.date.trim().length > 0) {
        return input.date;
    }

    return (
        resolveWorkoutDateFromDateTime(input.startAt) ??
        resolveWorkoutDateFromDateTime(input.endAt)
    );
}

/**
 * Builds the common meta block for imported workout sessions.
 */
export function mapImportedWorkoutToSessionMeta(
    input: Pick<
        HealthImportedWorkoutSessionMinimal,
        | "source"
        | "sourceDevice"
        | "importedAt"
        | "lastSyncedAt"
        | "sessionKind"
        | "externalId"
        | "type"
    >
): WorkoutSessionMeta {
    return {
        source: toWorkoutDataSource(input.source),
        sourceDevice: asNullableString(input.sourceDevice) as WorkoutSourceDevice | null,
        importedAt: asNullableString(input.importedAt) ?? toIsoNow(),
        lastSyncedAt: asNullableString(input.lastSyncedAt) ?? toIsoNow(),
        sessionKind: input.sessionKind ?? "device-import",
        externalId: asNullableString(input.externalId),
        originalType: asNullableString(input.type),
        provider: toWorkoutDataSource(input.source),
    };
}

/**
 * Converts imported workout into a metrics-only patch for an existing GymCheck session.
 * Useful when the gym session already exists and we only want to enrich it with device data.
 */
export function mapImportedWorkoutToGymCheckMetricsPatch(
    input: HealthImportedWorkoutSessionMinimal
): GymCheckMetricsPatch {
    return {
        startAt: asNullableString(input.startAt),
        endAt: asNullableString(input.endAt),

        durationSeconds: toNonNegativeIntOrNull(input.metrics.durationSeconds),

        activeKcal: toNonNegativeNumberOrNull(input.metrics.activeKcal),
        totalKcal: toNonNegativeNumberOrNull(input.metrics.totalKcal),

        avgHr: toNonNegativeIntOrNull(input.metrics.avgHr),
        maxHr: toNonNegativeIntOrNull(input.metrics.maxHr),

        distanceKm: toNonNegativeNumberOrNull(input.metrics.distanceKm),
        steps: toNonNegativeIntOrNull(input.metrics.steps),
        elevationGainM: toNonNegativeNumberOrNull(input.metrics.elevationGainM),

        paceSecPerKm: toNonNegativeIntOrNull(input.metrics.paceSecPerKm),
        cadenceRpm: toNonNegativeNumberOrNull(input.metrics.cadenceRpm),
        effortRpe: toNonNegativeNumberOrNull(input.metrics.effortRpe),

        meta: mapImportedWorkoutToSessionMeta(input),
    };
}

/**
 * Converts imported workout into a minimal automatic session
 * that can be appended into workoutDay.training.sessions.
 */
export function mapImportedWorkoutToMinimalDaySession(
    input: HealthImportedWorkoutSessionMinimal
): WorkoutSessionUpsert {
    return {
        type: asNullableString(input.type) ?? "Workout",

        startAt: asNullableString(input.startAt),
        endAt: asNullableString(input.endAt),

        durationSeconds: toNonNegativeIntOrNull(input.metrics.durationSeconds),

        activeKcal: toNonNegativeNumberOrNull(input.metrics.activeKcal),
        totalKcal: toNonNegativeNumberOrNull(input.metrics.totalKcal),

        avgHr: toNonNegativeIntOrNull(input.metrics.avgHr),
        maxHr: toNonNegativeIntOrNull(input.metrics.maxHr),

        distanceKm: toNonNegativeNumberOrNull(input.metrics.distanceKm),
        steps: toNonNegativeIntOrNull(input.metrics.steps),
        elevationGainM: toNonNegativeNumberOrNull(input.metrics.elevationGainM),

        paceSecPerKm: toNonNegativeIntOrNull(input.metrics.paceSecPerKm),
        cadenceRpm: toNonNegativeNumberOrNull(input.metrics.cadenceRpm),

        effortRpe: toNonNegativeNumberOrNull(input.metrics.effortRpe),

        notes: asNullableString(input.notes),
        media: null,
        exercises: null,

        meta: {
            ...mapImportedWorkoutToSessionMeta(input),
            sessionKind: "device-import",
        },
    };
}