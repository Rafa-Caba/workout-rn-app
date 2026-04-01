// src/services/health/healthSync.service.ts

import type {
    HealthImportedSleep,
    HealthImportedWorkoutSessionMinimal,
} from "@/src/types/health/health.types";
import type { WorkoutDay, WorkoutSession } from "@/src/types/workoutDay.types";

import {
    ensureWorkoutDayExistsDays,
    getWorkoutDayServ,
    saveImportedSleepForDay,
    saveMinimalImportedSessionForDay,
} from "@/src/services/workout/days.service";
import { hasMeaningfulImportedSleep } from "@/src/utils/health/healthSleep.mapper";
import {
    hasMeaningfulImportedWorkoutMetrics,
} from "@/src/utils/health/healthWorkout.mapper";

/**
 * Sync result contracts
 */
export type HealthSleepSyncResult = {
    saved: boolean;
    day: WorkoutDay | null;
};

export type HealthSessionSyncResult = {
    saved: boolean;
    skippedReason: "duplicate" | "empty" | null;
    day: WorkoutDay | null;
};

export type HealthDaySyncResult = {
    sleep: HealthSleepSyncResult | null;
    sessions: HealthSessionSyncResult[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toExternalId(meta: unknown): string | null {
    if (!isRecord(meta)) return null;

    const externalId = meta.externalId;
    return typeof externalId === "string" && externalId.trim().length > 0
        ? externalId.trim()
        : null;
}

function isImportedSessionDuplicate(
    existingSession: WorkoutSession,
    incomingSession: HealthImportedWorkoutSessionMinimal
): boolean {
    const existingMeta = existingSession.meta ?? null;

    const existingExternalId = toExternalId(existingMeta);
    const incomingExternalId =
        typeof incomingSession.externalId === "string" && incomingSession.externalId.trim().length > 0
            ? incomingSession.externalId.trim()
            : null;

    if (existingExternalId && incomingExternalId && existingExternalId === incomingExternalId) {
        return true;
    }

    const existingSource = existingSession.meta?.source ?? null;
    const existingSourceDevice = existingSession.meta?.sourceDevice ?? null;
    const existingSessionKind = existingSession.meta?.sessionKind ?? null;

    return (
        existingSession.type === incomingSession.type &&
        (existingSession.startAt ?? null) === (incomingSession.startAt ?? null) &&
        (existingSession.endAt ?? null) === (incomingSession.endAt ?? null) &&
        existingSource === incomingSession.source &&
        existingSourceDevice === (incomingSession.sourceDevice ?? null) &&
        existingSessionKind === incomingSession.sessionKind
    );
}

/**
 * Bootstraps the day before saving imported data.
 */
export async function bootstrapHealthDay(date: string): Promise<void> {
    await ensureWorkoutDayExistsDays(date);
}

/**
 * Sleep save flow
 */
export async function syncImportedSleepForDay(
    date: string,
    sleep: HealthImportedSleep | null
): Promise<HealthSleepSyncResult> {
    if (!sleep) {
        return { saved: false, day: null };
    }

    if (!hasMeaningfulImportedSleep(sleep)) {
        return { saved: false, day: null };
    }

    await bootstrapHealthDay(date);

    const day = await saveImportedSleepForDay(
        {
            ...sleep,
            date,
        },
        "merge"
    );

    return { saved: true, day };
}

/**
 * Minimal session create flow
 */
export async function syncImportedWorkoutSessionForDay(
    date: string,
    session: HealthImportedWorkoutSessionMinimal | null
): Promise<HealthSessionSyncResult> {
    if (!session) {
        return { saved: false, skippedReason: "empty", day: null };
    }

    if (!hasMeaningfulImportedWorkoutMetrics(session.metrics)) {
        return { saved: false, skippedReason: "empty", day: null };
    }

    await bootstrapHealthDay(date);

    const dayBefore = await getWorkoutDayServ(date);
    const existingSessions = Array.isArray(dayBefore.training?.sessions)
        ? dayBefore.training.sessions
        : [];

    const duplicate = existingSessions.some((existingSession) =>
        isImportedSessionDuplicate(existingSession, session)
    );

    if (duplicate) {
        return { saved: false, skippedReason: "duplicate", day: dayBefore };
    }

    const day = await saveMinimalImportedSessionForDay(date, session, "merge");

    return {
        saved: true,
        skippedReason: null,
        day,
    };
}

/**
 * Combined sync flow for one day:
 * - save sleep if meaningful
 * - save imported sessions if meaningful and not duplicated
 */
export async function syncHealthDayData(
    date: string,
    payload: {
        sleep?: HealthImportedSleep | null;
        sessions?: HealthImportedWorkoutSessionMinimal[] | null;
    }
): Promise<HealthDaySyncResult> {
    const sleepResult = payload.sleep
        ? await syncImportedSleepForDay(date, payload.sleep)
        : null;

    const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    const sessionResults: HealthSessionSyncResult[] = [];

    for (const session of sessions) {
        const result = await syncImportedWorkoutSessionForDay(date, session);
        sessionResults.push(result);
    }

    return {
        sleep: sleepResult,
        sessions: sessionResults,
    };
}