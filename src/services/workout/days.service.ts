// src/services/workout/days.service.ts

import { api } from "@/src/services/http.client";
import type {
    HealthImportedSleep,
    HealthImportedWorkoutSessionMinimal,
} from "@/src/types/health.types";
import type { DaySummary } from "@/src/types/workout.types";
import type {
    CalendarDayFull,
    SleepBlock,
    TrainingBlock,
    UpsertMode,
    WorkoutDataSource,
    WorkoutDay,
    WorkoutDayBackfillBody,
    WorkoutDayBackfillResult,
    WorkoutDayUpsertBody,
    WorkoutExercise,
    WorkoutExerciseMeta,
    WorkoutExerciseSet,
    WorkoutMediaItem,
    WorkoutSession,
    WorkoutSessionKind,
    WorkoutSessionMeta,
    WorkoutSessionUpsert,
    WorkoutSourceDevice,
} from "@/src/types/workoutDay.types";

/**
 * =========================================================
 * Runtime guards / normalizers
 * =========================================================
 */

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
    return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseWorkoutDataSource(value: unknown): WorkoutDataSource | null {
    return value === "manual" || value === "healthkit" || value === "health-connect"
        ? value
        : null;
}

function parseWorkoutSessionKind(value: unknown): WorkoutSessionKind | null {
    return value === "device-import" || value === "gym-check" ? value : null;
}

function parseNullableString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

function parseNullableNumber(value: unknown): number | null {
    return isFiniteNumber(value) ? value : null;
}

function parseNullableStringArray(value: unknown): string[] | null {
    return isStringArray(value) ? value : null;
}

function parseNullableMeta(value: unknown): Record<string, unknown> | null {
    return isRecord(value) ? value : null;
}

function parseWorkoutMediaItem(value: unknown): WorkoutMediaItem | null {
    if (!isRecord(value)) return null;

    const publicId = parseNullableString(value.publicId);
    const url = parseNullableString(value.url);

    if (!publicId || !url) return null;

    return {
        publicId,
        url,
        resourceType: value.resourceType === "video" ? "video" : "image",
        format: parseNullableString(value.format),
        createdAt: parseNullableString(value.createdAt) ?? new Date().toISOString(),
        meta: parseNullableMeta(value.meta),
    };
}

function parseWorkoutExerciseSet(value: unknown, fallbackIndex: number): WorkoutExerciseSet | null {
    if (!isRecord(value)) return null;

    return {
        setIndex: isFiniteNumber(value.setIndex) ? Math.trunc(value.setIndex) : fallbackIndex,
        reps: parseNullableNumber(value.reps),
        weight: parseNullableNumber(value.weight),
        unit: value.unit === "kg" ? "kg" : "lb",
        rpe: parseNullableNumber(value.rpe),
        isWarmup: value.isWarmup === true,
        isDropSet: value.isDropSet === true,
        tempo: parseNullableString(value.tempo),
        restSec: parseNullableNumber(value.restSec),
        tags: parseNullableStringArray(value.tags),
        meta: parseNullableMeta(value.meta),
    };
}

function parseWorkoutExerciseMeta(value: unknown): WorkoutExerciseMeta | null {
    if (!isRecord(value)) return null;

    const out: WorkoutExerciseMeta = { ...value };

    if (isRecord(value.gymCheck)) {
        out.gymCheck = {
            done: value.gymCheck.done === true,
            durationMin: parseNullableNumber(value.gymCheck.durationMin),
            mediaPublicIds: parseNullableStringArray(value.gymCheck.mediaPublicIds),
            exerciseId: parseNullableString(value.gymCheck.exerciseId),
        };
    }

    if (isRecord(value.plan)) {
        out.plan = {
            sets: parseNullableString(value.plan.sets),
            reps: parseNullableString(value.plan.reps),
            load: parseNullableString(value.plan.load),
            rpe: parseNullableString(value.plan.rpe),
            attachmentPublicIds: parseNullableStringArray(value.plan.attachmentPublicIds),
        };
    }

    return out;
}

function parseWorkoutExercise(value: unknown): WorkoutExercise | null {
    if (!isRecord(value)) return null;

    const id = parseNullableString(value.id);
    const name = parseNullableString(value.name);

    if (!id || !name) return null;

    const rawSets = Array.isArray(value.sets) ? value.sets : null;

    return {
        id,
        name,
        movementId: parseNullableString(value.movementId),
        movementName: parseNullableString(value.movementName),
        notes: parseNullableString(value.notes),
        sets:
            rawSets === null
                ? null
                : rawSets
                    .map((item, index) => parseWorkoutExerciseSet(item, index + 1))
                    .filter((item): item is WorkoutExerciseSet => item !== null),
        meta: parseWorkoutExerciseMeta(value.meta),
    };
}

