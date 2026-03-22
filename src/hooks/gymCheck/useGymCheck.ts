import * as React from "react";

import { getZustandStorage } from "@/src/store/storage";
import type { WeightUnit, WorkoutDay, WorkoutExercise, WorkoutExerciseSet, WorkoutSession } from "@/src/types/workoutDay.types";
import type { DayKey, ExerciseItem } from "@/src/utils/routines/plan";

export type GymExerciseState = {
    done: boolean;

    // Optional per-exercise additions (stored as strings for input UX)
    notes?: string;
    durationMin?: string;

    // attachments uploaded during gym check (publicIds)
    mediaPublicIds: string[];

    // Real executed sets captured during Gym Check.
    // These are later sent as exercise.sets when creating the real session.
    performedSets: WorkoutExerciseSet[];
};

export type GymDayMetricsState = {
    // Keep as strings for input UX. Convert to number/null only when sending to API.
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

    // TrainingBlock-like day fields (stored under metrics in BE schema)
    trainingSource: string;
    dayEffortRpe: string;
};

export type GymDayState = {
    durationMin: string; // keep as string for input UX
    notes: string;
    metrics: GymDayMetricsState;

    exercises: Record<string, GymExerciseState>; // key = exerciseId
};

export type GymWeekState = {
    version: 4; // bumped because we added performedSets
    weekKey: string;
    days: Record<DayKey, GymDayState>;
    updatedAt: string;
};

const STORAGE_PREFIX = "workout-gymcheck";
const EMPTY_EXERCISE: GymExerciseState = { done: false, mediaPublicIds: [], performedSets: [] };

function storageKey(weekKey: string) {
    return `${STORAGE_PREFIX}:${weekKey}`;
}

function makeEmptyMetrics(): GymDayMetricsState {
    return {
        startAt: "",
        endAt: "",
        activeKcal: "",
        totalKcal: "",
        avgHr: "",
        maxHr: "",
        distanceKm: "",
        steps: "",
        elevationGainM: "",
        paceSecPerKm: "",
        cadenceRpm: "",
        effortRpe: "",
        trainingSource: "",
        dayEffortRpe: "",
    };
}

function makeEmptyDay(): GymDayState {
    return {
        durationMin: "",
        notes: "",
        metrics: makeEmptyMetrics(),
        exercises: {},
    };
}

function makeEmptyWeek(weekKey: string): GymWeekState {
    return {
        version: 4,
        weekKey,
        days: {
            Mon: makeEmptyDay(),
            Tue: makeEmptyDay(),
            Wed: makeEmptyDay(),
            Thu: makeEmptyDay(),
            Fri: makeEmptyDay(),
            Sat: makeEmptyDay(),
            Sun: makeEmptyDay(),
        } as Record<DayKey, GymDayState>,
        updatedAt: new Date().toISOString(),
    };
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function safeStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.map((x) => String(x).trim()).filter(Boolean);
}

function toFiniteNumberOrNull(value: unknown): number | null {
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
    const parsed = toFiniteNumberOrNull(value);
    return parsed === null ? null : Math.trunc(parsed);
}

function safeWeightUnit(value: unknown): WeightUnit {
    return value === "kg" ? "kg" : "lb";
}

function cleanString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeTextKey(value: unknown): string {
    const base = cleanString(value) ?? "";
    return base.toLowerCase();
}

function normalizeWorkoutExerciseSet(value: unknown, fallbackIndex: number): WorkoutExerciseSet | null {
    if (!isRecord(value)) return null;

    return {
        setIndex:
            typeof value.setIndex === "number" && Number.isFinite(value.setIndex) && value.setIndex > 0
                ? Math.trunc(value.setIndex)
                : fallbackIndex,
        reps: toIntOrNull(value.reps),
        weight: toFiniteNumberOrNull(value.weight),
        unit: safeWeightUnit(value.unit),
        rpe: toFiniteNumberOrNull(value.rpe),
        isWarmup: value.isWarmup === true,
        isDropSet: value.isDropSet === true,
        tempo: typeof value.tempo === "string" ? value.tempo : null,
        restSec: toIntOrNull(value.restSec),
        tags: Array.isArray(value.tags) ? value.tags.map((item) => String(item).trim()).filter(Boolean) : null,
        meta: isRecord(value.meta) ? value.meta : null,
    };
}

