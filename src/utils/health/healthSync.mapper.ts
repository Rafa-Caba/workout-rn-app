// src/utils/health/healthSync.mapper.ts

import type {
    HealthImportedSleep,
    HealthImportedWorkoutSessionMinimal,
} from "@/src/types/health.types";
import type {
    SleepBlock,
    WorkoutSessionUpsert,
} from "@/src/types/workoutDay.types";
import { hasMeaningfulImportedSleep, mapImportedSleepToSleepBlock } from "@/src/utils/health/healthSleep.mapper";
import {
    hasMeaningfulImportedWorkoutMetrics,
    mapImportedWorkoutToMinimalDaySession,
    resolveImportedWorkoutDate,
} from "@/src/utils/health/healthWorkout.mapper";

/**
 * Sync-oriented mapper helpers.
 * These are intentionally higher-level than sleep/workout mappers and return
 * grouped data ready for healthSync.service / bootstrap hooks.
 */

export type HealthDaySyncCandidate = {
    date: string;
    sleep: SleepBlock | null;
    sessions: WorkoutSessionUpsert[];
};

function ensureDayBucket(
    map: Map<string, HealthDaySyncCandidate>,
    date: string
): HealthDaySyncCandidate {
    const existing = map.get(date);
    if (existing) {
        return existing;
    }

    const created: HealthDaySyncCandidate = {
        date,
        sleep: null,
        sessions: [],
    };

    map.set(date, created);
    return created;
}

export function buildHealthDaySyncCandidate(input: {
    date: string;
    sleep?: HealthImportedSleep | null;
    sessions?: HealthImportedWorkoutSessionMinimal[] | null;
}): HealthDaySyncCandidate {
    const sessions = Array.isArray(input.sessions) ? input.sessions : [];

    return {
        date: input.date,
        sleep:
            input.sleep && hasMeaningfulImportedSleep(input.sleep)
                ? mapImportedSleepToSleepBlock(input.sleep)
                : null,
        sessions: sessions
            .filter((session) => hasMeaningfulImportedWorkoutMetrics(session.metrics))
            .map((session) => mapImportedWorkoutToMinimalDaySession(session)),
    };
}

export function groupImportedSessionsByDate(
    sessions: HealthImportedWorkoutSessionMinimal[]
): Map<string, WorkoutSessionUpsert[]> {
    const grouped = new Map<string, WorkoutSessionUpsert[]>();

    for (const session of sessions) {
        if (!hasMeaningfulImportedWorkoutMetrics(session.metrics)) {
            continue;
        }

        const date = resolveImportedWorkoutDate(session);
        if (!date) {
            continue;
        }

        const current = grouped.get(date) ?? [];
        current.push(mapImportedWorkoutToMinimalDaySession(session));
        grouped.set(date, current);
    }

    return grouped;
}

export function buildHealthDaySyncCandidates(input: {
    sleeps?: HealthImportedSleep[] | null;
    sessions?: HealthImportedWorkoutSessionMinimal[] | null;
}): HealthDaySyncCandidate[] {
    const result = new Map<string, HealthDaySyncCandidate>();

    const sleeps = Array.isArray(input.sleeps) ? input.sleeps : [];
    const sessions = Array.isArray(input.sessions) ? input.sessions : [];

    for (const sleep of sleeps) {
        if (!hasMeaningfulImportedSleep(sleep)) {
            continue;
        }

        const bucket = ensureDayBucket(result, sleep.date);
        bucket.sleep = mapImportedSleepToSleepBlock(sleep);
    }

    for (const session of sessions) {
        if (!hasMeaningfulImportedWorkoutMetrics(session.metrics)) {
            continue;
        }

        const date = resolveImportedWorkoutDate(session);
        if (!date) {
            continue;
        }

        const bucket = ensureDayBucket(result, date);
        bucket.sessions.push(mapImportedWorkoutToMinimalDaySession(session));
    }

    return Array.from(result.values()).sort((a, b) => a.date.localeCompare(b.date));
}