function parseWorkoutSessionMeta(value: unknown): WorkoutSessionMeta | null {
    if (!isRecord(value)) return null;

    return {
        ...value,
        sessionKey: parseNullableString(value.sessionKey),
        trainingSource: parseNullableString(value.trainingSource),
        dayEffortRpe: parseNullableNumber(value.dayEffortRpe),
        source: parseWorkoutDataSource(value.source),
        sourceDevice: parseNullableString(value.sourceDevice) as WorkoutSourceDevice | null,
        importedAt: parseNullableString(value.importedAt),
        lastSyncedAt: parseNullableString(value.lastSyncedAt),
        sessionKind: parseWorkoutSessionKind(value.sessionKind),
        externalId: parseNullableString(value.externalId),
        originalType: parseNullableString(value.originalType),
        provider: parseNullableString(value.provider),
    };
}

function parseWorkoutSession(value: unknown): WorkoutSession | null {
    if (!isRecord(value)) return null;

    const id = parseNullableString(value.id);
    const type = parseNullableString(value.type);

    if (!id || !type) return null;

    const rawMedia = Array.isArray(value.media) ? value.media : null;
    const rawExercises = Array.isArray(value.exercises) ? value.exercises : null;

    return {
        id,
        type,
        startAt: parseNullableString(value.startAt),
        endAt: parseNullableString(value.endAt),
        durationSeconds: parseNullableNumber(value.durationSeconds),
        activeKcal: parseNullableNumber(value.activeKcal),
        totalKcal: parseNullableNumber(value.totalKcal),
        avgHr: parseNullableNumber(value.avgHr),
        maxHr: parseNullableNumber(value.maxHr),
        distanceKm: parseNullableNumber(value.distanceKm),
        steps: parseNullableNumber(value.steps),
        elevationGainM: parseNullableNumber(value.elevationGainM),
        paceSecPerKm: parseNullableNumber(value.paceSecPerKm),
        cadenceRpm: parseNullableNumber(value.cadenceRpm),
        effortRpe: parseNullableNumber(value.effortRpe),
        notes: parseNullableString(value.notes),
        media:
            rawMedia === null
                ? null
                : rawMedia
                    .map((item) => parseWorkoutMediaItem(item))
                    .filter((item): item is WorkoutMediaItem => item !== null),
        exercises:
            rawExercises === null
                ? null
                : rawExercises
                    .map((item) => parseWorkoutExercise(item))
                    .filter((item): item is WorkoutExercise => item !== null),
        meta: parseWorkoutSessionMeta(value.meta),
    };
}

function parseTrainingBlock(value: unknown): TrainingBlock | null {
    if (!isRecord(value)) return null;

    const rawSessions = Array.isArray(value.sessions) ? value.sessions : null;

    return {
        sessions:
            rawSessions === null
                ? null
                : rawSessions
                    .map((item) => parseWorkoutSession(item))
                    .filter((item): item is WorkoutSession => item !== null),
        source: parseWorkoutDataSource(value.source),
        dayEffortRpe: parseNullableNumber(value.dayEffortRpe),
        raw: value.raw ?? null,
    };
}

function parseSleepBlock(value: unknown): SleepBlock | null {
    if (!isRecord(value)) return null;

    return {
        timeAsleepMinutes: parseNullableNumber(value.timeAsleepMinutes),
        timeInBedMinutes: parseNullableNumber(value.timeInBedMinutes),
        score: parseNullableNumber(value.score),
        awakeMinutes: parseNullableNumber(value.awakeMinutes),
        remMinutes: parseNullableNumber(value.remMinutes),
        coreMinutes: parseNullableNumber(value.coreMinutes),
        deepMinutes: parseNullableNumber(value.deepMinutes),
        source: parseWorkoutDataSource(value.source),
        sourceDevice: parseNullableString(value.sourceDevice) as WorkoutSourceDevice | null,
        importedAt: parseNullableString(value.importedAt),
        lastSyncedAt: parseNullableString(value.lastSyncedAt),
        raw: value.raw ?? null,
    };
}