function safeWorkoutExerciseSetArray(value: unknown): WorkoutExerciseSet[] {
    if (!Array.isArray(value)) return [];

    const parsed: WorkoutExerciseSet[] = [];

    value.forEach((item, index) => {
        const normalized = normalizeWorkoutExerciseSet(item, index + 1);
        if (normalized) parsed.push(normalized);
    });

    return parsed
        .sort((a, b) => a.setIndex - b.setIndex)
        .map((item, index) => ({ ...item, setIndex: index + 1 }));
}

function safeParse(raw: string | null): GymWeekState | null {
    if (!raw) return null;

    try {
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== "object") return null;

        const version = (obj as { version?: unknown }).version;
        if (version !== 1 && version !== 2 && version !== 3 && version !== 4) return null;

        const wk = (obj as { weekKey?: unknown }).weekKey;
        if (typeof wk !== "string") return null;

        const days = (obj as { days?: unknown }).days;
        if (!days || typeof days !== "object") return null;

        const upgraded: GymWeekState = {
            version: 4,
            weekKey: wk,
            days: days as Record<DayKey, GymDayState>,
            updatedAt:
                typeof (obj as { updatedAt?: unknown }).updatedAt === "string"
                    ? (obj as { updatedAt: string }).updatedAt
                    : new Date().toISOString(),
        };

        const dayKeys: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

        for (const dk of dayKeys) {
            const d = (upgraded.days as Record<DayKey, unknown>)[dk];

            if (!isRecord(d)) {
                upgraded.days[dk] = makeEmptyDay();
                continue;
            }

            const metrics =
                isRecord(d.metrics)
                    ? { ...makeEmptyMetrics(), ...d.metrics }
                    : makeEmptyMetrics();

            const rawExercises = isRecord(d.exercises) ? d.exercises : {};
            const normalizedExercises: Record<string, GymExerciseState> = {};

            for (const [exerciseId, rawEx] of Object.entries(rawExercises)) {
                if (!exerciseId || !isRecord(rawEx)) continue;

                normalizedExercises[exerciseId] = {
                    done: rawEx.done === true,
                    ...(typeof rawEx.notes === "string" ? { notes: rawEx.notes } : {}),
                    ...(typeof rawEx.durationMin === "string"
                        ? { durationMin: rawEx.durationMin }
                        : typeof rawEx.durationMin === "number"
                            ? { durationMin: String(rawEx.durationMin) }
                            : {}),
                    mediaPublicIds: safeStringArray(rawEx.mediaPublicIds),
                    performedSets: safeWorkoutExerciseSetArray(rawEx.performedSets),
                };
            }

            upgraded.days[dk] = {
                ...d,
                durationMin: typeof d.durationMin === "string" ? d.durationMin : "",
                notes: typeof d.notes === "string" ? d.notes : "",
                metrics,
                exercises: normalizedExercises,
            };
        }

        return upgraded;
    } catch {
        return null;
    }
}

async function loadPersistedWeek(weekKey: string): Promise<GymWeekState | null> {
    try {
        const storage = getZustandStorage();
        const raw = await storage.getItem(storageKey(weekKey));
        const parsed = safeParse(raw);
        if (parsed?.weekKey === weekKey) return parsed;
        return null;
    } catch {
        return null;
    }
}

async function persistWeek(next: GymWeekState): Promise<void> {
    try {
        const storage = getZustandStorage();
        await storage.setItem(storageKey(next.weekKey), JSON.stringify(next));
    } catch {
        // ignore
    }
}

async function clearPersistedWeek(weekKey: string): Promise<void> {
    try {
        const storage = getZustandStorage();
        await storage.removeItem(storageKey(weekKey));
    } catch {
        // ignore
    }
}

function ensureExercise(day: GymDayState, exerciseId: string): GymExerciseState {
    return day.exercises[exerciseId] ?? EMPTY_EXERCISE;
}

// ---------- remote helpers ----------
function numToUiString(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    return String(v);
}

function strToUiString(v: unknown): string | null {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s ? s : null;
}

/**
 * Parses planned sets count from values like:
 * - 5
 * - "5"
 * - "5 sets"
 * - "4-5"
 *
 * Returns at least 1 so the real-set editor always has a valid initial set count.
 */
