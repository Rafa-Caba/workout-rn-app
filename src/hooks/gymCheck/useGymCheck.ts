import * as React from "react";

import { getZustandStorage } from "@/src/store/storage";
import type { DayKey } from "@/src/utils/routines/plan";

export type GymExerciseState = {
    done: boolean;

    // Optional per-exercise additions (stored as strings for input UX)
    notes?: string;
    durationMin?: string;

    // attachments uploaded during gym check (publicIds)
    mediaPublicIds: string[];
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
    version: 3; // bumped because we added day metrics
    weekKey: string;
    days: Record<DayKey, GymDayState>;
    updatedAt: string;
};

const STORAGE_PREFIX = "workout-gymcheck";
const EMPTY_EXERCISE: GymExerciseState = { done: false, mediaPublicIds: [] };

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
        version: 3,
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

function safeStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.map((x) => String(x).trim()).filter(Boolean);
}

function safeParse(raw: string | null): GymWeekState | null {
    if (!raw) return null;

    try {
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== "object") return null;

        const version = (obj as any).version;
        if (version !== 1 && version !== 2 && version !== 3) return null;

        const wk = (obj as any).weekKey;
        if (typeof wk !== "string") return null;

        const days = (obj as any).days;
        if (!days || typeof days !== "object") return null;

        // Upgrade v1/v2 -> v3 (same idea as Web)
        if (version === 1 || version === 2) {
            const upgraded: GymWeekState = {
                version: 3,
                weekKey: wk,
                days: days as any,
                updatedAt: typeof (obj as any).updatedAt === "string" ? (obj as any).updatedAt : new Date().toISOString(),
            };

            const dayKeys: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            for (const dk of dayKeys) {
                const d = (upgraded.days as any)[dk];
                if (!d || typeof d !== "object") {
                    (upgraded.days as any)[dk] = makeEmptyDay();
                    continue;
                }
                if (!(d as any).metrics || typeof (d as any).metrics !== "object") {
                    (upgraded.days as any)[dk] = { ...d, metrics: makeEmptyMetrics() };
                } else {
                    (upgraded.days as any)[dk] = { ...d, metrics: { ...makeEmptyMetrics(), ...(d as any).metrics } };
                }
                if (!(d as any).exercises || typeof (d as any).exercises !== "object") {
                    (upgraded.days as any)[dk] = { ...(upgraded.days as any)[dk], exercises: {} };
                }
            }

            return upgraded;
        }

        // version === 3
        const out: GymWeekState = {
            ...(obj as any),
            version: 3,
            weekKey: wk,
            days: (obj as any).days,
            updatedAt: typeof (obj as any).updatedAt === "string" ? (obj as any).updatedAt : new Date().toISOString(),
        };

        const dayKeys: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        for (const dk of dayKeys) {
            const d = (out.days as any)[dk];
            if (!d || typeof d !== "object") {
                (out.days as any)[dk] = makeEmptyDay();
                continue;
            }
            if (!(d as any).metrics || typeof (d as any).metrics !== "object") {
                (out.days as any)[dk] = { ...d, metrics: makeEmptyMetrics() };
            } else {
                (out.days as any)[dk] = { ...d, metrics: { ...makeEmptyMetrics(), ...(d as any).metrics } };
            }
            if (!(d as any).exercises || typeof (d as any).exercises !== "object") {
                (out.days as any)[dk] = { ...(out.days as any)[dk], exercises: {} };
            }
        }

        return out;
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

// ---------- remote helpers (same as Web) ----------
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
                updatedAt?: string | null;
            }
        >
        | null;
        updatedAt?: string | null;
    }
>;

function extractRemoteGymCheck(routine: unknown): RemoteGymCheck | null {
    if (!routine || typeof routine !== "object") return null;

    const meta = (routine as any).meta;
    if (!meta || typeof meta !== "object") return null;

    const gymCheck = (meta as any).gymCheck;
    if (!gymCheck || typeof gymCheck !== "object") return null;

    return gymCheck as RemoteGymCheck;
}