function parseWorkoutDay(value: unknown): WorkoutDay | null {
    if (!isRecord(value)) return null;

    const id = parseNullableString(value.id);
    const date = parseNullableString(value.date);
    const weekKey = parseNullableString(value.weekKey);

    if (!id || !date || !weekKey) return null;

    return {
        id,
        userId: parseNullableString(value.userId) ?? undefined,
        date,
        weekKey,
        sleep: value.sleep === null ? null : parseSleepBlock(value.sleep),
        training: value.training === null ? null : parseTrainingBlock(value.training),
        plannedRoutine: isRecord(value.plannedRoutine)
            ? {
                sessionType: parseNullableString(value.plannedRoutine.sessionType),
                focus: parseNullableString(value.plannedRoutine.focus),
                exercises: Array.isArray(value.plannedRoutine.exercises)
                    ? value.plannedRoutine.exercises
                        .filter((item): item is Record<string, unknown> => isRecord(item))
                        .map((item) => ({
                            id: parseNullableString(item.id) ?? "",
                            name: parseNullableString(item.name) ?? "",
                            movementId: parseNullableString(item.movementId),
                            movementName: parseNullableString(item.movementName),
                            sets: parseNullableNumber(item.sets),
                            reps: parseNullableString(item.reps),
                            rpe: parseNullableNumber(item.rpe),
                            load: parseNullableString(item.load),
                            notes: parseNullableString(item.notes),
                            attachmentPublicIds: parseNullableStringArray(item.attachmentPublicIds),
                        }))
                    : null,
                notes: parseNullableString(value.plannedRoutine.notes),
                tags: parseNullableStringArray(value.plannedRoutine.tags),
            }
            : null,
        plannedMeta: isRecord(value.plannedMeta)
            ? {
                plannedBy: parseNullableString(value.plannedMeta.plannedBy) ?? "",
                plannedAt: parseNullableString(value.plannedMeta.plannedAt) ?? "",
                source:
                    value.plannedMeta.source === "trainer" || value.plannedMeta.source === "template"
                        ? value.plannedMeta.source
                        : null,
            }
            : null,
        notes: parseNullableString(value.notes),
        tags: parseNullableStringArray(value.tags),
        meta: parseNullableMeta(value.meta),
        createdAt: parseNullableString(value.createdAt) ?? undefined,
        updatedAt: parseNullableString(value.updatedAt) ?? undefined,
    };
}

function parseWorkoutDayBackfillResult(value: unknown): WorkoutDayBackfillResult | null {
    if (!isRecord(value)) return null;

    const mode = value.mode === "replace" ? "replace" : "merge";
    const resultsRaw = Array.isArray(value.results) ? value.results : null;

    return {
        mode,
        total: parseNullableNumber(value.total) ?? 0,
        successCount: parseNullableNumber(value.successCount) ?? 0,
        failedCount: parseNullableNumber(value.failedCount) ?? 0,
        results:
            resultsRaw === null
                ? []
                : resultsRaw
                    .filter((item): item is Record<string, unknown> => isRecord(item))
                    .map((item) => ({
                        date: parseNullableString(item.date) ?? "",
                        ok: item.ok === true,
                        error: parseNullableString(item.error),
                        day:
                            item.day === null
                                ? null
                                : parseWorkoutDay(item.day) ?? (isRecord(item.day) ? item.day : null),
                    })),
    };
}

