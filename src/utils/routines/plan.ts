// /src/utils/routines/plan.ts
// Strongly typed normalizers for editable and canonical workout routine plans.

import { addDays, format } from "date-fns";

import type {
    DayKey as CanonDayKey,
    WorkoutRoutineDay,
    WorkoutRoutineExercise,
} from "@/src/types/workoutRoutine.types";
import { weekKeyToStartDate } from "@/src/utils/weekKey";

export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

// Compile-time compatibility check between the UI and canonical routine type.
type AssertDayKeyCompatibility =
    CanonDayKey extends DayKey
    ? DayKey extends CanonDayKey
    ? true
    : never
    : never;
const DAY_KEY_TYPES_ARE_COMPATIBLE: AssertDayKeyCompatibility = true;
void DAY_KEY_TYPES_ARE_COMPATIBLE;

const DAY_KEY_SET: ReadonlySet<string> = new Set(DAY_KEYS);

export type ExerciseItem = {
    id: string;
    name: string;
    sets?: string;
    reps?: string;
    rpe?: string;
    load?: string;
    notes?: string;
    attachmentPublicIds?: string[];
    movementId?: string;
    movementName?: string;
};

export type DayPlan = {
    dayKey: DayKey;
    sessionType?: string;
    focus?: string;
    tags?: string[];
    notes?: string;
    exercises?: ExerciseItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDayKey(value: unknown): value is DayKey {
    return typeof value === "string" && DAY_KEY_SET.has(value);
}

function notNull<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

function readOptionalString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return value.filter((item): item is string => typeof item === "string");
}

