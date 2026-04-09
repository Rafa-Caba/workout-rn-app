import type { AttachMediaItem, CreateSessionBody, CreateSessionExerciseInput } from "@/src/services/workout/sessions.service";
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

function toIntOrNull(value: unknown): number | null {
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

function getExerciseState(
    gymDay: GymDayState | null | undefined,
    exerciseId: string
): GymExerciseState | null {
    if (!gymDay) return null;
    return gymDay.exercises[exerciseId] ?? null;
}

function buildExerciseMeta(args: {
    exercise: ExerciseItem;
    exerciseState: GymExerciseState;
}): Record<string, unknown> | null {
    const { exercise, exerciseState } = args;

    const plannedSets = cleanString(exercise.sets) ?? null;
    const plannedReps = cleanString(exercise.reps) ?? null;
    const plannedLoad = cleanString(exercise.load) ?? null;
    const plannedRpe = cleanString(exercise.rpe) ?? null;
    const plannedAttachmentPublicIds = toStringArrayOrNull(exercise.attachmentPublicIds);
    const mediaPublicIds = toStringArrayOrNull(exerciseState.mediaPublicIds);
    const durationMin = toIntOrNull(exerciseState.durationMin);
    const exerciseId = cleanString((exercise as { id?: string }).id);

    return {
        gymCheck: {
            done: true,
            durationMin,
            mediaPublicIds,
            exerciseId,
        },
        plan: {
            sets: plannedSets,
            reps: plannedReps,
            load: plannedLoad,
            rpe: plannedRpe,
            attachmentPublicIds: plannedAttachmentPublicIds,
        },
    };
}

function buildDoneExercise(args: {
    exercise: ExerciseItem;
    gymDay: GymDayState;
}): CreateSessionExerciseInput | null {
    const { exercise, gymDay } = args;

    const exerciseId = typeof exercise.id === "string" ? exercise.id.trim() : "";
    if (!exerciseId) return null;

    const exerciseState = getExerciseState(gymDay, exerciseId);
    if (!exerciseState?.done) return null;

    const notes = cleanString(exerciseState.notes) ?? cleanString(exercise.notes) ?? null;
    const performedSets = normalizePerformedSets(exerciseState.performedSets);

    return {
        name: cleanString(exercise.name) ?? "Exercise",
        movementId: cleanString(exercise.movementId) ?? null,
        movementName: cleanString(exercise.movementName) ?? null,
        notes,
        sets: performedSets,
        meta: buildExerciseMeta({ exercise, exerciseState }),
    };
}

function buildDoneExercises(
    plan: DayPlan | null | undefined,
    gymDay: GymDayState
): CreateSessionExerciseInput[] {
    const plannedExercises = Array.isArray(plan?.exercises) ? plan.exercises : [];

    return plannedExercises.reduce<CreateSessionExerciseInput[]>((acc, exercise) => {
        const built = buildDoneExercise({ exercise, gymDay });
        if (built) {
            acc.push(built);
        }
        return acc;
    }, []);
}

export function dayKeyToDateIso(weekKey: string, dayKey: DayKey): string | null {
    const start = weekKeyToStartDate(weekKey);
    if (!start) return null;
    const idx = DAY_KEYS.indexOf(dayKey);
    if (idx < 0) return null;
    return format(addDays(start, idx), "yyyy-MM-dd");
}

export function parseDurationMinutesToSeconds(input: unknown): number | undefined {
    const minutes = toNumberOrNull(input);
    if (minutes === null || minutes <= 0) return undefined;

    return Math.round(minutes) * 60;
}

export function buildAttachMediaItemsFromGymDay(args: {
    gymDay: GymDayState;
    attachmentByPublicId: Map<string, AttachmentOption>;
}): AttachMediaItem[] {
    const out: AttachMediaItem[] = [];
    const seen = new Set<string>();

    const exMap = args.gymDay?.exercises ?? {};

    for (const exState of Object.values(exMap)) {
        const done = Boolean(exState?.done);
        if (!done) continue;

        const ids = exState?.mediaPublicIds;
        if (!Array.isArray(ids) || ids.length === 0) continue;

        for (const pid of ids) {
            if (typeof pid !== "string" || !pid.trim()) continue;
            const publicId = pid.trim();
            if (seen.has(publicId)) continue;

            const opt = args.attachmentByPublicId.get(publicId);
            if (!opt) continue;

            const url = typeof opt.url === "string" ? opt.url.trim() : "";
            if (!url) continue;

            seen.add(publicId);

            out.push({
                publicId,
                url,
                resourceType: opt.resourceType === "video" ? "video" : "image",
                format: opt.format ?? null,
                createdAt: opt.createdAt ?? null,
                meta: isRecord(opt.meta) ? opt.meta : null,
            });
        }
    }

    return out;
}

export function buildGymCheckSessionPayload(args: {
    gymDay: GymDayState;
    plan: DayPlan | null | undefined;
    fallbackType: string;
}): CreateSessionBody | null {
    const { gymDay, plan, fallbackType } = args;

    const exercises = buildDoneExercises(plan, gymDay);
    if (exercises.length === 0) return null;

    const metrics = gymDay.metrics ?? {};
    const durationSeconds = parseDurationMinutesToSeconds(gymDay.durationMin);

    return {
        type: cleanString(plan?.sessionType) ?? fallbackType,
        durationSeconds: typeof durationSeconds === "number" ? durationSeconds : null,
        notes: cleanString(gymDay.notes) ?? null,
        startAt: cleanString(metrics.startAt) ?? null,
        endAt: cleanString(metrics.endAt) ?? null,
        activeKcal: toNumberOrNull(metrics.activeKcal),
        totalKcal: toNumberOrNull(metrics.totalKcal),
        avgHr: toIntOrNull(metrics.avgHr),
        maxHr: toIntOrNull(metrics.maxHr),
        distanceKm: toNumberOrNull(metrics.distanceKm),
        steps: toIntOrNull(metrics.steps),
        elevationGainM: toNumberOrNull(metrics.elevationGainM),
        paceSecPerKm: toIntOrNull(metrics.paceSecPerKm),
        cadenceRpm: toIntOrNull(metrics.cadenceRpm),
        effortRpe: toNumberOrNull(metrics.effortRpe),
        exercises,
        meta: {
            sessionKey: "gym_check",
            trainingSource: cleanString(metrics.trainingSource) ?? null,
            dayEffortRpe: toNumberOrNull(metrics.dayEffortRpe),
            sessionKind: "gym-check",
        },
    };
}