/**
 * =========================================================
 * Numeric helpers
 * =========================================================
 */

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

    for (const session of sessions) {
        const media = session.media ?? null;
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
    const sessions: WorkoutSession[] = Array.isArray(day.training?.sessions) ? day.training.sessions : [];

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

/**
 * =========================================================
 * Safe HTTP helpers
 * =========================================================
 */

function toStatus(error: unknown): number | null {
    if (!isRecord(error)) return null;

    const directStatus = error.status;
    if (typeof directStatus === "number") return directStatus;

    const response = error.response;
    if (!isRecord(response)) return null;

    return typeof response.status === "number" ? response.status : null;
}

function createNotFoundError(date: string): Error & {
    status: number;
    code: "NOT_FOUND";
    details: { date: string };
} {
    const error = new Error("Workout day not found") as Error & {
        status: number;
        code: "NOT_FOUND";
        details: { date: string };
    };

    error.status = 404;
    error.code = "NOT_FOUND";
    error.details = { date };

    return error;
}

/**
 * =========================================================
 * Day fetch / summaries
 * =========================================================
 */

export async function getWorkoutDayServ(date: string): Promise<WorkoutDay> {
    const res = await api.get(`/workout/days/${encodeURIComponent(date)}`);
    const parsed = parseWorkoutDay(res.data);

    /**
     * Backend returns null for missing days — treat as NOT_FOUND.
     */
    if (!parsed) {
        throw createNotFoundError(date);
    }

    return parsed;
}

export async function getDaySummary(date: string): Promise<DaySummary> {
    try {
        const day = await getWorkoutDayServ(date);
        return buildDaySummaryFromWorkoutDay(day);
    } catch (error: unknown) {
        if (toStatus(error) === 404) return emptyDaySummary(date);
        throw error;
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
    } catch (error: unknown) {
        const status = toStatus(error);
        if (status !== 404) throw error;
    }

    const minimalBody: WorkoutDayUpsertBody = {
        sleep: null,
        training: null,
        notes: null,
        tags: null,
        meta: null,
    };

    await api.put(`/workout/days/${encodeURIComponent(date)}`, minimalBody);
}

/**
 * =========================================================
 * Upsert helpers
 * =========================================================
 */

/**
 * Generic upsert for WorkoutDay.
 * Uses backend route: PUT /days/:date?mode=merge|replace
 */
export async function upsertWorkoutDay(
    date: string,
    body: WorkoutDayUpsertBody,
    mode: UpsertMode = "merge"
): Promise<WorkoutDay> {
    const res = await api.put(`/workout/days/${encodeURIComponent(date)}`, body, {
        params: { mode },
    });

    const parsed = parseWorkoutDay(res.data);
    if (!parsed) {
        throw new Error("Invalid workout day response");
    }

    return parsed;
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

function coerceNullableIsoDateTime(value: unknown): string | null {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function coerceNullableString(value: unknown): string | null {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

/**
 * Sleep-specific upsert:
 * - merge mode by default (only updates sleep block)
 * - supports clearing sleep by passing null
 * - supports sourceDevice / importedAt / lastSyncedAt
 */
export async function updateSleepForDay(
    date: string,
    sleep: Partial<SleepBlock> | null,
    mode: UpsertMode = "merge"
): Promise<WorkoutDay> {
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

        source:
            sleep.source === "manual" || sleep.source === "healthkit" || sleep.source === "health-connect"
                ? sleep.source
                : null,
        sourceDevice: coerceNullableString(sleep.sourceDevice) as WorkoutSourceDevice | null,
        importedAt: coerceNullableIsoDateTime(sleep.importedAt),
        lastSyncedAt: coerceNullableIsoDateTime(sleep.lastSyncedAt),

        raw: sleep.raw ?? null,
    };

    return upsertWorkoutDay(date, { sleep: normalized }, mode);
}

/**
 * Health sleep helper
 */
export async function saveImportedSleepForDay(
    importedSleep: HealthImportedSleep,
    mode: UpsertMode = "merge"
): Promise<WorkoutDay> {
    return updateSleepForDay(importedSleep.date, importedSleep, mode);
}

/**
 * =========================================================
 * Health import helpers for minimal automatic sessions
 * =========================================================
 */

/**
 * Builds a FE/BE-safe session meta block for imported sessions.
 */
export function buildImportedSessionMeta(
    input: Pick<
        HealthImportedWorkoutSessionMinimal,
        "source" | "sourceDevice" | "importedAt" | "lastSyncedAt" | "sessionKind"
    > & {
        externalId?: string | null;
        originalType?: string | null;
        provider?: string | null;
    }
): WorkoutSessionMeta {
    return {
        source: input.source,
        sourceDevice: input.sourceDevice ?? null,
        importedAt: input.importedAt ?? null,
        lastSyncedAt: input.lastSyncedAt ?? null,
        sessionKind: input.sessionKind ?? "device-import",
        externalId: input.externalId ?? null,
        originalType: input.originalType ?? null,
        provider: input.provider ?? null,
    };
}

/**
 * Maps a neutral health-imported session into a WorkoutDay session-upsert block.
 * No exercises are attached because this helper is intended for minimal device imports.
 */
export function buildMinimalImportedSessionUpsert(
    session: HealthImportedWorkoutSessionMinimal
): WorkoutSessionUpsert {
    return {
        type: session.type,
        startAt: session.startAt ?? null,
        endAt: session.endAt ?? null,

        durationSeconds: session.metrics.durationSeconds ?? null,

        activeKcal: session.metrics.activeKcal ?? null,
        totalKcal: session.metrics.totalKcal ?? null,

        avgHr: session.metrics.avgHr ?? null,
        maxHr: session.metrics.maxHr ?? null,

        distanceKm: session.metrics.distanceKm ?? null,
        steps: session.metrics.steps ?? null,
        elevationGainM: session.metrics.elevationGainM ?? null,

        paceSecPerKm: session.metrics.paceSecPerKm ?? null,
        cadenceRpm: session.metrics.cadenceRpm ?? null,

        effortRpe: session.metrics.effortRpe ?? null,

        notes: session.notes ?? null,
        exercises: null,
        media: null,

        meta: buildImportedSessionMeta({
            source: session.source,
            sourceDevice: session.sourceDevice,
            importedAt: session.importedAt,
            lastSyncedAt: session.lastSyncedAt,
            sessionKind: session.sessionKind satisfies WorkoutSessionKind,
            externalId: session.externalId ?? null,
            originalType: session.type,
        }),
    };
}

function matchesImportedSession(
    existing: WorkoutSession,
    incoming: HealthImportedWorkoutSessionMinimal
): boolean {
    const existingMeta = existing.meta ?? null;
    const incomingExternalId = incoming.externalId ?? null;
    const existingExternalId =
        typeof existingMeta?.externalId === "string" ? existingMeta.externalId : null;

    if (incomingExternalId && existingExternalId && incomingExternalId === existingExternalId) {
        return true;
    }

    const existingKind = existingMeta?.sessionKind ?? null;
    const incomingKind = incoming.sessionKind ?? "device-import";

    return (
        existing.type === incoming.type &&
        existing.startAt === (incoming.startAt ?? null) &&
        existing.endAt === (incoming.endAt ?? null) &&
        existingKind === incomingKind
    );
}

/**
 * Saves a minimal imported device session into workoutDay.training.sessions.
 * This helper preserves existing sessions and avoids obvious duplicates.
 */
export async function saveMinimalImportedSessionForDay(
    date: string,
    session: HealthImportedWorkoutSessionMinimal,
    mode: UpsertMode = "merge"
): Promise<WorkoutDay> {
    await ensureWorkoutDayExistsDays(date);

    let currentDay: WorkoutDay | null = null;

    try {
        currentDay = await getWorkoutDayServ(date);
    } catch (error: unknown) {
        if (toStatus(error) !== 404) throw error;
    }

    const existingSessions = Array.isArray(currentDay?.training?.sessions)
        ? currentDay.training.sessions
        : [];

    const alreadyExists = existingSessions.some((existing) =>
        matchesImportedSession(existing, session)
    );

    if (alreadyExists && currentDay) {
        return currentDay;
    }

    const nextSessions: WorkoutSessionUpsert[] = [
        ...existingSessions,
        buildMinimalImportedSessionUpsert(session),
    ];

    const nextTraining: WorkoutDayUpsertBody["training"] = {
        source: currentDay?.training?.source ?? session.source,
        dayEffortRpe: currentDay?.training?.dayEffortRpe ?? null,
        raw: currentDay?.training?.raw ?? null,
        sessions: nextSessions,
    };

    return upsertWorkoutDay(
        date,
        {
            training: nextTraining,
        },
        mode
    );
}

/**
 * =========================================================
 * Historical backfill
 * =========================================================
 */

export async function backfillWorkoutDayByDate(
    date: string,
    body: WorkoutDayUpsertBody,
    mode: UpsertMode = "merge"
): Promise<WorkoutDay> {
    const res = await api.post(`/workout/backfill/day/${encodeURIComponent(date)}`, body, {
        params: { mode },
    });

    const parsed = parseWorkoutDay(res.data);
    if (!parsed) {
        throw new Error("Invalid workout day backfill response");
    }

    return parsed;
}

export async function backfillWorkoutDaysRange(
    body: WorkoutDayBackfillBody
): Promise<WorkoutDayBackfillResult> {
    const res = await api.post("/workout/backfill/range", body);

    const parsed = parseWorkoutDayBackfillResult(res.data);
    if (!parsed) {
        throw new Error("Invalid workout range backfill response");
    }

    return parsed;
}

/**
 * =========================================================
 * Calendar helpers
 * =========================================================
 */

export function parseCalendarDayFull(value: unknown): CalendarDayFull | null {
    if (!isRecord(value)) return null;

    return {
        date: parseNullableString(value.date) ?? undefined,
        weekKey: parseNullableString(value.weekKey) ?? undefined,
        hasPlanned: typeof value.hasPlanned === "boolean" ? value.hasPlanned : undefined,
        hasSleep: typeof value.hasSleep === "boolean" ? value.hasSleep : undefined,
        hasTraining: typeof value.hasTraining === "boolean" ? value.hasTraining : undefined,
        sleep: value.sleep === null ? null : value.sleep !== undefined ? parseSleepBlock(value.sleep) : undefined,
        training:
            value.training === null
                ? null
                : value.training !== undefined
                    ? parseTrainingBlock(value.training)
                    : undefined,
        plannedRoutine: undefined,
        plannedMeta: undefined,
        notes: value.notes !== undefined ? parseNullableString(value.notes) : undefined,
        tags: value.tags !== undefined ? parseNullableStringArray(value.tags) : undefined,
        meta: value.meta !== undefined ? parseNullableMeta(value.meta) : undefined,
    };
}