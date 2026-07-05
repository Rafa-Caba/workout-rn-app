// src/utils/health/cardio/cardioEnvironment.mapper.ts
// Shared helpers for resolving Cardio indoor/outdoor environment from HealthKit,
// Health Connect, imported routes, provider workout labels, and existing sessions.

import type {
    HealthImportedWorkoutRoute,
    HealthImportedWorkoutSessionMinimal,
} from "@/src/types/health/cardio/health.types";
import type { WorkoutCardioEnvironment, WorkoutRouteSummary } from "@/src/types/workoutDay.types";

export type CardioEnvironmentDetectionInput = {
    providerWorkoutType?: string | null;
    raw?: unknown | null;
    route?: HealthImportedWorkoutRoute | null;
    routeSummary?: WorkoutRouteSummary | null;
    hasRoute?: boolean | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasMeaningfulRoute(
    route: HealthImportedWorkoutRoute | null | undefined,
    routeSummary?: WorkoutRouteSummary | null,
    hasRoute?: boolean | null
): boolean {
    if (hasRoute === true) {
        return true;
    }

    if (routeSummary && routeSummary.pointCount > 0) {
        return true;
    }

    if (!route) {
        return false;
    }

    return route.hasRoute === true || route.points.length > 0;
}

function readBooleanFlag(value: unknown): boolean | null {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        if (value === 1) return true;
        if (value === 0) return false;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "yes", "1", "indoor", "inside", "treadmill"].includes(normalized)) {
            return true;
        }
        if (["false", "no", "0", "outdoor", "outside"].includes(normalized)) {
            return false;
        }
    }

    return null;
}

function detectIndoorFlagFromRecord(record: Record<string, unknown>): boolean | null {
    const directFlagKeys = [
        "indoor",
        "isIndoor",
        "isIndoorWorkout",
        "inside",
        "treadmill",
        "HKMetadataKeyIndoorWorkout",
        "MetadataKeyIndoorWorkout",
    ];

    for (const key of directFlagKeys) {
        if (key in record) {
            const parsed = readBooleanFlag(record[key]);
            if (parsed !== null) {
                return parsed;
            }
        }
    }

    const metadata = isRecord(record.metadata) ? record.metadata : null;
    if (metadata) {
        const metadataResult = detectIndoorFlagFromRecord(metadata);
        if (metadataResult !== null) {
            return metadataResult;
        }
    }

    return null;
}

export function detectCardioEnvironmentFromProviderText(
    providerWorkoutType: string | null | undefined
): WorkoutCardioEnvironment {
    const normalized = normalizeText(providerWorkoutType);

    if (!normalized) {
        return null;
    }

    if (
        normalized.includes("treadmill") ||
        normalized.includes("indoor") ||
        normalized.includes("inside") ||
        normalized.includes("stationary")
    ) {
        return "indoor";
    }

    if (
        normalized.includes("outdoor") ||
        normalized.includes("outside") ||
        normalized.includes("hiking") ||
        normalized.includes("hike")
    ) {
        return "outdoor";
    }

    return null;
}

export function detectCardioEnvironmentFromRaw(raw: unknown): WorkoutCardioEnvironment {
    if (!isRecord(raw)) {
        return null;
    }

    const indoorFlag = detectIndoorFlagFromRecord(raw);
    if (indoorFlag === true) {
        return "indoor";
    }
    if (indoorFlag === false) {
        return "outdoor";
    }

    const textKeys = [
        "activityName",
        "workoutActivityType",
        "exerciseType",
        "type",
        "title",
        "name",
        "workoutType",
    ];

    for (const key of textKeys) {
        const detected = detectCardioEnvironmentFromProviderText(raw[key] as string | null | undefined);
        if (detected !== null) {
            return detected;
        }
    }

    return null;
}

export function resolveImportedCardioEnvironment(
    input: CardioEnvironmentDetectionInput
): WorkoutCardioEnvironment {
    if (hasMeaningfulRoute(input.route, input.routeSummary ?? null, input.hasRoute ?? null)) {
        return "outdoor";
    }

    const rawDetected = detectCardioEnvironmentFromRaw(input.raw ?? null);
    if (rawDetected !== null) {
        return rawDetected;
    }

    return detectCardioEnvironmentFromProviderText(input.providerWorkoutType ?? null);
}

export function resolveCardioEnvironmentFromMinimalWorkout(
    workout: HealthImportedWorkoutSessionMinimal
): WorkoutCardioEnvironment {
    if (workout.cardioEnvironment === "outdoor" || workout.cardioEnvironment === "indoor") {
        return workout.cardioEnvironment;
    }

    return resolveImportedCardioEnvironment({
        providerWorkoutType: workout.providerWorkoutType ?? workout.type,
        raw: workout.raw,
        route: workout.route ?? null,
    });
}
