// /src/utils/health/healthWorkout.mapper.ts
// Normalizes imported health workouts into Gym Check and Workout Day contracts.

import type {
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal,
} from "@/src/types/health/cardio/health.types";
import type {
    ISODate,
    WorkoutDataSource,
    WorkoutSessionMeta,
    WorkoutSessionUpsert,
} from "@/src/types/workoutDay.types";
import { resolveWorkoutDateFromDateTime } from "@/src/utils/health/healthDate.utils";

/**
 * Metrics patch used to enrich an existing Gym Check session without touching
 * its exercises, notes, or manually entered effort.
 */
export type GymCheckMetricsPatch = {
    startAt?: string | null;
    endAt?: string | null;
    durationSeconds?: number | null;
    activeKcal?: number | null;
    totalKcal?: number | null;
    avgHr?: number | null;
    maxHr?: number | null;
    effortRpe?: number | null;
    meta?: WorkoutSessionMeta | null;
};

function asNullableString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function asNullableNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function toNonNegativeIntOrNull(value: unknown): number | null {
    const parsed = asNullableNumber(value);
    return parsed === null ? null : Math.max(0, Math.trunc(parsed));
}

function toNonNegativeRoundedIntOrNull(value: unknown): number | null {
    const parsed = asNullableNumber(value);
    return parsed === null ? null : Math.max(0, Math.round(parsed));
}

function toNonNegativeNumberOrNull(value: unknown): number | null {
    const parsed = asNullableNumber(value);
    return parsed !== null && parsed >= 0 ? parsed : null;
}

function toIsoNow(): string {
    return new Date().toISOString();
}

function toWorkoutDataSource(value: unknown): WorkoutDataSource | null {
    return value === "manual" ||
        value === "healthkit" ||
        value === "health-connect"
        ? value
        : null;
}

/**
 * Detects whether the provider returned at least one useful workout metric.
 */
export function hasMeaningfulImportedWorkoutMetrics(
    input: HealthImportedWorkoutMetrics | null | undefined
): boolean {
    if (!input) return false;

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
    ].some(
        (value) =>
            typeof value === "number" &&
            Number.isFinite(value) &&
            value > 0
    );
}

/**
 * Resolves the canonical workout date from an explicit date or timestamps.
 */
export function resolveImportedWorkoutDate(
    input: Pick<
        HealthImportedWorkoutSessionMinimal,
        "date" | "startAt" | "endAt"
    >
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
 * Builds the common metadata stored for imported workout sessions.
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
        | "metrics"
    >
): WorkoutSessionMeta {
    return {
        source: toWorkoutDataSource(input.source),
        sourceDevice: asNullableString(input.sourceDevice),
        importedAt: asNullableString(input.importedAt) ?? toIsoNow(),
        lastSyncedAt: asNullableString(input.lastSyncedAt) ?? toIsoNow(),
        sessionKind: input.sessionKind ?? "device-import",
        externalId: asNullableString(input.externalId),
        originalType: asNullableString(input.type),
        provider: toWorkoutDataSource(input.source),
        totalKcalEstimated: input.metrics.totalKcalEstimated === true,
    };
}

/**
 * Converts one imported strength workout into a Gym Check-only metrics patch.
 * Calories are rounded at the app/API boundary and cardio fields are omitted.
 */
export function mapImportedWorkoutToGymCheckMetricsPatch(
    input: HealthImportedWorkoutSessionMinimal
): GymCheckMetricsPatch {
    return {
        startAt: asNullableString(input.startAt),
        endAt: asNullableString(input.endAt),
        durationSeconds: toNonNegativeIntOrNull(
            input.metrics.durationSeconds
        ),
        activeKcal: toNonNegativeRoundedIntOrNull(input.metrics.activeKcal),
        totalKcal: toNonNegativeRoundedIntOrNull(input.metrics.totalKcal),
        avgHr: toNonNegativeIntOrNull(input.metrics.avgHr),
        maxHr: toNonNegativeIntOrNull(input.metrics.maxHr),
        effortRpe: toNonNegativeNumberOrNull(input.metrics.effortRpe),
        meta: {
            ...mapImportedWorkoutToSessionMeta(input),
            sessionKind: "gym-check",
        },
    };
}

/**
 * Converts an imported workout into a minimal automatic Workout Day session.
 */
export function mapImportedWorkoutToMinimalDaySession(
    input: HealthImportedWorkoutSessionMinimal
): WorkoutSessionUpsert {
    return {
        type: asNullableString(input.type) ?? "Workout",
        activityType: null,
        cardioEnvironment: null,
        startAt: asNullableString(input.startAt),
        endAt: asNullableString(input.endAt),
        durationSeconds: toNonNegativeIntOrNull(
            input.metrics.durationSeconds
        ),
        activeKcal: toNonNegativeRoundedIntOrNull(input.metrics.activeKcal),
        totalKcal: toNonNegativeRoundedIntOrNull(input.metrics.totalKcal),
        avgHr: toNonNegativeIntOrNull(input.metrics.avgHr),
        maxHr: toNonNegativeIntOrNull(input.metrics.maxHr),
        distanceKm: toNonNegativeNumberOrNull(input.metrics.distanceKm),
        steps: toNonNegativeIntOrNull(input.metrics.steps),
        elevationGainM: toNonNegativeNumberOrNull(
            input.metrics.elevationGainM
        ),
        paceSecPerKm: toNonNegativeIntOrNull(
            input.metrics.paceSecPerKm
        ),
        cadenceRpm: toNonNegativeNumberOrNull(input.metrics.cadenceRpm),
        hasRoute: false,
        routeSummary: null,
        routePoints: null,
        cardioMetrics: null,
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