function parsePlannedSetsCount(input: unknown): number {
    if (typeof input === "number" && Number.isFinite(input) && input > 0) {
        return Math.max(1, Math.trunc(input));
    }

    if (typeof input !== "string") return 1;

    const trimmed = input.trim();
    if (!trimmed) return 1;

    const matched = trimmed.match(/\d+/);
    if (!matched) return 1;

    const parsed = Number(matched[0]);
    if (!Number.isFinite(parsed) || parsed <= 0) return 1;

    return Math.max(1, Math.trunc(parsed));
}

/**
 * Parses planned reps from values like:
 * - 5
 * - "5"
 * - "3-5"
 * - "8 / 10"
 * - "10 reps"
 *
 * For ranges, the first numeric value is used as the default prefilled reps.
 * This is only the initial UI value for performed sets; the user can still edit it.
 */
function parsePlannedRepsValue(input: unknown): number | null {
    if (typeof input === "number" && Number.isFinite(input) && input > 0) {
        return Math.max(1, Math.trunc(input));
    }

    if (typeof input !== "string") return null;

    const trimmed = input.trim();
    if (!trimmed) return null;

    const matched = trimmed.match(/\d+/);
    if (!matched) return null;

    const parsed = Number(matched[0]);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;

    return Math.max(1, Math.trunc(parsed));
}

/**
 * Builds the initial performed sets from the planned exercise data.
 * This is used only when the exercise does not yet have local performed sets.
 *
 * Prefills:
 * - reps
 * - weight
 * - rpe
 * - unit
 */
function buildPrefilledPerformedSets(exercise: ExerciseItem, unit: WeightUnit): WorkoutExerciseSet[] {
    const totalSets = parsePlannedSetsCount((exercise as { sets?: unknown }).sets);
    const plannedReps = parsePlannedRepsValue((exercise as { reps?: unknown }).reps);
    const plannedLoad = toFiniteNumberOrNull((exercise as { load?: unknown }).load);
    const plannedRpe = toFiniteNumberOrNull((exercise as { rpe?: unknown }).rpe);

    return Array.from({ length: totalSets }, (_, index) => ({
        setIndex: index + 1,
        reps: plannedReps,
        weight: plannedLoad,
        unit,
        rpe: plannedRpe,
        isWarmup: false,
        isDropSet: false,
        tempo: null,
        restSec: null,
        tags: null,
        meta: null,
    }));
}

type RemoteGymMetrics = Partial<{
    startAt: string | null;
    endAt: string | null;

    activeKcal: number | null;
    totalKcal: number | null;

    avgHr: number | null;
    maxHr: number | null;

    distanceKm: number | null;
    steps: number | null;
    elevationGainM: number | null;

    paceSecPerKm: number | null;
    cadenceRpm: number | null;

    effortRpe: number | null;

    trainingSource: string | null;
    dayEffortRpe: number | null;
}>;

type RemoteGymCheck = Record<
    DayKey,
    {
        durationMin?: number | null;
        notes?: string | null;

        metrics?: RemoteGymMetrics | null;

        trainingSource?: string | null;
        dayEffortRpe?: number | null;

        exercises?:
        | Record<
            string,
            {
                done?: boolean | null;
                notes?: string | null;
                durationMin?: number | null;
                mediaPublicIds?: string[] | null;
                performedSets?: WorkoutExerciseSet[] | null;
                updatedAt?: string | null;
            }
        >
        | null;
        updatedAt?: string | null;
    }
>;

function extractRemoteGymCheck(routine: unknown): RemoteGymCheck | null {
    if (!isRecord(routine)) return null;

    const meta = routine.meta;
    if (!isRecord(meta)) return null;

    const gymCheck = meta.gymCheck;
    if (!isRecord(gymCheck)) return null;

    return gymCheck as RemoteGymCheck;
}

