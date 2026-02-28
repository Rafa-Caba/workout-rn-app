import type { WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";
import type { DayKey, DayPlan, ExerciseItem } from "@/src/utils/routines/plan";
import { DAY_KEYS, getPlanFromMeta } from "@/src/utils/routines/plan";

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function cleanStrOrNull(v: unknown): string | null {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s.length ? s : null;
}

function toIntOrNull(v: unknown): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

function getRoutineMeta(routine: unknown): AnyRecord | null {
    if (!isRecord(routine)) return null;
    const meta = (routine as any).meta;
    return isRecord(meta) ? meta : null;
}

function getGymCheckDay(meta: AnyRecord | null, dayKey: DayKey): AnyRecord | null {
    if (!meta) return null;
    const gc = (meta as any).gymCheck;
    if (!isRecord(gc)) return null;
    const day = (gc as any)[dayKey];
    return isRecord(day) ? day : null;
}

function getGymCheckExercisesMap(gymDay: AnyRecord | null): Record<string, AnyRecord> {
    if (!gymDay) return {};
    const ex = (gymDay as any).exercises;
    if (!isRecord(ex)) return {};
    const out: Record<string, AnyRecord> = {};
    for (const [k, v] of Object.entries(ex)) {
        if (isRecord(v)) out[k] = v;
    }
    return out;
}

export type CreateWorkoutSessionExercise = {
    name: string;
    sets: number | null;
    reps: string | null;
    load: string | null;
    notes: string | null;
    mediaPublicIds: string[] | null;
};

export type CreateWorkoutSessionBody = {
    type: string; // session type shown in Days + PVA actual
    durationSeconds: number | null;
    notes: string | null;
    exercises: CreateWorkoutSessionExercise[]; // ONLY done exercises
    meta: {
        source: "gymCheck";
        weekKey: string;
        dayKey: DayKey;
        routineWeekKey: string;
    };
};

export function buildGymCheckSessionFromRoutine(args: {
    routine: unknown;
    weekKey: string;
    dayKey: DayKey;
    includeOnlyDone: true; // locked for now
}): { ok: true; body: CreateWorkoutSessionBody } | { ok: false; reason: string } {
    const { routine, weekKey, dayKey } = args;

    if (!DAY_KEYS.includes(dayKey)) return { ok: false, reason: "Invalid dayKey." };

    const meta = getRoutineMeta(routine);
    const plans: DayPlan[] = getPlanFromMeta(meta);
    const plan = plans.find((p) => p.dayKey === dayKey) ?? ({ dayKey } as DayPlan);

    // Prefer meta.plan (web editor shape). If missing/empty, fallback to routine.days[] (canonical).
    const plannedExercisesFromMeta: ExerciseItem[] = Array.isArray(plan.exercises) ? plan.exercises : [];

    const plannedExercisesFromDays: ExerciseItem[] = (() => {
        if (!isRecord(routine)) return [];
        const r = routine as WorkoutRoutineWeek;

        const days = Array.isArray((r as any).days) ? ((r as any).days as any[]) : [];
        const day = days.find((d) => String(d?.dayKey ?? "") === dayKey) ?? null;
        const ex = Array.isArray(day?.exercises) ? (day.exercises as any[]) : [];

        return ex
            .map((e) => {
                const id = String(e?.id ?? "").trim();
                if (!id) return null;

                return {
                    id,
                    name: String(e?.name ?? "").trim(),
                    sets: e?.sets != null ? String(e.sets) : undefined,
                    reps: typeof e?.reps === "string" ? e.reps : e?.reps != null ? String(e.reps) : undefined,
                    load: typeof e?.load === "string" ? e.load : e?.load != null ? String(e.load) : undefined,
                    notes: typeof e?.notes === "string" ? e.notes : undefined,
                } as ExerciseItem;
            })
            .filter((x): x is ExerciseItem => Boolean(x));
    })();

    const plannedExercises: ExerciseItem[] = plannedExercisesFromMeta.length ? plannedExercisesFromMeta : plannedExercisesFromDays;

    const gymDay = getGymCheckDay(meta, dayKey);
    const gymExercises = getGymCheckExercisesMap(gymDay);

    const durationMin = toIntOrNull((gymDay as any)?.durationMin);
    const dayNotes = cleanStrOrNull((gymDay as any)?.notes);

    const plannedById = new Map<string, ExerciseItem>();
    for (const ex of plannedExercises) {
        const id = typeof ex?.id === "string" ? ex.id.trim() : "";
        if (!id) continue;
        plannedById.set(id, ex);
    }

    // IMPORTANT:
    // Do NOT depend on plannedExercises to find "done" items.
    // If meta.plan is missing/outdated, Gym Check can still have done exercises.
    const doneExercises: CreateWorkoutSessionExercise[] = Object.entries(gymExercises)
        .map(([exerciseId, st]) => {
            const id = String(exerciseId ?? "").trim();
            if (!id) return null;

            const done = st?.done === true;
            if (!done) return null;

            const planned = plannedById.get(id) ?? null;

            const mediaPublicIdsRaw = st?.mediaPublicIds;
            const mediaPublicIds =
                Array.isArray(mediaPublicIdsRaw) && mediaPublicIdsRaw.length
                    ? mediaPublicIdsRaw.map((x) => String(x).trim()).filter(Boolean)
                    : null;

            const exNotes = cleanStrOrNull(st?.notes) ?? cleanStrOrNull((planned as any)?.notes) ?? null;

            return {
                name: cleanStrOrNull((planned as any)?.name) ?? "Exercise",
                sets: planned?.sets ? Number(planned.sets) : null,
                reps: cleanStrOrNull((planned as any)?.reps) ?? null,
                load: cleanStrOrNull((planned as any)?.load) ?? null,
                notes: exNotes,
                mediaPublicIds,
            };
        })
        .filter((x): x is CreateWorkoutSessionExercise => Boolean(x));

    if (doneExercises.length === 0) {
        return { ok: false, reason: "No done exercises found in Gym Check for this day." };
    }

    const sessionType = cleanStrOrNull((plan as any)?.sessionType) ?? "Gym Check";
    const durationSeconds = durationMin !== null ? durationMin * 60 : null;

    const body: CreateWorkoutSessionBody = {
        type: sessionType,
        durationSeconds,
        notes: dayNotes,
        exercises: doneExercises,
        meta: {
            source: "gymCheck",
            weekKey,
            dayKey,
            routineWeekKey: weekKey,
        },
    };

    return { ok: true, body };
}