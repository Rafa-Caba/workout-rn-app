// /src/utils/health/healthWorkoutDiagnostics.mapper.ts
// Converts imported workout sessions into bounded local diagnostic samples.

import { toHealthDiagnosticJson } from "@/src/services/health/diagnostics/healthDiagnostics.service";
import type { HealthImportedWorkoutSessionMinimal } from "@/src/types/health/cardio/health.types";
import type { HealthWorkoutDiagnosticSample } from "@/src/types/health/healthDiagnostics.types";
import { isGymCheckHealthWorkout } from "@/src/utils/health/healthGymCheckWorkout.selector";
import { hasMeaningfulImportedWorkoutMetrics } from "@/src/utils/health/healthWorkout.mapper";

/**
 * Builds a JSON-safe diagnostic projection without persisting the native raw
 * object directly in the WorkoutDay document.
 */
export function toHealthWorkoutDiagnosticSample(
    workout: HealthImportedWorkoutSessionMinimal
): HealthWorkoutDiagnosticSample {
    return {
        externalId: workout.externalId ?? null,
        type: workout.type,
        providerWorkoutType: workout.providerWorkoutType ?? null,
        startAt: workout.startAt,
        endAt: workout.endAt,
        sourceDevice: workout.sourceDevice,
        eligibleForGymCheck: isGymCheckHealthWorkout(workout),
        hasMeaningfulMetrics: hasMeaningfulImportedWorkoutMetrics(workout.metrics),
        metrics: {
            durationSeconds: workout.metrics.durationSeconds,
            activeKcal: workout.metrics.activeKcal,
            totalKcal: workout.metrics.totalKcal,
            totalKcalEstimated: workout.metrics.totalKcalEstimated === true,
            avgHr: workout.metrics.avgHr,
            maxHr: workout.metrics.maxHr,
            distanceKm: workout.metrics.distanceKm,
            steps: workout.metrics.steps,
            elevationGainM: workout.metrics.elevationGainM,
            paceSecPerKm: workout.metrics.paceSecPerKm,
            cadenceRpm: workout.metrics.cadenceRpm,
        },
        raw: toHealthDiagnosticJson(workout.raw),
    };
}