function mergeRemoteMetricsIntoLocal(
    local: GymDayMetricsState,
    remoteMetrics: RemoteGymMetrics | null | undefined,
    remoteDay: {
        trainingSource?: string | null;
        dayEffortRpe?: number | null;
    } | null | undefined
) {
    const base = { ...makeEmptyMetrics(), ...(local ?? makeEmptyMetrics()) };
    const m = remoteMetrics ?? null;

    const startAt = m ? strToUiString(m.startAt) : null;
    const endAt = m ? strToUiString(m.endAt) : null;

    const activeKcal = m ? numToUiString(m.activeKcal) : null;
    const totalKcal = m ? numToUiString(m.totalKcal) : null;

    const avgHr = m ? numToUiString(m.avgHr) : null;
    const maxHr = m ? numToUiString(m.maxHr) : null;

    const distanceKm = m ? numToUiString(m.distanceKm) : null;
    const steps = m ? numToUiString(m.steps) : null;
    const elevationGainM = m ? numToUiString(m.elevationGainM) : null;

    const paceSecPerKm = m ? numToUiString(m.paceSecPerKm) : null;
    const cadenceRpm = m ? numToUiString(m.cadenceRpm) : null;

    const effortRpe = m ? numToUiString(m.effortRpe) : null;

    const trainingSource = (m ? strToUiString(m.trainingSource) : null) ?? strToUiString(remoteDay?.trainingSource);
    const dayEffortRpe = (m ? numToUiString(m.dayEffortRpe) : null) ?? numToUiString(remoteDay?.dayEffortRpe);

    return {
        ...base,
        ...(startAt !== null ? { startAt } : {}),
        ...(endAt !== null ? { endAt } : {}),

        ...(activeKcal !== null ? { activeKcal } : {}),
        ...(totalKcal !== null ? { totalKcal } : {}),

        ...(avgHr !== null ? { avgHr } : {}),
        ...(maxHr !== null ? { maxHr } : {}),

        ...(distanceKm !== null ? { distanceKm } : {}),
        ...(steps !== null ? { steps } : {}),
        ...(elevationGainM !== null ? { elevationGainM } : {}),

        ...(paceSecPerKm !== null ? { paceSecPerKm } : {}),
        ...(cadenceRpm !== null ? { cadenceRpm } : {}),

        ...(effortRpe !== null ? { effortRpe } : {}),

        ...(trainingSource !== null ? { trainingSource } : {}),
        ...(dayEffortRpe !== null ? { dayEffortRpe } : {}),
    };
}

function mergeRemoteIntoLocal(prev: GymWeekState, remote: RemoteGymCheck): GymWeekState {
    const next: GymWeekState = { ...prev, days: { ...prev.days } };
    const dayKeys: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (const dayKey of dayKeys) {
        const rDay = remote[dayKey];
        if (!rDay || typeof rDay !== "object") continue;

        const localDay = next.days[dayKey] ?? makeEmptyDay();

        const mergedDay: GymDayState = {
            ...localDay,
            durationMin:
                rDay.durationMin === null || rDay.durationMin === undefined ? localDay.durationMin : String(rDay.durationMin),
            notes: typeof rDay.notes === "string" ? rDay.notes : localDay.notes,
            metrics: mergeRemoteMetricsIntoLocal(localDay.metrics ?? makeEmptyMetrics(), rDay.metrics, rDay),
            exercises: { ...(localDay.exercises ?? {}) },
        };

        const rExercises = rDay.exercises;
        if (rExercises && typeof rExercises === "object" && !Array.isArray(rExercises)) {
            for (const [exerciseId, rEx] of Object.entries(rExercises)) {
                if (!exerciseId || !isRecord(rEx)) continue;
                const prevEx = mergedDay.exercises[exerciseId] ?? EMPTY_EXERCISE;

                const done =
                    typeof rEx.done === "boolean"
                        ? rEx.done
                        : rEx.done === null
                            ? prevEx.done
                            : prevEx.done;

                const notes = typeof rEx.notes === "string" ? rEx.notes : prevEx.notes;

                const durationMin =
                    typeof rEx.durationMin === "number"
                        ? String(rEx.durationMin)
                        : rEx.durationMin === null
                            ? prevEx.durationMin
                            : prevEx.durationMin;

                const mediaPublicIds =
                    Array.isArray(rEx.mediaPublicIds)
                        ? safeStringArray(rEx.mediaPublicIds)
                        : rEx.mediaPublicIds === null
                            ? prevEx.mediaPublicIds
                            : prevEx.mediaPublicIds;

                const performedSets =
                    Array.isArray(rEx.performedSets)
                        ? safeWorkoutExerciseSetArray(rEx.performedSets)
                        : Array.isArray(prevEx.performedSets)
                            ? prevEx.performedSets
                            : [];

                mergedDay.exercises[exerciseId] = {
                    ...prevEx,
                    done,
                    ...(notes !== undefined ? { notes } : {}),
                    ...(durationMin !== undefined ? { durationMin } : {}),
                    mediaPublicIds,
                    performedSets,
                };
            }
        }

        next.days[dayKey] = mergedDay;
    }

    return next;
}