function mergeRemoteMetricsIntoLocal(
    local: GymDayMetricsState,
    remoteMetrics: RemoteGymMetrics | null | undefined,
    remoteDay: any
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
        const rDay = (remote as any)[dayKey];
        if (!rDay || typeof rDay !== "object") continue;

        const localDay = next.days[dayKey] ?? makeEmptyDay();

        const mergedDay: GymDayState = {
            ...localDay,
            durationMin:
                rDay.durationMin === null || rDay.durationMin === undefined ? localDay.durationMin : String(rDay.durationMin),
            notes: typeof rDay.notes === "string" ? rDay.notes : localDay.notes,

            // ✅ hydrate metrics from DB
            metrics: mergeRemoteMetricsIntoLocal(localDay.metrics ?? makeEmptyMetrics(), rDay.metrics, rDay),

            exercises: { ...(localDay.exercises ?? {}) },
        };

        const rExercises = rDay.exercises;
        if (rExercises && typeof rExercises === "object" && !Array.isArray(rExercises)) {
            for (const [exerciseId, rEx] of Object.entries(rExercises)) {
                if (!exerciseId) continue;
                const prevEx = mergedDay.exercises[exerciseId] ?? EMPTY_EXERCISE;

                const done =
                    typeof (rEx as any)?.done === "boolean"
                        ? (rEx as any).done
                        : (rEx as any)?.done === null
                            ? prevEx.done
                            : prevEx.done;

                const notes = typeof (rEx as any)?.notes === "string" ? (rEx as any).notes : prevEx.notes;

                const durationMin =
                    typeof (rEx as any)?.durationMin === "number"
                        ? String((rEx as any).durationMin)
                        : (rEx as any)?.durationMin === null
                            ? prevEx.durationMin
                            : prevEx.durationMin;

                const mediaPublicIds =
                    Array.isArray((rEx as any)?.mediaPublicIds)
                        ? safeStringArray((rEx as any).mediaPublicIds)
                        : (rEx as any)?.mediaPublicIds === null
                            ? prevEx.mediaPublicIds
                            : prevEx.mediaPublicIds;

                mergedDay.exercises[exerciseId] = {
                    ...prevEx,
                    done,
                    ...(notes !== undefined ? { notes } : {}),
                    ...(durationMin !== undefined ? { durationMin } : {}),
                    mediaPublicIds,
                };
            }
        }

        next.days[dayKey] = mergedDay;
    }

    return next;
}

/**
 * GymCheck local UX state (per week) persisted to RN storage.
 * This is local-only; server sync happens via useSyncGymCheckDay.
 */
export function useGymCheck(weekKey: string) {
    const [state, setState] = React.useState<GymWeekState>(() => makeEmptyWeek(weekKey));
    const [hydrated, setHydrated] = React.useState(false);

    // Load persisted week when weekKey changes
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
            const next: GymWeekState = { ...next0, version: 3, updatedAt: new Date().toISOString() };
            void persistWeek(next);
            return next;
        });
    }, []);

    // Web-like APIs (used by the Web screen flow)
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
                        ...(prev.days ?? ({} as any)),
                        [dayKey]: {
                            ...day,
                            exercises: {
                                ...(day.exercises ?? {}),
                                [exerciseId]: nextEx,
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
                    days: { ...(prev.days ?? ({} as any)), [dayKey]: { ...day, durationMin } },
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
                    days: { ...(prev.days ?? ({} as any)), [dayKey]: { ...day, notes } },
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
                        ...(prev.days ?? ({} as any)),
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
                        ...(prev.days ?? ({} as any)),
                        [dayKey]: {
                            ...day,
                            exercises: { ...(day.exercises ?? {}), [exerciseId]: { ...ex, notes } },
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
                        ...(prev.days ?? ({} as any)),
                        [dayKey]: {
                            ...day,
                            exercises: { ...(day.exercises ?? {}), [exerciseId]: { ...ex, durationMin } },
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
                        ...(prev.days ?? ({} as any)),
                        [dayKey]: {
                            ...day,
                            exercises: { ...(day.exercises ?? {}), [exerciseId]: { ...ex, mediaPublicIds: nextIds } },
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
                        ...(prev.days ?? ({} as any)),
                        [dayKey]: {
                            ...day,
                            exercises: { ...(day.exercises ?? {}), [exerciseId]: { ...ex, mediaPublicIds: nextList } },
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

    /**
     * Hydrate local state from backend routine.meta.gymCheck
     * - merges remote into local (does NOT wipe local)
     * - persists to storage
     */
    const hydrateFromRemote = React.useCallback(
        (routine: unknown) => {
            const remote = extractRemoteGymCheck(routine);
            if (!remote) return;
            update((prev) => mergeRemoteIntoLocal(prev, remote));
        },
        [update]
    );

    /**
     * ==========================================================
     * Backwards-compatible RN APIs (aliases) to avoid breaking code
     * ==========================================================
     */

    const setDay = React.useCallback(
        (dayKey: DayKey, day: GymDayState) => {
            update((prev) => ({
                ...prev,
                days: { ...(prev.days ?? ({} as any)), [dayKey]: day },
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
                        ...(prev.days ?? ({} as any)),
                        [dayKey]: {
                            ...day,
                            exercises: { ...(day.exercises ?? {}), [exerciseId]: { ...exPrev, done } },
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
                        ...(prev.days ?? ({} as any)),
                        [dayKey]: {
                            ...day,
                            exercises: { ...(day.exercises ?? {}), [exerciseId]: { ...exPrev, ...patch } },
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
                    days: { ...(prev.days ?? ({} as any)), [dayKey]: { ...day, ...patch } },
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

    return {
        state,
        hydrated,

        // Web-like
        getDay,
        toggleExerciseDone,
        setDayDuration,
        setDayNotes,
        setDayMetrics,
        setExerciseNotes,
        setExerciseDuration,
        addExerciseMediaPublicId,
        removeExerciseMediaAt,
        resetWeek,
        hydrateFromRemote,
        clearLocalWeek,

        // RN legacy/compat
        setDay,
        setDayField,
        setMetricsField,
        setExerciseDone,
        setExerciseField,
    };
}