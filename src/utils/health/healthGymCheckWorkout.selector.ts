// /src/utils/health/healthGymCheckWorkout.selector.ts
// Selects the Health provider workout that is eligible to enrich Gym Check.

import type { HealthImportedWorkoutSessionMinimal } from "@/src/types/health/cardio/health.types";
import { hasMeaningfulImportedWorkoutMetrics } from "@/src/utils/health/healthWorkout.mapper";

export const GYM_CHECK_PROVIDER_WORKOUT_TYPE = "TraditionalStrengthTraining";
export const GYM_CHECK_PROVIDER_WORKOUT_LABEL = "Traditional Strength Training";

/**
 * Normalizes external workout labels so provider formatting differences such as
 * spaces, underscores, and casing do not affect the exact Gym Check category.
 */
function normalizeProviderWorkoutType(value: string | null | undefined): string {
    if (typeof value !== "string") {
        return "";
    }

    return value.replace(/[^a-z0-9]+/gi, "").toLowerCase();
}

/**
 * Returns true only for Apple's Traditional Strength Training workout type.
 */
export function isGymCheckHealthWorkout(
    session: HealthImportedWorkoutSessionMinimal
): boolean {
    const providerType = session.providerWorkoutType ?? session.type;

    return (
        normalizeProviderWorkoutType(providerType) ===
        normalizeProviderWorkoutType(GYM_CHECK_PROVIDER_WORKOUT_TYPE)
    );
}

function getDurationSeconds(session: HealthImportedWorkoutSessionMinimal): number {
    const duration = session.metrics.durationSeconds;

    return typeof duration === "number" && Number.isFinite(duration) && duration > 0
        ? duration
        : 0;
}

function getMeaningfulMetricCount(session: HealthImportedWorkoutSessionMinimal): number {
    return [
        session.metrics.activeKcal,
        session.metrics.totalKcal,
        session.metrics.avgHr,
        session.metrics.maxHr,
        session.metrics.distanceKm,
        session.metrics.steps,
        session.metrics.elevationGainM,
        session.metrics.paceSecPerKm,
        session.metrics.cadenceRpm,
    ].filter(
        (value) =>
            typeof value === "number" &&
            Number.isFinite(value) &&
            value > 0
    ).length;
}

function getStartTimestamp(session: HealthImportedWorkoutSessionMinimal): number {
    if (!session.startAt) {
        return 0;
    }

    const timestamp = new Date(session.startAt).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * Returns Traditional Strength Training candidates ordered by the strongest
 * Gym Check match: longest duration, most available metrics, then latest start.
 */
export function getGymCheckHealthWorkoutCandidates(
    sessions: HealthImportedWorkoutSessionMinimal[]
): HealthImportedWorkoutSessionMinimal[] {
    return sessions
        .filter(isGymCheckHealthWorkout)
        .sort((left, right) => {
            const durationDifference =
                getDurationSeconds(right) - getDurationSeconds(left);

            if (durationDifference !== 0) {
                return durationDifference;
            }

            const metricDifference =
                getMeaningfulMetricCount(right) - getMeaningfulMetricCount(left);

            if (metricDifference !== 0) {
                return metricDifference;
            }

            return getStartTimestamp(right) - getStartTimestamp(left);
        });
}

/**
 * Picks one eligible Gym Check workout and rejects empty placeholder records.
 */
export function selectGymCheckHealthWorkout(
    sessions: HealthImportedWorkoutSessionMinimal[]
): HealthImportedWorkoutSessionMinimal | null {
    const candidates = getGymCheckHealthWorkoutCandidates(sessions);

    return (
        candidates.find((session) =>
            hasMeaningfulImportedWorkoutMetrics(session.metrics)
        ) ?? null
    );
}
