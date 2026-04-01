// src/utils/health/outdoor/outdoorSession.dedupe.ts

import type { HealthImportedOutdoorSession } from "@/src/types/health/healthOutdoor.types";
import type { WorkoutSession } from "@/src/types/workoutDay.types";
import { isOutdoorActivityType } from "@/src/utils/health/outdoor/outdoorSession.helpers";
import { mapImportedOutdoorSessionToWorkoutSession } from "@/src/utils/health/outdoor/outdoorSession.mapper";

type OutdoorSessionLike = {
    externalId: string | null;
    activityType: string | null;
    startAt: string | null;
    endAt: string | null;
    distanceKm: number | null;
    source: string | null;
};

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function normalizeString(value: string | null | undefined): string {
    return (value ?? "").trim();
}

function normalizeNumber(value: number | null | undefined): string {
    return isFiniteNumber(value) ? String(Math.round(value * 1000) / 1000) : "";
}

function toOutdoorSessionLikeFromWorkoutSession(session: WorkoutSession): OutdoorSessionLike {
    return {
        externalId: normalizeString(session.meta?.externalId ?? null) || null,
        activityType: isOutdoorActivityType(session.activityType) ? session.activityType : null,
        startAt: session.startAt ?? null,
        endAt: session.endAt ?? null,
        distanceKm: session.distanceKm ?? null,
        source: session.meta?.source ?? null,
    };
}

function toOutdoorSessionLikeFromImported(
    session: HealthImportedOutdoorSession
): OutdoorSessionLike {
    return {
        externalId: normalizeString(session.externalId) || null,
        activityType: session.activityType,
        startAt: session.startAt ?? null,
        endAt: session.endAt ?? null,
        distanceKm: session.metrics.distanceKm ?? null,
        source: session.source,
    };
}

export function buildOutdoorSessionSignature(session: OutdoorSessionLike): string {
    const externalId = normalizeString(session.externalId);
    if (externalId) {
        return `external:${externalId}`;
    }

    return [
        normalizeString(session.source),
        normalizeString(session.activityType),
        normalizeString(session.startAt),
        normalizeString(session.endAt),
        normalizeNumber(session.distanceKm),
    ].join("|");
}

export function isSameOutdoorSession(
    existing: WorkoutSession,
    incoming: HealthImportedOutdoorSession | WorkoutSession
): boolean {
    const existingLike = toOutdoorSessionLikeFromWorkoutSession(existing);

    const incomingLike =
        "metrics" in incoming
            ? toOutdoorSessionLikeFromImported(incoming)
            : toOutdoorSessionLikeFromWorkoutSession(incoming);

    const existingExternalId = normalizeString(existingLike.externalId);
    const incomingExternalId = normalizeString(incomingLike.externalId);

    if (existingExternalId && incomingExternalId) {
        return existingExternalId === incomingExternalId;
    }

    return (
        normalizeString(existingLike.source) === normalizeString(incomingLike.source) &&
        normalizeString(existingLike.activityType) === normalizeString(incomingLike.activityType) &&
        normalizeString(existingLike.startAt) === normalizeString(incomingLike.startAt) &&
        normalizeString(existingLike.endAt) === normalizeString(incomingLike.endAt) &&
        normalizeNumber(existingLike.distanceKm) === normalizeNumber(incomingLike.distanceKm)
    );
}

function isHealthImportedOutdoorWorkoutSession(session: WorkoutSession): boolean {
    const source = session.meta?.source ?? null;
    const sessionKind = session.meta?.sessionKind ?? null;

    return (
        isOutdoorActivityType(session.activityType) &&
        sessionKind === "device-import" &&
        (source === "healthkit" || source === "health-connect")
    );
}

export function mergeOutdoorSessionsIntoExistingSessions(
    existingSessions: WorkoutSession[],
    importedSessions: HealthImportedOutdoorSession[]
): {
    mergedSessions: WorkoutSession[];
    insertedCount: number;
    updatedCount: number;
    unchangedCount: number;
} {
    const mergedSessions = [...existingSessions];
    const mappedIncomingSessions = importedSessions.map((session) =>
        mapImportedOutdoorSessionToWorkoutSession(session)
    );

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const incomingSession of mappedIncomingSessions) {
        const existingIndex = mergedSessions.findIndex((existingSession) => {
            if (!isHealthImportedOutdoorWorkoutSession(existingSession)) {
                return false;
            }

            return isSameOutdoorSession(existingSession, incomingSession);
        });

        if (existingIndex < 0) {
            mergedSessions.push(incomingSession);
            insertedCount += 1;
            continue;
        }

        const currentSession = mergedSessions[existingIndex];
        if (!currentSession) {
            mergedSessions.push(incomingSession);
            insertedCount += 1;
            continue;
        }

        const currentSignature = buildOutdoorSessionSignature(
            toOutdoorSessionLikeFromWorkoutSession(currentSession)
        );

        const incomingSignature = buildOutdoorSessionSignature(
            toOutdoorSessionLikeFromWorkoutSession(incomingSession)
        );

        if (
            currentSignature === incomingSignature &&
            JSON.stringify(currentSession) === JSON.stringify(incomingSession)
        ) {
            unchangedCount += 1;
            continue;
        }

        mergedSessions[existingIndex] = incomingSession;
        updatedCount += 1;
    }

    return {
        mergedSessions,
        insertedCount,
        updatedCount,
        unchangedCount,
    };
}