// /src/hooks/gymCheck/useSyncGymCheckDay.ts
// Converts the local Gym Check draft into the routine metadata patch contract.

import { useMutation } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { syncGymCheckDay } from "@/src/services/workout/gymCheck.service";
import type {
    GymCheckDayPatchBody,
    GymDayState,
} from "@/src/types/gymCheck.types";
import type { WorkoutExerciseSet } from "@/src/types/workoutDay.types";
import type { DayKey } from "@/src/utils/routines/plan";

function stringOrNull(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function numberOrNull(value: unknown): number | null {
    if (value === null || value === undefined) return null;

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function roundedIntOrNull(value: unknown): number | null {
    const parsed = numberOrNull(value);
    return parsed === null ? null : Math.round(parsed);
}

function intOrNull(value: unknown): number | null {
    const parsed = numberOrNull(value);
    return parsed === null ? null : Math.trunc(parsed);
}

function stringArrayOrNull(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;

    const items = value
        .map((item) => String(item).trim())
        .filter(Boolean);

    return items.length > 0 ? items : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePerformedSets(value: unknown): WorkoutExerciseSet[] | null {
    if (!Array.isArray(value)) return null;

    const items: WorkoutExerciseSet[] = [];

    value.forEach((item, index) => {
        if (!isRecord(item)) return;

        items.push({
            setIndex:
                typeof item.setIndex === "number" &&
                    Number.isFinite(item.setIndex) &&
                    item.setIndex > 0
                    ? Math.trunc(item.setIndex)
                    : index + 1,
            reps:
                item.reps === null
                    ? null
                    : typeof item.reps === "number" &&
                        Number.isFinite(item.reps)
                        ? Math.trunc(item.reps)
                        : null,
            weight:
                item.weight === null
                    ? null
                    : typeof item.weight === "number" &&
                        Number.isFinite(item.weight)
                        ? item.weight
                        : null,
            unit: item.unit === "kg" ? "kg" : "lb",
            rpe:
                item.rpe === null
                    ? null
                    : typeof item.rpe === "number" && Number.isFinite(item.rpe)
                        ? item.rpe
                        : null,
            isWarmup: item.isWarmup === true,
            isDropSet: item.isDropSet === true,
            tempo: typeof item.tempo === "string" ? item.tempo : null,
            restSec:
                item.restSec === null
                    ? null
                    : typeof item.restSec === "number" &&
                        Number.isFinite(item.restSec)
                        ? Math.trunc(item.restSec)
                        : null,
            tags: Array.isArray(item.tags)
                ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
                : null,
            meta: isRecord(item.meta) ? item.meta : null,
        });
    });

    if (items.length === 0) return null;

    return items.map((set, index) => ({
        ...set,
        setIndex: index + 1,
    }));
}

/**
 * Converts local string-based Gym Check state into the routine metadata patch.
 * Cardio-only metrics are explicitly cleared because Gym Check is strength-only.
 */
function toPatchPayload(gymDay: GymDayState): GymCheckDayPatchBody {
    const metrics = gymDay.metrics;

    const exercises: NonNullable<GymCheckDayPatchBody["exercises"]> = {};

    for (const [exerciseId, exercise] of Object.entries(gymDay.exercises)) {
        if (!exerciseId) continue;

        exercises[exerciseId] = {
            done: exercise.done,
            notes: stringOrNull(exercise.notes),
            durationMin: numberOrNull(exercise.durationMin),
            mediaPublicIds: stringArrayOrNull(exercise.mediaPublicIds),
            performedSets: normalizePerformedSets(exercise.performedSets),
        };
    }

    return {
        durationMin: numberOrNull(gymDay.durationMin),
        notes: stringOrNull(gymDay.notes),
        metrics: {
            startAt: stringOrNull(metrics.startAt),
            endAt: stringOrNull(metrics.endAt),
            activeKcal: roundedIntOrNull(metrics.activeKcal),
            totalKcal: roundedIntOrNull(metrics.totalKcal),
            totalKcalEstimated: metrics.totalKcalEstimated,
            avgHr: intOrNull(metrics.avgHr),
            maxHr: intOrNull(metrics.maxHr),
            distanceKm: null,
            steps: null,
            elevationGainM: null,
            paceSecPerKm: null,
            cadenceRpm: null,
            effortRpe: numberOrNull(metrics.effortRpe),
            trainingSource: stringOrNull(metrics.trainingSource),
            dayEffortRpe: numberOrNull(metrics.dayEffortRpe),
        },
        exercises,
    };
}

/**
 * The screen controls refetch timing so local edits are not overwritten.
 */
export function useSyncGymCheckDay(weekKey: string) {
    return useMutation<
        unknown,
        ApiAxiosError,
        { routine: unknown; dayKey: DayKey; gymDay: GymDayState }
    >({
        mutationFn: async ({ dayKey, gymDay }) => {
            const payload = toPatchPayload(gymDay);
            return syncGymCheckDay(weekKey, dayKey, payload);
        },
    });
}
