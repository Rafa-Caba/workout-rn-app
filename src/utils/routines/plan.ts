// src/utils/routines/plan.ts
import type { DayKey as CanonDayKey, WorkoutRoutineDay, WorkoutRoutineExercise } from "@/src/types/workoutRoutine.types";
import { weekKeyToStartDate } from "@/src/utils/weekKey";
import { addDays, format } from "date-fns";

export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

// ✅ Ensure compatibility: your UI DayKey matches canonical DayKey
type _AssertDayKey = CanonDayKey extends DayKey ? true : false;

export type ExerciseItem = {
    id: string;
    name: string;

    sets?: string;
    reps?: string;

    // (planned)
    rpe?: string;

    load?: string;
    notes?: string;

    attachmentPublicIds?: string[];

    // Movement catalog link + snapshot (UI)
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

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

/** Important: arrays are objects too, so we must exclude them. */
function isPlainRecord(v: unknown): v is Record<string, unknown> {
    return isRecord(v) && !Array.isArray(v);
}

function notNull<T>(v: T | null | undefined): v is T {
    return v != null;
}

function makeId(): string {
    // Browser-safe UUID (RN-safe if crypto.randomUUID exists; otherwise fallback)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any;
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
    return `ex_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function cleanUiStrOrUndef(v: unknown): string | undefined {
    if (typeof v !== "string") return undefined;
    const s = v.trim();
    return s.length ? s : undefined;
}

export function normalizePlans(plans: DayPlan[]): DayPlan[] {
    const map = new Map<DayKey, DayPlan>();
    for (const p of plans) map.set(p.dayKey, p);
    return DAY_KEYS.map((k) => map.get(k) ?? ({ dayKey: k } as DayPlan));
}

function normalizeExerciseItem(e: unknown): ExerciseItem | null {
    if (!isPlainRecord(e)) return null;

    const idRaw = (e as any).id;
    const id = typeof idRaw === "string" && idRaw.trim() ? idRaw.trim() : makeId();

    const attachmentPublicIds = Array.isArray((e as any).attachmentPublicIds)
        ? (e as any).attachmentPublicIds.filter((x: unknown) => typeof x === "string")
        : undefined;

    return {
        id,
        name: typeof (e as any).name === "string" ? ((e as any).name as string) : "",

        sets: typeof (e as any).sets === "string" ? ((e as any).sets as string) : undefined,
        reps: typeof (e as any).reps === "string" ? ((e as any).reps as string) : undefined,
        rpe: typeof (e as any).rpe === "string" ? ((e as any).rpe as string) : undefined,

        load: typeof (e as any).load === "string" ? ((e as any).load as string) : undefined,
        notes: typeof (e as any).notes === "string" ? ((e as any).notes as string) : undefined,

        attachmentPublicIds,

        movementId: cleanUiStrOrUndef((e as any).movementId),
        movementName: cleanUiStrOrUndef((e as any).movementName),
    };
}

function normalizeDayPlanFromRecord(dayKey: DayKey, raw: Record<string, unknown>): DayPlan {
    const tags = Array.isArray((raw as any).tags)
        ? (raw as any).tags.filter((t: unknown) => typeof t === "string")
        : undefined;

    const exercises: ExerciseItem[] | undefined = Array.isArray((raw as any).exercises)
        ? (raw as any).exercises.map(normalizeExerciseItem).filter(notNull)
        : undefined;

    const ensuredExercises =
        exercises && exercises.length
            ? exercises.map((ex) => ({
                ...ex,
                id: typeof ex.id === "string" && ex.id.trim() ? ex.id : makeId(),
            }))
            : exercises;

    return {
        dayKey,
        sessionType: typeof (raw as any).sessionType === "string" ? ((raw as any).sessionType as string) : undefined,
        focus: typeof (raw as any).focus === "string" ? ((raw as any).focus as string) : undefined,
        tags,
        notes: typeof (raw as any).notes === "string" ? ((raw as any).notes as string) : undefined,
        exercises: ensuredExercises,
    };
}

/**
 * Accepts BOTH shapes:
 * - meta.plan = { Mon: {...}, Tue: {...} }
 * - meta.plan = [ { dayKey: "Mon", ... }, ... ]
 */
export function getPlanFromMeta(meta: unknown): DayPlan[] {
    if (!isPlainRecord(meta)) return normalizePlans([]);

    const planRaw = (meta as any).plan;

    // 1) Array form
    if (Array.isArray(planRaw)) {
        const safe = planRaw
            .map((p) => {
                if (!isPlainRecord(p)) return null;
                const dayKey = typeof (p as any).dayKey === "string" ? ((p as any).dayKey as string) : "";
                if (!DAY_KEYS.includes(dayKey as any)) return null;
                return normalizeDayPlanFromRecord(dayKey as DayKey, p);
            })
            .filter(notNull);

        return normalizePlans(safe);
    }

    // 2) Object form
    if (isPlainRecord(planRaw)) {
        const safe = DAY_KEYS.map((dayKey) => {
            const raw = (planRaw as any)[dayKey];
            if (!isPlainRecord(raw)) return { dayKey } as DayPlan;
            return normalizeDayPlanFromRecord(dayKey, raw);
        });

        return normalizePlans(safe);
    }

    return normalizePlans([]);
}

/**
 * WRITE array-form meta.plan for frontend editing + stable normalization
 */
export function setPlanIntoMeta(meta: Record<string, unknown> | null | undefined, plans: DayPlan[]): Record<string, unknown> {
    const nextMeta: Record<string, unknown> = { ...(meta ?? {}) };
    const normalized = normalizePlans(plans);

    nextMeta.plan = normalized.map((p) => ({
        dayKey: p.dayKey,
        sessionType: p.sessionType ?? null,
        focus: p.focus ?? null,
        tags: p.tags ?? null,
        notes: p.notes ?? null,
        exercises:
            p.exercises?.map((e) => ({
                id: e.id || makeId(),
                name: e.name,
                sets: e.sets ?? null,
                reps: e.reps ?? null,
                rpe: e.rpe ?? null,
                load: e.load ?? null,
                notes: e.notes ?? null,
                attachmentPublicIds: e.attachmentPublicIds ?? null,

                movementId: e.movementId ?? null,
                movementName: e.movementName ?? null,
            })) ?? null,
    }));

    return nextMeta;
}

/**
 * =========================================================
 * CANONICAL planned routine storage: routine.days[]
 * =========================================================
 */

function parseSetsMaybe(v?: string): number | null {
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function parseRpeMaybe(v?: string): number | null {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    // keep within 0..10 (model bounds)
    if (n < 0) return 0;
    if (n > 10) return 10;
    return n;
}

function cleanStrOrNull(v?: string): string | null {
    const s = (v ?? "").trim();
    return s.length ? s : null;
}

function cleanIdsOrNull(ids?: string[]): string[] | null {
    if (!ids || !Array.isArray(ids)) return null;
    const cleaned = ids.map((x) => String(x).trim()).filter(Boolean);
    return cleaned.length ? cleaned : null;
}

export function plansToRoutineDays(weekKey: string, plans: DayPlan[]): WorkoutRoutineDay[] {
    const start = weekKeyToStartDate(weekKey);
    const normalized = normalizePlans(plans);

    return DAY_KEYS.map((dayKey, idx) => {
        const p = normalized.find((x) => x.dayKey === dayKey) ?? ({ dayKey } as DayPlan);

        const dateStr = start ? format(addDays(start, idx), "yyyy-MM-dd") : "";

        const exercises: WorkoutRoutineExercise[] | null =
            p.exercises && p.exercises.length > 0
                ? p.exercises
                    .filter((e) => (e.name ?? "").trim().length > 0)
                    .map((e) => ({
                        id: e.id || makeId(),
                        name: (e.name ?? "").trim(),

                        movementId: cleanStrOrNull(e.movementId),
                        movementName: cleanStrOrNull(e.movementName),

                        sets: parseSetsMaybe(e.sets),
                        reps: cleanStrOrNull(e.reps),
                        rpe: parseRpeMaybe(e.rpe),
                        load: cleanStrOrNull(e.load),
                        notes: cleanStrOrNull(e.notes),
                        attachmentPublicIds: cleanIdsOrNull(e.attachmentPublicIds),
                    }))
                : null;

        return {
            date: dateStr,
            dayKey,
            sessionType: cleanStrOrNull(p.sessionType),
            focus: cleanStrOrNull(p.focus),
            exercises,
            notes: cleanStrOrNull(p.notes),
            tags: p.tags && p.tags.length > 0 ? p.tags : null,
        };
    });
}