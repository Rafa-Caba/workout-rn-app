// /src/services/workout/gymCheck.service.ts
// Normalizes and synchronizes Gym Check day state with the routine backend.

import { api } from "@/src/services/http.client";
import type {
    GymCheckDayPatchBody,
    GymCheckExercisePatch,
    GymCheckMetricsPatch,
    GymDayState,
} from "@/src/types/gymCheck.types";
import type { WorkoutExerciseSet } from "@/src/types/workoutDay.types";
import type { DayKey, WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";

/**
 * Supports two caller styles:
 * 1. GymDayState with string-based form inputs.
 * 2. A normalized API patch with numbers and null values.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumberOrNull(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== "string") return null;

    const normalized = value.trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function toRoundedIntOrNull(value: unknown): number | null {
    const parsed = toNumberOrNull(value);
    return parsed === null ? null : Math.round(parsed);
}

function toTruncatedIntOrNull(value: unknown): number | null {
    const parsed = toNumberOrNull(value);
    return parsed === null ? null : Math.trunc(parsed);
}

function toStringOrNull(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function toStringArrayOrNull(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;

    const items = value
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0);

    return items.length > 0 ? items : null;
}

function normalizePerformedSets(value: unknown): WorkoutExerciseSet[] | null {
    if (!Array.isArray(value)) return null;

    const items: WorkoutExerciseSet[] = [];

    value.forEach((item, index) => {
        if (!isPlainObject(item)) return;

        const setIndex =
            typeof item.setIndex === "number" &&
                Number.isFinite(item.setIndex) &&
                item.setIndex > 0
                ? Math.trunc(item.setIndex)
                : index + 1;

        const unit = item.unit === "kg" ? "kg" : "lb";

        items.push({
            setIndex,
            reps:
                item.reps === null
                    ? null
                    : typeof item.reps === "number" && Number.isFinite(item.reps)
                        ? Math.trunc(item.reps)
                        : null,
            weight:
                item.weight === null
                    ? null
                    : typeof item.weight === "number" && Number.isFinite(item.weight)
                        ? item.weight
                        : null,
            unit,
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
                    : typeof item.restSec === "number" && Number.isFinite(item.restSec)
                        ? Math.trunc(item.restSec)
                        : null,
            tags: Array.isArray(item.tags)
                ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
                : null,
            meta: isPlainObject(item.meta) ? item.meta : null,
        });
    });

    if (items.length === 0) return null;

    return items.map((item, index) => ({
        ...item,
        setIndex: index + 1,
    }));
}

/**
 * Determines whether the caller already supplied a normalized API patch.
 */
function looksLikeCleanPatch(input: unknown): input is GymCheckDayPatchBody {
    if (!isPlainObject(input)) return false;

    const hasMetrics = "metrics" in input;
    const durationMin = input.durationMin;
    const hasNormalizedDuration =
        typeof durationMin === "number" || durationMin === null;

    return hasMetrics || hasNormalizedDuration;
}

/**
 * Converts local Gym Check form state into the backend patch contract.
 * Cardio-only fields are explicitly cleared so legacy data cannot remain
 * attached to a strength session.
 */
function buildPatchFromGymDayState(gymDay: GymDayState): GymCheckDayPatchBody {
    const exercises: Record<string, GymCheckExercisePatch> = {};

    for (const [exerciseId, state] of Object.entries(gymDay.exercises)) {
        if (!exerciseId) continue;

        exercises[exerciseId] = {
            done: state.done,
            notes: toStringOrNull(state.notes),
            durationMin: toNumberOrNull(state.durationMin),
            mediaPublicIds: toStringArrayOrNull(state.mediaPublicIds),
            performedSets: normalizePerformedSets(state.performedSets),
        };
    }

    const metricsState = gymDay.metrics;
    const metrics: GymCheckMetricsPatch = {
        startAt: toStringOrNull(metricsState.startAt),
        endAt: toStringOrNull(metricsState.endAt),

        activeKcal: toRoundedIntOrNull(metricsState.activeKcal),
        totalKcal: toRoundedIntOrNull(metricsState.totalKcal),
        totalKcalEstimated: metricsState.totalKcalEstimated,

        avgHr: toTruncatedIntOrNull(metricsState.avgHr),
        maxHr: toTruncatedIntOrNull(metricsState.maxHr),

        distanceKm: null,
        steps: null,
        elevationGainM: null,
        paceSecPerKm: null,
        cadenceRpm: null,

        effortRpe: toNumberOrNull(metricsState.effortRpe),
        trainingSource: toStringOrNull(metricsState.trainingSource),
        dayEffortRpe: toNumberOrNull(metricsState.dayEffortRpe),
    };

    return {
        durationMin: toNumberOrNull(gymDay.durationMin),
        notes: toStringOrNull(gymDay.notes),
        metrics,
        exercises,
    };
}

/**
 * Persists one Gym Check day inside the workout routine metadata.
 */
export async function syncGymCheckDay(
    weekKey: string,
    dayKey: DayKey,
    input: GymDayState | GymCheckDayPatchBody
): Promise<WorkoutRoutineWeek> {
    const payload = looksLikeCleanPatch(input)
        ? input
        : buildPatchFromGymDayState(input);

    const response = await api.patch<WorkoutRoutineWeek>(
        `/workout/routines/weeks/${encodeURIComponent(weekKey)}/gym-check/${encodeURIComponent(dayKey)}`,
        payload
    );

    return response.data;
}