function getLatestGymCheckSession(day: WorkoutDay | null | undefined): WorkoutSession | null {
    const sessions = Array.isArray(day?.training?.sessions) ? day.training.sessions : [];
    const matches = sessions.filter((session) => String(session.meta?.sessionKey ?? "") === "gym_check");
    if (matches.length === 0) return null;
    return matches[matches.length - 1] ?? null;
}

function buildPlannedExerciseMaps(plannedExercises: ExerciseItem[]) {
    const byId = new Map<string, ExerciseItem>();
    const byMovementId = new Map<string, ExerciseItem[]>();
    const byName = new Map<string, ExerciseItem[]>();

    for (const exercise of plannedExercises) {
        const exerciseId = cleanString((exercise as { id?: unknown }).id);
        const movementId = cleanString((exercise as { movementId?: unknown }).movementId);
        const name = normalizeTextKey((exercise as { movementName?: unknown; name?: unknown }).movementName ?? exercise.name);

        if (exerciseId) {
            byId.set(exerciseId, exercise);
        }

        if (movementId) {
            const list = byMovementId.get(movementId) ?? [];
            list.push(exercise);
            byMovementId.set(movementId, list);
        }

        if (name) {
            const list = byName.get(name) ?? [];
            list.push(exercise);
            byName.set(name, list);
        }
    }

    return { byId, byMovementId, byName };
}

function resolvePlannedExerciseIdForSessionExercise(
    sessionExercise: WorkoutExercise,
    plannedExercises: ExerciseItem[]
): string | null {
    const maps = buildPlannedExerciseMaps(plannedExercises);

    const exerciseMeta = isRecord(sessionExercise.meta) ? sessionExercise.meta : null;
    const gymCheckMeta = exerciseMeta && isRecord(exerciseMeta.gymCheck) ? exerciseMeta.gymCheck : null;
    const explicitExerciseId = cleanString(gymCheckMeta?.exerciseId);

    if (explicitExerciseId && maps.byId.has(explicitExerciseId)) {
        return explicitExerciseId;
    }

    const movementId = cleanString(sessionExercise.movementId);
    if (movementId) {
        const movementMatches = maps.byMovementId.get(movementId) ?? [];
        if (movementMatches.length === 1) {
            return cleanString((movementMatches[0] as { id?: unknown }).id);
        }
    }

    const nameKey = normalizeTextKey(sessionExercise.movementName ?? sessionExercise.name);
    if (nameKey) {
        const nameMatches = maps.byName.get(nameKey) ?? [];
        if (nameMatches.length === 1) {
            return cleanString((nameMatches[0] as { id?: unknown }).id);
        }
    }

    return null;
}

/**
 * GymCheck local UX state (per week) persisted to RN storage.
 * This is local-only; server sync happens via useSyncGymCheckDay.
 */
