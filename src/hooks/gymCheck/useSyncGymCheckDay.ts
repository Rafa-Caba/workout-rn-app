import { useMutation } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { syncGymCheckDay } from "@/src/services/workout/gymCheck.service";
import type { GymCheckDayPatchBody } from "@/src/types/gymCheck.types";
import type { WorkoutExerciseSet } from "@/src/types/workoutDay.types";
import type { DayKey } from "@/src/utils/routines/plan";

type GymExerciseState = {
    done: boolean;
    notes?: string;
    durationMin?: string;
    mediaPublicIds: string[];
    performedSets?: WorkoutExerciseSet[];
};

type GymDayMetricsState = {
    startAt: string; // ISO datetime or ""
    endAt: string; // ISO datetime or ""
    activeKcal: string;
    totalKcal: string;
    avgHr: string;
    maxHr: string;
    distanceKm: string;
    steps: string;
    elevationGainM: string;
    paceSecPerKm: string;
    cadenceRpm: string;
    effortRpe: string;

    trainingSource: string;
    dayEffortRpe: string;
};

type GymDayState = {
    durationMin: string;
    notes: string;
    metrics: GymDayMetricsState;
    exercises: Record<string, GymExerciseState>;
};

// ---------- helpers ----------
function strOrNull(v: unknown): string | null {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s.length ? s : null;
}

function isoOrNull(v: unknown): string | null {
    // "" -> null, otherwise string trimmed.
    return strOrNull(v);
}

function numOrNull(v: unknown): number | null {
    if (v === null || v === undefined) return null;

    if (typeof v === "number") {
        return Number.isFinite(v) ? v : null;
    }

    if (typeof v !== "string") return null;
    const s = v.trim();
    if (!s) return null;

    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return n;
}

function intOrNull(v: unknown): number | null {
    const n = numOrNull(v);
    if (n === null) return null;
    return Math.trunc(n);
}

function arrayOrNull(v: unknown): string[] | null {
    if (!Array.isArray(v)) return null;
    const out = v.map((x) => String(x).trim()).filter(Boolean);
    return out.length ? out : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizePerformedSets(value: unknown): WorkoutExerciseSet[] | null {
    if (!Array.isArray(value)) return null;

    const items: WorkoutExerciseSet[] = [];

    value.forEach((item, index) => {
        if (!isRecord(item)) return;

        items.push({
            setIndex:
                typeof item.setIndex === "number" && Number.isFinite(item.setIndex) && item.setIndex > 0
                    ? Math.trunc(item.setIndex)
                    : index + 1,
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
                    : typeof item.restSec === "number" && Number.isFinite(item.restSec)
                        ? Math.trunc(item.restSec)
                        : null,
            tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim()).filter(Boolean) : null,
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
 * Convert local GymDayState (string-based inputs) into BE patch payload.
 */
function toPatchPayload(gymDay: GymDayState): GymCheckDayPatchBody {
    const durationMin = numOrNull(gymDay.durationMin);
    const notes = strOrNull(gymDay.notes);

    const m = gymDay.metrics ?? ({} as GymDayMetricsState);

    const metrics = {
        startAt: isoOrNull(m.startAt),
        endAt: isoOrNull(m.endAt),

        activeKcal: numOrNull(m.activeKcal),
        totalKcal: numOrNull(m.totalKcal),

        avgHr: intOrNull(m.avgHr),
        maxHr: intOrNull(m.maxHr),

        distanceKm: numOrNull(m.distanceKm),
        steps: intOrNull(m.steps),
        elevationGainM: numOrNull(m.elevationGainM),

        paceSecPerKm: intOrNull(m.paceSecPerKm),
        cadenceRpm: intOrNull(m.cadenceRpm),

        effortRpe: numOrNull(m.effortRpe),

        trainingSource: strOrNull(m.trainingSource),
        dayEffortRpe: numOrNull(m.dayEffortRpe),
    };

    const exercises: Record<
        string,
        {
            done?: boolean | null;
            notes?: string | null;
            durationMin?: number | null;
            mediaPublicIds?: string[] | null;
            performedSets?: WorkoutExerciseSet[] | null;
        }
    > = {};

    for (const [exerciseId, ex] of Object.entries(gymDay.exercises ?? {})) {
        if (!exerciseId) continue;

        exercises[exerciseId] = {
            done: typeof ex.done === "boolean" ? ex.done : null,
            notes: strOrNull(ex.notes),
            durationMin: numOrNull(ex.durationMin),
            mediaPublicIds: arrayOrNull(ex.mediaPublicIds) ?? null,
            performedSets: normalizePerformedSets(ex.performedSets),
        };
    }

    return {
        durationMin,
        notes,
        metrics,
        exercises,
    };
}

/**
 * IMPORTANT UX RULE:
 * - This mutation must NOT invalidate/refetch routineWeek automatically.
 * - The page decides when to refetch (only on explicit Save / Create Session).
 */
export function useSyncGymCheckDay(weekKey: string) {
    return useMutation<unknown, ApiAxiosError, { routine: unknown; dayKey: DayKey; gymDay: GymDayState }>({
        mutationFn: async ({ dayKey, gymDay }) => {
            const payload = toPatchPayload(gymDay);
            return syncGymCheckDay(weekKey, dayKey, payload);
        },
    });
}