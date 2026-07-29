// /src/utils/pva/mergePlanVsActual.ts
// Runtime-safe merge of API plan-vs-actual data with routine plan and Gym Check metadata.

import {
    getPlanFromMeta,
    isDayKey,
    type DayKey,
    type DayPlan,
    type ExerciseItem,
} from "@/src/utils/routines/plan";

export type PlannedSummary = {
    sessionType: string | null;
    focus: string | null;
    tags: string[] | null;
};

export type GymCheckSummary = {
    durationMin: number | null;
    notes: string | null;
    totalPlannedExercises: number;
    doneExercises: number;
    hasAnyCheck: boolean;
};

export type MergedPlanVsActualSession = {
    id: string;
    type: string;
};

export type MergedPlanVsActualDay = {
    date: string;
    dayKey: DayKey;
    planned: PlannedSummary | null;
    actual: { sessions: MergedPlanVsActualSession[] };
    status: string;
    gymCheck: GymCheckSummary;
};

export type MergedPlanVsActualWeek = {
    weekKey: string;
    range: { from: string; to: string };
    hasRoutineTemplate: boolean;
    days: MergedPlanVsActualDay[];
};

type GymCheckDayRecord = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanStrOrNull(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function parseIntOrNull(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function readStringArrayOrNull(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;
    const strings = value.filter((item): item is string => typeof item === "string");
    return strings.length > 0 ? strings : null;
}

function normalizePlanned(value: unknown): PlannedSummary | null {
    if (!isRecord(value)) return null;

    const planned: PlannedSummary = {
        sessionType: cleanStrOrNull(value.sessionType),
        focus: cleanStrOrNull(value.focus),
        tags: readStringArrayOrNull(value.tags),
    };

    return planned.sessionType || planned.focus || planned.tags ? planned : null;
}

function normalizeActualSessions(value: unknown): MergedPlanVsActualSession[] {
    if (!isRecord(value) || !Array.isArray(value.sessions)) return [];

    return value.sessions.flatMap((session): MergedPlanVsActualSession[] => {
        if (!isRecord(session)) return [];
        const id = cleanStrOrNull(session.id);
        const type = cleanStrOrNull(session.type);
        return id && type ? [{ id, type }] : [];
    });
}

function buildPlannedMapFromRoutine(routine: unknown): Map<DayKey, PlannedSummary> {
    const output = new Map<DayKey, PlannedSummary>();
    if (!isRecord(routine)) return output;

    const plans: DayPlan[] = getPlanFromMeta(routine.meta);
    for (const plan of plans) {
        output.set(plan.dayKey, {
            sessionType: cleanStrOrNull(plan.sessionType),
            focus: cleanStrOrNull(plan.focus),
            tags: plan.tags && plan.tags.length > 0 ? [...plan.tags] : null,
        });
    }

    return output;
}

function buildPlanExercisesMapFromRoutine(
    routine: unknown,
): Map<DayKey, ExerciseItem[]> {
    const output = new Map<DayKey, ExerciseItem[]>();
    if (!isRecord(routine)) return output;

    const plans: DayPlan[] = getPlanFromMeta(routine.meta);
    for (const plan of plans) {
        output.set(plan.dayKey, plan.exercises ? [...plan.exercises] : []);
    }

    return output;
}

function buildGymCheckMapFromRoutine(
    routine: unknown,
): Map<DayKey, GymCheckDayRecord> {
    const output = new Map<DayKey, GymCheckDayRecord>();
    if (!isRecord(routine) || !isRecord(routine.meta)) return output;

    const gymCheck = routine.meta.gymCheck;
    if (!isRecord(gymCheck)) return output;

    for (const [dayKey, value] of Object.entries(gymCheck)) {
        if (isDayKey(dayKey) && isRecord(value)) output.set(dayKey, value);
    }

    return output;
}

function computeGymCheckSummary(args: {
    plannedExercises: ExerciseItem[];
    gymCheckDay: GymCheckDayRecord | null;
}): GymCheckSummary {
    const { plannedExercises, gymCheckDay } = args;
    const durationMin = parseIntOrNull(gymCheckDay?.durationMin);
    const notes = cleanStrOrNull(gymCheckDay?.notes);
    const exercises = isRecord(gymCheckDay?.exercises)
        ? gymCheckDay.exercises
        : null;

    let doneExercises = 0;
    let hasAnyCheck = false;

    if (exercises) {
        for (const exercise of plannedExercises) {
            const state = exercises[exercise.id];
            if (!isRecord(state)) continue;

            hasAnyCheck = true;
            if (state.done === true) doneExercises += 1;
        }

        if (!hasAnyCheck) hasAnyCheck = Object.keys(exercises).length > 0;
    }

    if (!hasAnyCheck && (durationMin !== null || notes !== null)) {
        hasAnyCheck = true;
    }

    return {
        durationMin,
        notes,
        totalPlannedExercises: plannedExercises.length,
        doneExercises,
        hasAnyCheck,
    };
}

function deriveStatusWithGymCheck(args: {
    backendStatus: string;
    hasPlanned: boolean;
    plannedExercisesCount: number;
    gym: GymCheckSummary;
    actualSessionsCount: number;
}): string {
    const {
        backendStatus,
        hasPlanned,
        plannedExercisesCount,
        gym,
        actualSessionsCount,
    } = args;

    if (gym.hasAnyCheck) {
        if (plannedExercisesCount > 0) {
            if (gym.doneExercises > 0) return "done";
            return hasPlanned ? "missed" : "unknown";
        }
        return hasPlanned ? "done" : "extra";
    }

    if (backendStatus.trim()) return backendStatus;
    if (!hasPlanned && actualSessionsCount > 0) return "extra";
    return "unknown";
}

function resolvePvaRecord(value: unknown): Record<string, unknown> | null {
    if (!isRecord(value)) return null;
    return isRecord(value.pva) ? value.pva : value;
}

function resolvePvaDays(
    original: unknown,
    pvaRecord: Record<string, unknown>,
): unknown[] {
    if (isRecord(original) && Array.isArray(original.nextDays)) {
        return original.nextDays;
    }
    return Array.isArray(pvaRecord.days) ? pvaRecord.days : [];
}

/**
 * Merges routine plan and Gym Check metadata into a normalized PVA response.
 * Invalid external fields are discarded instead of being forced through casts.
 */
export function mergePlanVsActualPlanned(
    pva: unknown,
    routine: unknown,
): MergedPlanVsActualWeek | null {
    const pvaRecord = resolvePvaRecord(pva);
    if (!pvaRecord) return null;

    const plannedMap = buildPlannedMapFromRoutine(routine);
    const planExercisesMap = buildPlanExercisesMapFromRoutine(routine);
    const gymMap = buildGymCheckMapFromRoutine(routine);

    const days = resolvePvaDays(pva, pvaRecord).flatMap(
        (value): MergedPlanVsActualDay[] => {
            if (!isRecord(value) || !isDayKey(value.dayKey)) return [];

            const date = cleanStrOrNull(value.date);
            if (!date) return [];

            const dayKey = value.dayKey;
            const backendPlanned = normalizePlanned(value.planned);
            const fallbackPlanned = plannedMap.get(dayKey) ?? null;
            const planned: PlannedSummary | null = fallbackPlanned
                ? {
                    sessionType:
                        backendPlanned?.sessionType ?? fallbackPlanned.sessionType,
                    focus: backendPlanned?.focus ?? fallbackPlanned.focus,
                    tags: backendPlanned?.tags ?? fallbackPlanned.tags,
                }
                : backendPlanned;

            const plannedExercises = planExercisesMap.get(dayKey) ?? [];
            const gymCheck = computeGymCheckSummary({
                plannedExercises,
                gymCheckDay: gymMap.get(dayKey) ?? null,
            });
            const actualSessions = normalizeActualSessions(value.actual);

            const hasPlanned =
                Boolean(planned?.sessionType) ||
                Boolean(planned?.focus) ||
                Boolean(planned?.tags?.length) ||
                plannedExercises.length > 0;

            const status = deriveStatusWithGymCheck({
                backendStatus: cleanStrOrNull(value.status) ?? "",
                hasPlanned,
                plannedExercisesCount: plannedExercises.length,
                gym: gymCheck,
                actualSessionsCount: actualSessions.length,
            });

            return [{
                date,
                dayKey,
                planned,
                actual: { sessions: actualSessions },
                status,
                gymCheck,
            }];
        },
    );

    const range = isRecord(pvaRecord.range)
        ? {
            from: cleanStrOrNull(pvaRecord.range.from) ?? "",
            to: cleanStrOrNull(pvaRecord.range.to) ?? "",
        }
        : { from: "", to: "" };

    return {
        weekKey: cleanStrOrNull(pvaRecord.weekKey) ?? "",
        range,
        hasRoutineTemplate: pvaRecord.hasRoutineTemplate === true,
        days,
    };
}
