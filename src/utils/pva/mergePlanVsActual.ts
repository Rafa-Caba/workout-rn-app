import { DAY_KEYS, getPlanFromMeta, type DayKey, type DayPlan, type ExerciseItem } from "@/src/utils/routines/plan";

type Planned = { sessionType: string | null; focus: string | null; tags: string[] | null };

export type GymCheckSummary = {
    durationMin: number | null;
    notes: string | null;

    // completion vs planned exercises (by id)
    totalPlannedExercises: number;
    doneExercises: number;

    // convenience
    hasAnyCheck: boolean;
};

function isRecord(v: unknown): v is Record<string, any> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function cleanStrOrNull(v: unknown): string | null {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s.length ? s : null;
}

function parseIntOrNull(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

function buildPlannedMapFromRoutine(routine: unknown): Map<DayKey, Planned> {
    const out = new Map<DayKey, Planned>();
    if (!isRecord(routine)) return out;

    const meta = isRecord(routine.meta) ? routine.meta : null;
    const plans: DayPlan[] = getPlanFromMeta(meta);

    for (const p of plans) {
        if (!DAY_KEYS.includes(p.dayKey as any)) continue;

        out.set(p.dayKey, {
            sessionType: p.sessionType?.trim() ? p.sessionType : null,
            focus: p.focus?.trim() ? p.focus : null,
            tags: p.tags && p.tags.length ? p.tags : null,
        });
    }

    return out;
}

function buildPlanExercisesMapFromRoutine(routine: unknown): Map<DayKey, ExerciseItem[]> {
    const out = new Map<DayKey, ExerciseItem[]>();
    if (!isRecord(routine)) return out;

    const meta = isRecord(routine.meta) ? routine.meta : null;
    const plans: DayPlan[] = getPlanFromMeta(meta);

    for (const p of plans) {
        if (!DAY_KEYS.includes(p.dayKey as any)) continue;
        const list = Array.isArray(p.exercises) ? p.exercises : [];
        out.set(p.dayKey, list);
    }

    return out;
}

/**
 * Reads routine.meta.gymCheck and returns per-day summary.
 * Expected backend shape (example):
 *   meta.gymCheck.Mon = { durationMin, notes, exercises: { [exerciseId]: { done, ... } } }
 */
function buildGymCheckMapFromRoutine(routine: unknown): Map<DayKey, any> {
    const out = new Map<DayKey, any>();
    if (!isRecord(routine)) return out;

    const meta = isRecord(routine.meta) ? routine.meta : null;
    if (!meta) return out;

    const gymCheckRaw = (meta as any).gymCheck;
    if (!isRecord(gymCheckRaw)) return out;

    for (const k of DAY_KEYS) {
        const v = gymCheckRaw[k];
        if (isRecord(v)) out.set(k, v);
    }

    return out;
}

function computeGymCheckSummary(args: {
    dayKey: DayKey;
    plannedExercises: ExerciseItem[];
    gymCheckDay: any | null;
}): GymCheckSummary {
    const { plannedExercises, gymCheckDay } = args;

    const totalPlannedExercises = plannedExercises.length;

    const durationMin = parseIntOrNull(gymCheckDay?.durationMin);
    const notes = cleanStrOrNull(gymCheckDay?.notes);

    const exercisesRec = isRecord(gymCheckDay?.exercises) ? (gymCheckDay.exercises as Record<string, any>) : null;

    let doneExercises = 0;
    let hasAnyCheck = false;

    if (exercisesRec) {
        // We only count completion against planned exercise ids.
        for (const ex of plannedExercises) {
            const id = typeof ex?.id === "string" ? ex.id : "";
            if (!id) continue;
            const st = exercisesRec[id];
            if (!isRecord(st)) continue;

            hasAnyCheck = true;
            if (st.done === true) doneExercises += 1;
        }

        // If user checked anything that doesn't exist in plan (rare), still flag hasAnyCheck
        if (!hasAnyCheck) {
            const anyKeys = Object.keys(exercisesRec);
            hasAnyCheck = anyKeys.length > 0;
        }
    }

    // Also treat duration/notes as "hasAnyCheck" if they exist
    if (!hasAnyCheck && (durationMin !== null || notes !== null)) hasAnyCheck = true;

    return {
        durationMin,
        notes,
        totalPlannedExercises,
        doneExercises,
        hasAnyCheck,
    };
}

function deriveStatusWithGymCheck(args: {
    backendStatus: string;
    hasPlanned: boolean;
    plannedExercisesCount: number;
    gym: GymCheckSummary | null;
    actualSessionsCount: number;
}): string {
    const { backendStatus, hasPlanned, plannedExercisesCount, gym, actualSessionsCount } = args;

    // If we have gymCheck activity, prefer it as the driver of status
    if (gym && gym.hasAnyCheck) {
        if (plannedExercisesCount > 0) {
            if (gym.doneExercises >= plannedExercisesCount) return "done";
            if (gym.doneExercises > 0) return "done"; // treat partial as done for now (no "partial" i18n key yet)
            return hasPlanned ? "missed" : "unknown";
        }

        // No planned exercises: gym check implies "extra" (you did something not planned)
        return hasPlanned ? "done" : "extra";
    }

    // No gym check: fall back to backend status, but slightly normalize
    if (typeof backendStatus === "string" && backendStatus.trim()) return backendStatus;

    // If there are actual sessions but no plan, it's extra
    if (!hasPlanned && actualSessionsCount > 0) return "extra";

    return "unknown";
}

/**
 * Merge routine planned + gymCheck into PVA response.
 * - planned overlay: routine.meta.plan
 * - gymCheck overlay: routine.meta.gymCheck
 * - status: prefer gymCheck when present
 */
export function mergePlanVsActualPlanned(pva: any, routine: unknown): any {
    if (!pva || !Array.isArray(pva.days)) return pva;

    const plannedMap = buildPlannedMapFromRoutine(routine);
    const planExercisesMap = buildPlanExercisesMapFromRoutine(routine);
    const gymMap = buildGymCheckMapFromRoutine(routine);

    const nextDays = pva.days.map((d: any) => {
        const dayKey = d?.dayKey;
        if (!dayKey || typeof dayKey !== "string" || !DAY_KEYS.includes(dayKey as any)) return d;

        const k = dayKey as DayKey;

        // planned overlay
        const fallbackPlanned = plannedMap.get(k) ?? null;

        const planned = isRecord(d.planned) ? d.planned : {};
        const plannedSessionType = (planned as any).sessionType ?? null;
        const plannedFocus = (planned as any).focus ?? null;
        const plannedTags = (planned as any).tags ?? null;

        const filledPlanned = fallbackPlanned
            ? {
                sessionType: plannedSessionType ?? fallbackPlanned.sessionType,
                focus: plannedFocus ?? fallbackPlanned.focus,
                tags: plannedTags ?? fallbackPlanned.tags,
            }
            : d.planned ?? null;

        const plannedExercises = planExercisesMap.get(k) ?? [];
        const gymRaw = gymMap.get(k) ?? null;

        const gym = computeGymCheckSummary({
            dayKey: k,
            plannedExercises,
            gymCheckDay: gymRaw,
        });

        const hasPlanned =
            Boolean(filledPlanned?.sessionType) ||
            Boolean(filledPlanned?.focus) ||
            Boolean((filledPlanned?.tags?.length ?? 0) > 0) ||
            plannedExercises.length > 0;

        const actualSessionsCount = Array.isArray(d?.actual?.sessions) ? d.actual.sessions.length : 0;

        const status = deriveStatusWithGymCheck({
            backendStatus: typeof d.status === "string" ? d.status : "",
            hasPlanned,
            plannedExercisesCount: plannedExercises.length,
            gym,
            actualSessionsCount,
        });

        return {
            ...d,
            planned: filledPlanned,
            gymCheck: gym, // ✅ new field for UI
            status,
        };
    });

    return { ...pva, days: nextDays };
}
