// /src/types/gymCheck.types.ts
// Strongly typed Gym Check local state and API patch contracts.

import type { WorkoutExerciseSet } from "@/src/types/workoutDay.types";
import type { DayKey } from "@/src/utils/routines/plan";

// -------------------- UI State Types (inputs as strings) --------------------

export type GymExerciseState = {
    done: boolean;
    notes?: string;
    durationMin?: string;
    mediaPublicIds: string[];
    performedSets: WorkoutExerciseSet[];
};

/**
 * Gym Check only keeps strength-session metrics.
 * Cardio-only metrics such as distance, steps, elevation, pace, and cadence
 * are intentionally excluded from the local form state.
 */
export type GymDayMetricsState = {
    startAt: string;
    endAt: string;

    activeKcal: string;
    totalKcal: string;
    totalKcalEstimated: boolean;

    avgHr: string;
    maxHr: string;

    effortRpe: string;

    trainingSource: string;
    dayEffortRpe: string;
};

export type GymDayState = {
    durationMin: string;
    notes: string;
    metrics: GymDayMetricsState;
    exercises: Record<string, GymExerciseState>;
};

export type GymWeekState = {
    version: 5;
    weekKey: string;
    days: Record<DayKey, GymDayState>;
    updatedAt: string;
};

// -------------------- API Patch Types (what BE expects) --------------------

export type GymCheckExercisePatch = {
    done?: boolean | null;
    notes?: string | null;
    durationMin?: number | null;
    mediaPublicIds?: string[] | null;
    performedSets?: WorkoutExerciseSet[] | null;
};

export type GymCheckMetricsPatch = {
    startAt?: string | null;
    endAt?: string | null;

    activeKcal?: number | null;
    totalKcal?: number | null;
    totalKcalEstimated?: boolean | null;

    avgHr?: number | null;
    maxHr?: number | null;

    /**
     * Cardio-only fields remain in the API patch contract so Gym Check can
     * explicitly clear legacy values while no longer exposing form inputs.
     */
    distanceKm?: number | null;
    steps?: number | null;
    elevationGainM?: number | null;
    paceSecPerKm?: number | null;
    cadenceRpm?: number | null;

    effortRpe?: number | null;

    trainingSource?: string | null;
    dayEffortRpe?: number | null;
};

export type GymCheckDayPatchBody = {
    durationMin?: number | null;
    notes?: string | null;
    metrics?: GymCheckMetricsPatch | null;
    exercises?: Record<string, GymCheckExercisePatch> | null;
};
