// src/services/health/cardio/cardioBackfill.service.ts
// Builds Health backfill payloads using the Cardio import pipeline instead of
// generic minimal workout sessions. This keeps walking/running mapped to
// activityType + cardioEnvironment + cardioMetrics + routeSummary.

import { getCardioHealthProvider, readCardioSessions } from "@/src/services/health/cardio/cardioHealth.service";
import { readHealthSleepByDate } from "@/src/services/health/health.service";
import { getWorkoutDayServ } from "@/src/services/workout/days.service";
import type { HealthImportedCardioSession } from "@/src/types/health/cardio/healthCardio.types";
import type {
    ISODate,
    UpsertMode,
    WorkoutDay,
    WorkoutDayUpsertBody,
    WorkoutSession,
} from "@/src/types/workoutDay.types";
import { mergeCardioSessionsIntoExistingSessions } from "@/src/utils/health/cardio/cardioSession.dedupe";
import { mapImportedCardioSessionToWorkoutSession } from "@/src/utils/health/cardio/cardioSession.mapper";
import {
    hasMeaningfulImportedSleep,
    mapImportedSleepToSleepBlock,
} from "@/src/utils/health/healthSleep.mapper";

export type CardioBackfillPayloadResult = {
    date: ISODate;
    payload: WorkoutDayUpsertBody | null;
    importedCardioSessions: HealthImportedCardioSession[];
    mappedCardioSessions: WorkoutSession[];
    existingDay: WorkoutDay | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toHttpStatus(error: unknown): number | null {
    if (!isRecord(error)) {
        return null;
    }

    if (typeof error.status === "number") {
        return error.status;
    }

    const response = error.response;
    if (!isRecord(response)) {
        return null;
    }

    return typeof response.status === "number" ? response.status : null;
}

async function safeGetWorkoutDay(date: ISODate): Promise<WorkoutDay | null> {
    try {
        return await getWorkoutDayServ(date);
    } catch (error: unknown) {
        if (toHttpStatus(error) === 404) {
            return null;
        }

        throw error;
    }
}

function getExistingSessions(day: WorkoutDay | null): WorkoutSession[] {
    const sessions = day?.training?.sessions ?? null;
    return Array.isArray(sessions) ? sessions : [];
}

async function readImportedCardioSessionsForDate(
    date: ISODate
): Promise<HealthImportedCardioSession[]> {
    const provider = await getCardioHealthProvider();

    if (!provider) {
        return [];
    }

    const result = await readCardioSessions({
        provider,
        date,
        activityTypes: ["walking", "running"],
        includeRoutes: true,
    });

    return result.sessions.filter((session) => session.date === date);
}

function buildTrainingSessionsForMode(input: {
    mode: UpsertMode;
    existingDay: WorkoutDay | null;
    importedSessions: HealthImportedCardioSession[];
}): WorkoutSession[] {
    const mappedSessions = input.importedSessions.map((session) =>
        mapImportedCardioSessionToWorkoutSession(session)
    );

    if (input.mode === "replace") {
        return mappedSessions;
    }

    const mergeResult = mergeCardioSessionsIntoExistingSessions(
        getExistingSessions(input.existingDay),
        input.importedSessions
    );

    return mergeResult.mergedSessions;
}

export async function buildCardioBackfillPayloadForDate(input: {
    date: ISODate;
    mode: UpsertMode;
}): Promise<CardioBackfillPayloadResult> {
    const [sleep, importedCardioSessions] = await Promise.all([
        readHealthSleepByDate({ date: input.date }),
        readImportedCardioSessionsForDate(input.date),
    ]);

    const existingDay = input.mode === "merge" ? await safeGetWorkoutDay(input.date) : null;

    const mappedSleep =
        sleep && hasMeaningfulImportedSleep(sleep)
            ? mapImportedSleepToSleepBlock({
                ...sleep,
                date: input.date,
            })
            : null;

    const mappedCardioSessions = importedCardioSessions.map((session) =>
        mapImportedCardioSessionToWorkoutSession(session)
    );

    const shouldIncludeTraining = importedCardioSessions.length > 0;
    const shouldIncludeSleep = mappedSleep !== null;

    if (!shouldIncludeSleep && !shouldIncludeTraining) {
        return {
            date: input.date,
            payload: null,
            importedCardioSessions,
            mappedCardioSessions,
            existingDay,
        };
    }

    const nextSessions = shouldIncludeTraining
        ? buildTrainingSessionsForMode({
            mode: input.mode,
            existingDay,
            importedSessions: importedCardioSessions,
        })
        : [];

    const payload: WorkoutDayUpsertBody = {
        ...(shouldIncludeSleep ? { sleep: mappedSleep } : {}),
        ...(shouldIncludeTraining
            ? {
                training: {
                    source: importedCardioSessions[0]?.source ?? existingDay?.training?.source ?? null,
                    dayEffortRpe: existingDay?.training?.dayEffortRpe ?? null,
                    raw: existingDay?.training?.raw ?? null,
                    sessions: nextSessions,
                },
            }
            : {}),
    };

    return {
        date: input.date,
        payload,
        importedCardioSessions,
        mappedCardioSessions,
        existingDay,
    };
}
