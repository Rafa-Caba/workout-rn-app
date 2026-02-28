// /src/services/workout/days.service.ts
import { api } from "@/src/services/http.client";
import type { DaySummary } from "@/src/types/workout.types";
import type { SleepBlock, WorkoutDay, WorkoutSession } from "@/src/types/workoutDay.types";

function isFiniteNumber(n: unknown): n is number {
    return typeof n === "number" && Number.isFinite(n);
}

function sumNullable(nums: Array<number | null | undefined>): number {
    let total = 0;
    for (const n of nums) {
        if (isFiniteNumber(n)) total += n;
    }
    return total;
}

function maxNullable(nums: Array<number | null | undefined>): number | null {
    let max: number | null = null;
    for (const n of nums) {
        if (!isFiniteNumber(n)) continue;
        if (max === null || n > max) max = n;
    }
    return max;
}

function avgFromSessionAvgs(sessions: WorkoutSession[]): number | null {
    const values = sessions.map((s) => s.avgHr).filter((v): v is number => isFiniteNumber(v));
    if (!values.length) return null;
    const total = values.reduce((a, b) => a + b, 0);
    return Math.round(total / values.length);
}

function countMedia(sessions: WorkoutSession[]): number {
    let count = 0;
    for (const s of sessions) {
        const media = s.media ?? null;
        if (Array.isArray(media)) count += media.length;
    }
    return count;
}

function emptyDaySummary(date: string): DaySummary {
    return {
        date,
        weekKey: null,
        sleep: null,
        training: {
            sessionsCount: 0,
            durationSeconds: 0,
            activeKcal: null,
            totalKcal: null,
            avgHr: null,
            maxHr: null,
            distanceKm: null,
            steps: null,
            mediaCount: 0,
        },
        notes: null,
        tags: null,
    };
}

export function buildDaySummaryFromWorkoutDay(day: WorkoutDay): DaySummary {
    const sessions: WorkoutSession[] = Array.isArray(day.training?.sessions) ? day.training!.sessions! : [];

    const durationSeconds = sumNullable(sessions.map((s) => s.durationSeconds));

    const activeKcalSum = sumNullable(sessions.map((s) => s.activeKcal));
    const totalKcalSum = sumNullable(sessions.map((s) => s.totalKcal));

    const avgHr = avgFromSessionAvgs(sessions);
    const maxHr = maxNullable(sessions.map((s) => s.maxHr));

    const distanceKmSum = sumNullable(sessions.map((s) => s.distanceKm));
    const stepsSum = sumNullable(sessions.map((s) => s.steps));

    const mediaCount = countMedia(sessions);

    return {
        date: day.date,
        weekKey: day.weekKey ?? null,

        sleep: day.sleep
            ? {
                timeAsleepMinutes: day.sleep.timeAsleepMinutes ?? null,
                score: day.sleep.score ?? null,
                awakeMinutes: day.sleep.awakeMinutes ?? null,
                remMinutes: day.sleep.remMinutes ?? null,
                coreMinutes: day.sleep.coreMinutes ?? null,
                deepMinutes: day.sleep.deepMinutes ?? null,
                source: day.sleep.source ?? null,
            }
            : null,

        training: {
            sessionsCount: sessions.length,
            durationSeconds,

            activeKcal: activeKcalSum > 0 ? activeKcalSum : null,
            totalKcal: totalKcalSum > 0 ? totalKcalSum : null,

            avgHr,
            maxHr,

            distanceKm: distanceKmSum > 0 ? distanceKmSum : null,
            steps: stepsSum > 0 ? stepsSum : null,

            mediaCount,
        },

        notes: day.notes ?? null,
        tags: day.tags ?? null,
    };
}

function toStatus(e: any): number | null {
    return e?.status ?? e?.response?.status ?? null;
}

export async function getWorkoutDayServ(date: string): Promise<WorkoutDay> {
    const res = await api.get(`/workout/days/${encodeURIComponent(date)}`);
    const data = res.data as unknown;

    // Backend returns `null` for missing days — treat as NOT_FOUND.
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        const err: any = new Error("Workout day not found");
        err.status = 404;
        err.code = "NOT_FOUND";
        err.details = { date };
        throw err;
    }

    return data as WorkoutDay;
}

export async function getDaySummary(date: string): Promise<DaySummary> {
    try {
        const day = await getWorkoutDayServ(date);
        return buildDaySummaryFromWorkoutDay(day);
    } catch (e: any) {
        if (toStatus(e) === 404) return emptyDaySummary(date);
        throw e;
    }
}

/**
 * Ensures a workout day exists, because some endpoints may 404 if the day doc doesn't exist yet.
 * NOTE: PUT /days/:date already upserts, so this is mostly useful for older endpoints.
 */
export async function ensureWorkoutDayExistsDays(date: string): Promise<void> {
    try {
        await api.get(`/workout/days/${encodeURIComponent(date)}`);
        return;
    } catch (e: any) {
        const status = toStatus(e);
        if (status !== 404) throw e;
    }

    const minimalBody = {
        sleep: null,
        training: null,
        notes: null,
        tags: null,
        meta: null,
    };

    await api.put(`/workout/days/${encodeURIComponent(date)}`, minimalBody);
}

/** =========================================================
 * Upsert helpers
 * ========================================================= */

export type UpsertMode = "merge" | "replace";

export type WorkoutDayUpsertBody = {
    sleep?: SleepBlock | null;
    training?: WorkoutDay["training"] | null;
    notes?: string | null;
    tags?: string[] | null;
    meta?: Record<string, unknown> | null;
};

/**
 * Generic upsert for WorkoutDay.
 * Uses backend route: PUT /workout/days/:date?mode=merge|replace
 */
export async function upsertWorkoutDay(date: string, body: WorkoutDayUpsertBody, mode: UpsertMode = "merge"): Promise<WorkoutDay> {
    const res = await api.put(`/workout/days/${encodeURIComponent(date)}`, body, { params: { mode } });
    return res.data as WorkoutDay;
}

function coerceNullableInt(v: unknown): number | null {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.trunc(n));
}

function coerceNullableScore(v: unknown): number | null {
    const n = coerceNullableInt(v);
    if (n === null) return null;
    return Math.max(0, Math.min(100, n));
}

/**
 * Sleep-specific upsert:
 * - merge mode by default (only updates sleep block)
 * - supports clearing sleep by passing null
 */
export async function updateSleepForDay(date: string, sleep: Partial<SleepBlock> | null, mode: UpsertMode = "merge"): Promise<WorkoutDay> {
    if (sleep === null) {
        return upsertWorkoutDay(date, { sleep: null }, mode);
    }

    const normalized: SleepBlock = {
        timeAsleepMinutes: coerceNullableInt(sleep.timeAsleepMinutes),
        timeInBedMinutes: coerceNullableInt(sleep.timeInBedMinutes),
        score: coerceNullableScore(sleep.score),

        awakeMinutes: coerceNullableInt(sleep.awakeMinutes),
        remMinutes: coerceNullableInt(sleep.remMinutes),
        coreMinutes: coerceNullableInt(sleep.coreMinutes),
        deepMinutes: coerceNullableInt(sleep.deepMinutes),

        source: typeof sleep.source === "string" ? (sleep.source.trim() ? sleep.source.trim() : null) : sleep.source ?? null,
        raw: (sleep.raw as unknown) ?? null,
    };

    return upsertWorkoutDay(date, { sleep: normalized }, mode);
}