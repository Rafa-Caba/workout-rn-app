// /src/utils/gymCheck/buildGymCheckSession.ts
// Rebuilds a Gym Check session payload from routine metadata.

import type { CreateSessionBody } from "@/src/services/workout/sessions.service";
import type {
    GymDayMetricsState,
    GymDayState,
    GymExerciseState,
} from "@/src/types/gymCheck.types";
import type { WorkoutExerciseSet } from "@/src/types/workoutDay.types";
import type { DayKey } from "@/src/utils/routines/plan";
import { DAY_KEYS, getPlanFromMeta } from "@/src/utils/routines/plan";
import { buildGymCheckSessionPayload } from "./sessionPayload";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toInputString(value: unknown): string {
    if (typeof value === "string") return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return "";
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item).trim()).filter(Boolean);
}

function parseWorkoutSet(value: unknown, fallbackIndex: number): WorkoutExerciseSet | null {
    if (!isRecord(value)) return null;

    const setIndex =
        typeof value.setIndex === "number" &&
            Number.isFinite(value.setIndex) &&
            value.setIndex > 0
            ? Math.trunc(value.setIndex)
            : fallbackIndex;

    return {
        setIndex,
        reps:
            value.reps === null
                ? null
                : typeof value.reps === "number" && Number.isFinite(value.reps)
                    ? Math.trunc(value.reps)
                    : null,
        weight:
            value.weight === null
                ? null
                : typeof value.weight === "number" && Number.isFinite(value.weight)
                    ? value.weight
                    : null,
        unit: value.unit === "kg" ? "kg" : "lb",
        rpe:
            value.rpe === null
                ? null
                : typeof value.rpe === "number" && Number.isFinite(value.rpe)
                    ? value.rpe
                    : null,
        isWarmup: value.isWarmup === true,
        isDropSet: value.isDropSet === true,
        tempo: typeof value.tempo === "string" ? value.tempo : null,
        restSec:
            value.restSec === null
                ? null
                : typeof value.restSec === "number" && Number.isFinite(value.restSec)
                    ? Math.trunc(value.restSec)
                    : null,
        tags: Array.isArray(value.tags)
            ? value.tags.map((item) => String(item).trim()).filter(Boolean)
            : null,
        meta: isRecord(value.meta) ? value.meta : null,
    };
}

function parseWorkoutSets(value: unknown): WorkoutExerciseSet[] {
    if (!Array.isArray(value)) return [];

    const parsed = value.reduce<WorkoutExerciseSet[]>((accumulator, item, index) => {
        const set = parseWorkoutSet(item, index + 1);
        if (set) accumulator.push(set);
        return accumulator;
    }, []);

    return parsed.map((set, index) => ({
        ...set,
        setIndex: index + 1,
    }));
}

function getRoutineMeta(routine: unknown): JsonRecord | null {
    if (!isRecord(routine)) return null;
    return isRecord(routine.meta) ? routine.meta : null;
}

function parseExerciseState(value: unknown): GymExerciseState {
    const exercise = isRecord(value) ? value : {};

    return {
        done: exercise.done === true,
        ...(typeof exercise.notes === "string"
            ? { notes: exercise.notes }
            : {}),
        ...(typeof exercise.durationMin === "number"
            ? { durationMin: String(exercise.durationMin) }
            : typeof exercise.durationMin === "string"
                ? { durationMin: exercise.durationMin }
                : {}),
        mediaPublicIds: toStringArray(exercise.mediaPublicIds),
        performedSets: parseWorkoutSets(exercise.performedSets),
    };
}

function parseMetrics(value: unknown): GymDayMetricsState {
    const metrics = isRecord(value) ? value : {};

    return {
        startAt: typeof metrics.startAt === "string" ? metrics.startAt : "",
        endAt: typeof metrics.endAt === "string" ? metrics.endAt : "",
        activeKcal: toInputString(metrics.activeKcal),
        totalKcal: toInputString(metrics.totalKcal),
        totalKcalEstimated: metrics.totalKcalEstimated === true,
        avgHr: toInputString(metrics.avgHr),
        maxHr: toInputString(metrics.maxHr),
        effortRpe: toInputString(metrics.effortRpe),
        trainingSource:
            typeof metrics.trainingSource === "string"
                ? metrics.trainingSource
                : "",
        dayEffortRpe: toInputString(metrics.dayEffortRpe),
    };
}

/**
 * Reads one day of Gym Check metadata from the routine document.
 */
function getGymCheckDay(
    meta: JsonRecord | null,
    dayKey: DayKey
): GymDayState | null {
    if (!meta || !isRecord(meta.gymCheck)) return null;

    const day = meta.gymCheck[dayKey];
    if (!isRecord(day)) return null;

    const exercisesRaw = isRecord(day.exercises) ? day.exercises : {};
    const exercises: Record<string, GymExerciseState> = {};

    for (const [exerciseId, rawExercise] of Object.entries(exercisesRaw)) {
        if (!exerciseId) continue;
        exercises[exerciseId] = parseExerciseState(rawExercise);
    }

    return {
        durationMin: toInputString(day.durationMin),
        notes: typeof day.notes === "string" ? day.notes : "",
        metrics: parseMetrics(day.metrics),
        exercises,
    };
}

export type CreateWorkoutSessionBody = CreateSessionBody;

/**
 * Builds a create/update body using only exercises marked as completed.
 */
export function buildGymCheckSessionFromRoutine(args: {
    routine: unknown;
    weekKey: string;
    dayKey: DayKey;
    includeOnlyDone: true;
}):
    | { ok: true; body: CreateWorkoutSessionBody }
    | { ok: false; reason: string } {
    const { routine, dayKey } = args;

    if (!DAY_KEYS.includes(dayKey)) {
        return { ok: false, reason: "Invalid dayKey." };
    }

    const meta = getRoutineMeta(routine);
    const plans = getPlanFromMeta(meta);
    const plan = plans.find((item) => item.dayKey === dayKey) ?? null;

    const gymDay = getGymCheckDay(meta, dayKey);
    if (!gymDay) {
        return {
            ok: false,
            reason: "No Gym Check data found for this day.",
        };
    }

    const body = buildGymCheckSessionPayload({
        gymDay,
        plan,
        fallbackType: "Gym Check",
    });

    if (!body) {
        return {
            ok: false,
            reason: "No done exercises found in Gym Check for this day.",
        };
    }

    return { ok: true, body };
}