function makeId(): string {
    const cryptoValue: unknown = Reflect.get(globalThis, "crypto");
    if (isRecord(cryptoValue)) {
        const randomUUID: unknown = cryptoValue.randomUUID;
        if (typeof randomUUID === "function") {
            const result: unknown = Reflect.apply(randomUUID, cryptoValue, []);
            if (typeof result === "string" && result.trim()) return result;
        }
    }

    return `ex_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function cleanUiStrOrUndef(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}

export function normalizePlans(plans: DayPlan[]): DayPlan[] {
    const planByDay = new Map<DayKey, DayPlan>();
    for (const plan of plans) planByDay.set(plan.dayKey, plan);

    return DAY_KEYS.map((dayKey): DayPlan => planByDay.get(dayKey) ?? { dayKey });
}

function normalizeExerciseItem(value: unknown): ExerciseItem | null {
    if (!isRecord(value)) return null;

    const rawId = value.id;
    const id = typeof rawId === "string" && rawId.trim() ? rawId.trim() : makeId();

    return {
        id,
        name: readOptionalString(value.name) ?? "",
        sets: readOptionalString(value.sets),
        reps: readOptionalString(value.reps),
        rpe: readOptionalString(value.rpe),
        load: readOptionalString(value.load),
        notes: readOptionalString(value.notes),
        attachmentPublicIds: readStringArray(value.attachmentPublicIds),
        movementId: cleanUiStrOrUndef(value.movementId),
        movementName: cleanUiStrOrUndef(value.movementName),
    };
}

function normalizeDayPlanFromRecord(
    dayKey: DayKey,
    value: Record<string, unknown>,
): DayPlan {
    const exercises = Array.isArray(value.exercises)
        ? value.exercises.map(normalizeExerciseItem).filter(notNull)
        : undefined;

    const ensuredExercises = exercises?.map((exercise): ExerciseItem => ({
        ...exercise,
        id: exercise.id.trim() ? exercise.id : makeId(),
    }));

    return {
        dayKey,
        sessionType: readOptionalString(value.sessionType),
        focus: readOptionalString(value.focus),
        tags: readStringArray(value.tags),
        notes: readOptionalString(value.notes),
        exercises: ensuredExercises,
    };
}

/**
 * Accepts both persisted shapes:
 * - meta.plan = { Mon: {...}, Tue: {...} }
 * - meta.plan = [{ dayKey: "Mon", ... }, ...]
 */
export function getPlanFromMeta(meta: unknown): DayPlan[] {
    if (!isRecord(meta)) return normalizePlans([]);

    const planRaw = meta.plan;

    if (Array.isArray(planRaw)) {
        const safePlans = planRaw
            .map((value): DayPlan | null => {
                if (!isRecord(value) || !isDayKey(value.dayKey)) return null;
                return normalizeDayPlanFromRecord(value.dayKey, value);
            })
            .filter(notNull);

        return normalizePlans(safePlans);
    }

    if (isRecord(planRaw)) {
        const safePlans = DAY_KEYS.map((dayKey): DayPlan => {
            const value = planRaw[dayKey];
            return isRecord(value)
                ? normalizeDayPlanFromRecord(dayKey, value)
                : { dayKey };
        });

        return normalizePlans(safePlans);
    }

    return normalizePlans([]);
}

/** Writes the normalized array-form meta.plan used by the editor. */
export function setPlanIntoMeta(
    meta: Record<string, unknown> | null | undefined,
    plans: DayPlan[],
): Record<string, unknown> {
    const nextMeta: Record<string, unknown> = { ...(meta ?? {}) };
    const normalized = normalizePlans(plans);

    nextMeta.plan = normalized.map((plan) => ({
        dayKey: plan.dayKey,
        sessionType: plan.sessionType ?? null,
        focus: plan.focus ?? null,
        tags: plan.tags ?? null,
        notes: plan.notes ?? null,
        exercises:
            plan.exercises?.map((exercise) => ({
                id: exercise.id || makeId(),
                name: exercise.name,
                sets: exercise.sets ?? null,
                reps: exercise.reps ?? null,
                rpe: exercise.rpe ?? null,
                load: exercise.load ?? null,
                notes: exercise.notes ?? null,
                attachmentPublicIds: exercise.attachmentPublicIds ?? null,
                movementId: exercise.movementId ?? null,
                movementName: exercise.movementName ?? null,
            })) ?? null,
    }));

    return nextMeta;
}

function parseSetsMaybe(value?: string): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseRpeMaybe(value?: string): number | null {
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    if (parsed < 0) return 0;
    if (parsed > 10) return 10;
    return parsed;
}

function cleanStrOrNull(value?: string): string | null {
    const normalized = (value ?? "").trim();
    return normalized.length > 0 ? normalized : null;
}

function cleanIdsOrNull(ids?: string[]): string[] | null {
    if (!ids) return null;
    const cleaned = ids.map((id) => id.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : null;
}

/** Converts editable plans into the canonical routine.days[] backend contract. */
export function plansToRoutineDays(
    weekKey: string,
    plans: DayPlan[],
): WorkoutRoutineDay[] {
    const start = weekKeyToStartDate(weekKey);
    const normalized = normalizePlans(plans);

    return DAY_KEYS.map((dayKey, index): WorkoutRoutineDay => {
        const plan = normalized.find((item) => item.dayKey === dayKey) ?? { dayKey };
        const date = start ? format(addDays(start, index), "yyyy-MM-dd") : "";

        const exercises: WorkoutRoutineExercise[] | null =
            plan.exercises && plan.exercises.length > 0
                ? plan.exercises
                    .filter((exercise) => exercise.name.trim().length > 0)
                    .map((exercise): WorkoutRoutineExercise => ({
                        id: exercise.id || makeId(),
                        name: exercise.name.trim(),
                        movementId: cleanStrOrNull(exercise.movementId),
                        movementName: cleanStrOrNull(exercise.movementName),
                        sets: parseSetsMaybe(exercise.sets),
                        reps: cleanStrOrNull(exercise.reps),
                        rpe: parseRpeMaybe(exercise.rpe),
                        load: cleanStrOrNull(exercise.load),
                        notes: cleanStrOrNull(exercise.notes),
                        attachmentPublicIds: cleanIdsOrNull(exercise.attachmentPublicIds),
                    }))
                : null;

        return {
            date,
            dayKey,
            sessionType: cleanStrOrNull(plan.sessionType),
            focus: cleanStrOrNull(plan.focus),
            exercises,
            notes: cleanStrOrNull(plan.notes),
            tags: plan.tags && plan.tags.length > 0 ? plan.tags : null,
        };
    });
}
