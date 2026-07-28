// /src/utils/gymCheck/sessionPayload.ts
// Builds typed Gym Check session payloads and media attachments.

import type {
    AttachMediaItem,
    CreateSessionBody,
    CreateSessionExerciseInput,
} from "@/src/services/workout/sessions.service";
import type { GymDayState, GymExerciseState } from "@/src/types/gymCheck.types";
import type { WorkoutExerciseSet } from "@/src/types/workoutDay.types";
import type { AttachmentOption } from "@/src/utils/routines/attachments";
import type { DayPlan, ExerciseItem } from "@/src/utils/routines/plan";
import { DAY_KEYS, type DayKey } from "@/src/utils/routines/plan";
import { weekKeyToStartDate } from "@/src/utils/weekKey";
import { addDays, format } from "date-fns";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function toNumberOrNull(value: unknown): number | null {
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

function toRoundedIntOrNull(value: unknown): number | null {
    const parsed = toNumberOrNull(value);
    return parsed === null ? null : Math.round(parsed);
}

function toTruncatedIntOrNull(value: unknown): number | null {
    const parsed = toNumberOrNull(value);
    return parsed === null ? null : Math.trunc(parsed);
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

function getExerciseState(
    gymDay: GymDayState | null | undefined,
    exerciseId: string
): GymExerciseState | null {
    if (!gymDay) return null;
    return gymDay.exercises[exerciseId] ?? null;
}

/**
 * Preserves the original plan and local Gym Check execution metadata for one
 * completed exercise.
 */
function buildExerciseMeta(args: {
    exercise: ExerciseItem;
    exerciseState: GymExerciseState;
}): Record<string, unknown> {
    const { exercise, exerciseState } = args;

    return {
        gymCheck: {
            done: true,
            durationMin: toTruncatedIntOrNull(exerciseState.durationMin),
            mediaPublicIds: toStringArrayOrNull(exerciseState.mediaPublicIds),
            exerciseId: cleanString(exercise.id),
        },
        plan: {
            sets: cleanString(exercise.sets),
            reps: cleanString(exercise.reps),
            load: cleanString(exercise.load),
            rpe: cleanString(exercise.rpe),
            attachmentPublicIds: toStringArrayOrNull(
                exercise.attachmentPublicIds
            ),
        },
    };
}

function buildDoneExercise(args: {
    exercise: ExerciseItem;
    gymDay: GymDayState;
}): CreateSessionExerciseInput | null {
    const { exercise, gymDay } = args;

    const exerciseId = cleanString(exercise.id);
    if (!exerciseId) return null;

    const exerciseState = getExerciseState(gymDay, exerciseId);
    if (!exerciseState?.done) return null;

    return {
        name: cleanString(exercise.name) ?? "Exercise",
        movementId: cleanString(exercise.movementId),
        movementName: cleanString(exercise.movementName),
        notes:
            cleanString(exerciseState.notes) ?? cleanString(exercise.notes),
        sets: normalizePerformedSets(exerciseState.performedSets),
        meta: buildExerciseMeta({ exercise, exerciseState }),
    };
}

function buildDoneExercises(
    plan: DayPlan | null | undefined,
    gymDay: GymDayState
): CreateSessionExerciseInput[] {
    const plannedExercises = Array.isArray(plan?.exercises)
        ? plan.exercises
        : [];

    return plannedExercises.reduce<CreateSessionExerciseInput[]>(
        (accumulator, exercise) => {
            const built = buildDoneExercise({ exercise, gymDay });
            if (built) accumulator.push(built);
            return accumulator;
        },
        []
    );
}

/**
 * Converts a week key and weekday into the corresponding local calendar date.
 */
export function dayKeyToDateIso(
    weekKey: string,
    dayKey: DayKey
): string | null {
    const start = weekKeyToStartDate(weekKey);
    if (!start) return null;

    const dayIndex = DAY_KEYS.indexOf(dayKey);
    if (dayIndex < 0) return null;

    return format(addDays(start, dayIndex), "yyyy-MM-dd");
}

/**
 * Converts the duration form field from minutes to rounded seconds.
 */
export function parseDurationMinutesToSeconds(
    input: unknown
): number | undefined {
    const minutes = toNumberOrNull(input);
    if (minutes === null || minutes <= 0) return undefined;

    return Math.round(minutes) * 60;
}

/**
 * Resolves media selected on completed Gym Check exercises into session media.
 */
export function buildAttachMediaItemsFromGymDay(args: {
    gymDay: GymDayState;
    attachmentByPublicId: Map<string, AttachmentOption>;
}): AttachMediaItem[] {
    const output: AttachMediaItem[] = [];
    const seen = new Set<string>();

    for (const exerciseState of Object.values(args.gymDay.exercises)) {
        if (!exerciseState.done) continue;

        for (const rawPublicId of exerciseState.mediaPublicIds) {
            const publicId = rawPublicId.trim();
            if (!publicId || seen.has(publicId)) continue;

            const attachment = args.attachmentByPublicId.get(publicId);
            if (!attachment) continue;

            const url = cleanString(attachment.url);
            if (!url) continue;

            seen.add(publicId);
            output.push({
                publicId,
                url,
                resourceType:
                    attachment.resourceType === "video" ? "video" : "image",
                format: attachment.format ?? null,
                createdAt: attachment.createdAt ?? null,
                meta: isRecord(attachment.meta) ? attachment.meta : null,
            });
        }
    }

    return output;
}

/**
 * Builds a Gym Check create/update payload. Strength sessions intentionally
 * clear cardio-only fields and preserve whether total calories were estimated.
 */
export function buildGymCheckSessionPayload(args: {
    gymDay: GymDayState;
    plan: DayPlan | null | undefined;
    fallbackType: string;
}): CreateSessionBody | null {
    const { gymDay, plan, fallbackType } = args;

    const exercises = buildDoneExercises(plan, gymDay);
    if (exercises.length === 0) return null;

    const metrics = gymDay.metrics;
    const durationSeconds = parseDurationMinutesToSeconds(
        gymDay.durationMin
    );

    return {
        type: cleanString(plan?.sessionType) ?? fallbackType,
        durationSeconds: durationSeconds ?? null,
        notes: cleanString(gymDay.notes),
        startAt: cleanString(metrics.startAt),
        endAt: cleanString(metrics.endAt),
        activeKcal: toRoundedIntOrNull(metrics.activeKcal),
        totalKcal: toRoundedIntOrNull(metrics.totalKcal),
        avgHr: toTruncatedIntOrNull(metrics.avgHr),
        maxHr: toTruncatedIntOrNull(metrics.maxHr),
        distanceKm: null,
        steps: null,
        elevationGainM: null,
        paceSecPerKm: null,
        cadenceRpm: null,
        effortRpe: toNumberOrNull(metrics.effortRpe),
        exercises,
        meta: {
            sessionKey: "gym_check",
            trainingSource: cleanString(metrics.trainingSource),
            dayEffortRpe: toNumberOrNull(metrics.dayEffortRpe),
            sessionKind: "gym-check",
            totalKcalEstimated: metrics.totalKcalEstimated,
        },
    };
}