export function useGymCheck(weekKey: string) {
    const [state, setState] = React.useState<GymWeekState>(() => makeEmptyWeek(weekKey));
    const [hydrated, setHydrated] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;

        async function run() {
            setHydrated(false);
            const existing = await loadPersistedWeek(weekKey);

            if (cancelled) return;

            setState(existing?.weekKey === weekKey ? existing : makeEmptyWeek(weekKey));
            setHydrated(true);
        }

        void run();

        return () => {
            cancelled = true;
        };
    }, [weekKey]);

    const update = React.useCallback((fn: (prev: GymWeekState) => GymWeekState) => {
        setState((prev) => {
            const next0 = fn(prev);
            const next: GymWeekState = { ...next0, version: 4, updatedAt: new Date().toISOString() };
            void persistWeek(next);
            return next;
        });
    }, []);

    const getDay = React.useCallback(
        (dayKey: DayKey): GymDayState => {
            return state.days?.[dayKey] ?? makeEmptyDay();
        },
        [state.days]
    );

    const toggleExerciseDone = React.useCallback(
        (dayKey: DayKey, exerciseId: string) => {
            if (!exerciseId) return;
            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                const ex = ensureExercise(day, exerciseId);
                const nextEx: GymExerciseState = { ...ex, done: !ex.done };

                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: {
                            ...day,
                            exercises: {
                                ...day.exercises,
                                [exerciseId]: nextEx,
                            },
                        },
                    },
                };
            });
        },
        [update]
    );

    const ensureExercisePrefilledFromPlan = React.useCallback(
        (args: {
            dayKey: DayKey;
            exerciseId: string;
            exercise: ExerciseItem;
            unit: WeightUnit;
        }) => {
            update((prev) => {
                const day = prev.days[args.dayKey] ?? makeEmptyDay();
                const ex = ensureExercise(day, args.exerciseId);

                if (Array.isArray(ex.performedSets) && ex.performedSets.length > 0) {
                    return prev;
                }

                const performedSets = buildPrefilledPerformedSets(args.exercise, args.unit);

                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [args.dayKey]: {
                            ...day,
                            exercises: {
                                ...day.exercises,
                                [args.exerciseId]: {
                                    ...ex,
                                    performedSets,
                                },
                            },
                        },
                    },
                };
            });
        },
        [update]
    );

    const updateExercisePerformedSet = React.useCallback(
        (dayKey: DayKey, exerciseId: string, setIndex: number, patch: Partial<WorkoutExerciseSet>) => {
            update((prev) => {
                const day = prev.days[dayKey] ?? makeEmptyDay();
                const ex = ensureExercise(day, exerciseId);
                const currentSets = Array.isArray(ex.performedSets) ? ex.performedSets : [];

                if (setIndex < 0 || setIndex >= currentSets.length) return prev;

                const nextSets = currentSets.map((set, index) =>
                    index === setIndex
                        ? {
                            ...set,
                            ...patch,
                            setIndex: index + 1,
                        }
                        : {
                            ...set,
                            setIndex: index + 1,
                        }
                );

                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: {
                            ...day,
                            exercises: {
                                ...day.exercises,
                                [exerciseId]: {
                                    ...ex,
                                    performedSets: nextSets,
                                },
                            },
                        },
                    },
                };
            });
        },
        [update]
    );

    const addExercisePerformedSet = React.useCallback(
        (dayKey: DayKey, exerciseId: string, unit: WeightUnit) => {
            update((prev) => {
                const day = prev.days[dayKey] ?? makeEmptyDay();
                const ex = ensureExercise(day, exerciseId);
                const currentSets = Array.isArray(ex.performedSets) ? ex.performedSets : [];
                const lastSet = currentSets[currentSets.length - 1] ?? null;

                const nextSet: WorkoutExerciseSet = {
                    setIndex: currentSets.length + 1,
                    reps: null,
                    weight: lastSet?.weight ?? null,
                    unit: lastSet?.unit ?? unit,
                    rpe: lastSet?.rpe ?? null,
                    isWarmup: false,
                    isDropSet: false,
                    tempo: null,
                    restSec: null,
                    tags: null,
                    meta: null,
                };

                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: {
                            ...day,
                            exercises: {
                                ...day.exercises,
                                [exerciseId]: {
                                    ...ex,
                                    performedSets: [...currentSets, nextSet],
                                },
                            },
                        },
                    },
                };
            });
        },
        [update]
    );

    const removeExercisePerformedSet = React.useCallback(
        (dayKey: DayKey, exerciseId: string, setIndex: number) => {
            update((prev) => {
                const day = prev.days[dayKey] ?? makeEmptyDay();
                const ex = ensureExercise(day, exerciseId);
                const currentSets = Array.isArray(ex.performedSets) ? ex.performedSets : [];

                if (currentSets.length <= 1) return prev;
                if (setIndex < 0 || setIndex >= currentSets.length) return prev;

                const nextSets = currentSets
                    .filter((_, index) => index !== setIndex)
                    .map((set, index) => ({
                        ...set,
                        setIndex: index + 1,
                    }));

                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: {
                            ...day,
                            exercises: {
                                ...day.exercises,
                                [exerciseId]: {
                                    ...ex,
                                    performedSets: nextSets,
                                },
                            },
                        },
                    },
                };
            });
        },
        [update]
    );

    const setDayDuration = React.useCallback(
        (dayKey: DayKey, durationMin: string) => {
            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                return {
                    ...prev,
                    days: { ...prev.days, [dayKey]: { ...day, durationMin } },
                };
            });
        },
        [update]
    );

    const setDayNotes = React.useCallback(
        (dayKey: DayKey, notes: string) => {
            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                return {
                    ...prev,
                    days: { ...prev.days, [dayKey]: { ...day, notes } },
                };
            });
        },
        [update]
    );

    const setDayMetrics = React.useCallback(
        (dayKey: DayKey, patch: Partial<GymDayMetricsState>) => {
            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: { ...day, metrics: { ...(day.metrics ?? makeEmptyMetrics()), ...patch } },
                    },
                };
            });
        },
        [update]
    );

    const setExerciseNotes = React.useCallback(
        (dayKey: DayKey, exerciseId: string, notes: string) => {
            if (!exerciseId) return;
            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                const ex = ensureExercise(day, exerciseId);
                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: {
                            ...day,
                            exercises: { ...day.exercises, [exerciseId]: { ...ex, notes } },
                        },
                    },
                };
            });
        },
        [update]
    );

    const setExerciseDuration = React.useCallback(
        (dayKey: DayKey, exerciseId: string, durationMin: string) => {
            if (!exerciseId) return;
            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                const ex = ensureExercise(day, exerciseId);
                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: {
                            ...day,
                            exercises: { ...day.exercises, [exerciseId]: { ...ex, durationMin } },
                        },
                    },
                };
            });
        },
        [update]
    );

    const addExerciseMediaPublicId = React.useCallback(
        (dayKey: DayKey, exerciseId: string, publicId: string) => {
            const id = String(publicId ?? "").trim();
            if (!id || !exerciseId) return;

            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                const ex = ensureExercise(day, exerciseId);
                const current = Array.isArray(ex.mediaPublicIds) ? ex.mediaPublicIds : [];
                const nextIds = current.includes(id) ? current : [...current, id];

                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: {
                            ...day,
                            exercises: { ...day.exercises, [exerciseId]: { ...ex, mediaPublicIds: nextIds } },
                        },
                    },
                };
            });
        },
        [update]
    );

    const removeExerciseMediaAt = React.useCallback(
        (dayKey: DayKey, exerciseId: string, index: number) => {
            if (!exerciseId) return;
            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                const ex = ensureExercise(day, exerciseId);
                const list = Array.isArray(ex.mediaPublicIds) ? ex.mediaPublicIds : [];
                if (index < 0 || index >= list.length) return prev;

                const nextList = list.filter((_, i) => i !== index);

                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: {
                            ...day,
                            exercises: { ...day.exercises, [exerciseId]: { ...ex, mediaPublicIds: nextList } },
                        },
                    },
                };
            });
        },
        [update]
    );

    const hydrateDayFromWorkoutDay = React.useCallback(
        (args: {
            dayKey: DayKey;
            workoutDay: WorkoutDay | null | undefined;
            plannedExercises: ExerciseItem[];
        }) => {
            const session = getLatestGymCheckSession(args.workoutDay);
            if (!session || !Array.isArray(session.exercises) || session.exercises.length === 0) {
                return;
            }

            update((prev) => {
                const day = prev.days[args.dayKey] ?? makeEmptyDay();
                const nextExercises = { ...(day.exercises ?? {}) };
                let changed = false;

                for (const sessionExercise of session.exercises ?? []) {
                    const plannedExerciseId = resolvePlannedExerciseIdForSessionExercise(
                        sessionExercise,
                        args.plannedExercises
                    );
                    if (!plannedExerciseId) continue;

                    /**
                     * Important:
                     * If the exercise already exists in local draft state, local state wins.
                     * This prevents stale saved-session hydration from overwriting:
                     * - done -> pending changes
                     * - performed set edits
                     * - locally added/removed sets
                     *
                     * Backend/session hydration should only prefill exercises that do not yet
                     * exist in the local Gym Check draft.
                     */
                    const hasLocalDraft = Object.prototype.hasOwnProperty.call(nextExercises, plannedExerciseId);
                    if (hasLocalDraft) {
                        continue;
                    }

                    const performedSets = safeWorkoutExerciseSetArray(sessionExercise.sets);
                    if (performedSets.length === 0) continue;

                    nextExercises[plannedExerciseId] = {
                        ...EMPTY_EXERCISE,
                        done: true,
                        performedSets,
                    };

                    changed = true;
                }

                if (!changed) return prev;

                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [args.dayKey]: {
                            ...day,
                            exercises: nextExercises,
                        },
                    },
                };
            });
        },
        [update]
    );

    const resetWeek = React.useCallback(() => {
        update(() => makeEmptyWeek(weekKey));
    }, [update, weekKey]);

    const clearLocalWeek = React.useCallback(
        async (wk: string) => {
            await clearPersistedWeek(wk);
            if (wk === weekKey) setState(makeEmptyWeek(weekKey));
        },
        [weekKey]
    );

    const hydrateFromRemote = React.useCallback(
        (routine: unknown) => {
            const remote = extractRemoteGymCheck(routine);
            if (!remote) return;
            update((prev) => mergeRemoteIntoLocal(prev, remote));
        },
        [update]
    );

    const setDay = React.useCallback(
        (dayKey: DayKey, day: GymDayState) => {
            update((prev) => ({
                ...prev,
                days: { ...prev.days, [dayKey]: day },
            }));
        },
        [update]
    );

    const setExerciseDone = React.useCallback(
        (dayKey: DayKey, exerciseId: string, done: boolean) => {
            if (!exerciseId) return;
            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                const exPrev = day.exercises?.[exerciseId] ?? EMPTY_EXERCISE;

                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: {
                            ...day,
                            exercises: { ...day.exercises, [exerciseId]: { ...exPrev, done } },
                        },
                    },
                };
            });
        },
        [update]
    );

    const setExerciseField = React.useCallback(
        (dayKey: DayKey, exerciseId: string, patch: Partial<GymExerciseState>) => {
            if (!exerciseId) return;
            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                const exPrev = day.exercises?.[exerciseId] ?? EMPTY_EXERCISE;

                return {
                    ...prev,
                    days: {
                        ...prev.days,
                        [dayKey]: {
                            ...day,
                            exercises: { ...day.exercises, [exerciseId]: { ...exPrev, ...patch } },
                        },
                    },
                };
            });
        },
        [update]
    );

    const setDayField = React.useCallback(
        (dayKey: DayKey, patch: Partial<GymDayState>) => {
            update((prev) => {
                const day = prev.days?.[dayKey] ?? makeEmptyDay();
                return {
                    ...prev,
                    days: { ...prev.days, [dayKey]: { ...day, ...patch } },
                };
            });
        },
        [update]
    );

    const setMetricsField = React.useCallback(
        (dayKey: DayKey, patch: Partial<GymDayMetricsState>) => {
            setDayMetrics(dayKey, patch);
        },
        [setDayMetrics]
    );

    return React.useMemo(
        () => ({
            state,
            hydrated,

            // Web-like
            getDay,
            toggleExerciseDone,
            ensureExercisePrefilledFromPlan,
            updateExercisePerformedSet,
            addExercisePerformedSet,
            removeExercisePerformedSet,
            setDayDuration,
            setDayNotes,
            setDayMetrics,
            setExerciseNotes,
            setExerciseDuration,
            addExerciseMediaPublicId,
            removeExerciseMediaAt,
            resetWeek,
            hydrateFromRemote,
            hydrateDayFromWorkoutDay,
            clearLocalWeek,

            // RN legacy/compat
            setDay,
            setDayField,
            setMetricsField,
            setExerciseDone,
            setExerciseField,
        }),
        [
            state,
            hydrated,
            getDay,
            toggleExerciseDone,
            ensureExercisePrefilledFromPlan,
            updateExercisePerformedSet,
            addExercisePerformedSet,
            removeExercisePerformedSet,
            setDayDuration,
            setDayNotes,
            setDayMetrics,
            setExerciseNotes,
            setExerciseDuration,
            addExerciseMediaPublicId,
            removeExerciseMediaAt,
            resetWeek,
            hydrateFromRemote,
            hydrateDayFromWorkoutDay,
            clearLocalWeek,
            setDay,
            setDayField,
            setMetricsField,
            setExerciseDone,
            setExerciseField,
        ]
    );
}