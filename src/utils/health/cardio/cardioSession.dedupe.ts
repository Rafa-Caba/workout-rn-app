// /src/utils/health/cardio/cardioSession.dedupe.ts

import type { HealthImportedCardioSession } from "@/src/types/health/healthCardio.types";
import type { WorkoutCardioEnvironment, WorkoutSession } from "@/src/types/workoutDay.types";
import { isCardioActivityType, resolveWorkoutSessionCardioEnvironment } from "@/src/utils/health/cardio/cardioSession.helpers";
import { mapImportedCardioSessionToWorkoutSession } from "@/src/utils/health/cardio/cardioSession.mapper";

type CardioSessionLike = {
    externalId: string | null;
    activityType: string | null;
    cardioEnvironment: WorkoutCardioEnvironment;
    startAt: string | null;
    endAt: string | null;
    durationSeconds: number | null;
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

function toMillis(value: string | null | undefined): number | null {
    if (!value) {
        return null;
    }

    const result = new Date(value).getTime();
    return Number.isFinite(result) ? result : null;
}

function isCloseNumber(
    left: number | null | undefined,
    right: number | null | undefined,
    tolerance: number
): boolean {
    if (!isFiniteNumber(left) || !isFiniteNumber(right)) {
        return false;
    }

    return Math.abs(left - right) <= tolerance;
}

function isCloseDateTime(
    left: string | null | undefined,
    right: string | null | undefined,
    toleranceMs: number
): boolean {
    const leftMs = toMillis(left);
    const rightMs = toMillis(right);

    if (leftMs === null || rightMs === null) {
        return false;
    }

    return Math.abs(leftMs - rightMs) <= toleranceMs;
}

function toCardioSessionLikeFromWorkoutSession(session: WorkoutSession): CardioSessionLike {
    return {
        externalId: normalizeString(session.meta?.externalId ?? null) || null,
        activityType: isCardioActivityType(session.activityType) ? session.activityType : null,
        cardioEnvironment: resolveWorkoutSessionCardioEnvironment(session),
        startAt: session.startAt ?? null,
        endAt: session.endAt ?? null,
        durationSeconds: session.durationSeconds ?? null,
        distanceKm: session.distanceKm ?? null,
        source: session.meta?.source ?? null,
    };
}

function toCardioSessionLikeFromImported(
    session: HealthImportedCardioSession
): CardioSessionLike {
    return {
        externalId: normalizeString(session.externalId) || null,
        activityType: session.activityType,
        cardioEnvironment: session.cardioEnvironment,
        startAt: session.startAt ?? null,
        endAt: session.endAt ?? null,
        durationSeconds: session.metrics.durationSeconds ?? null,
        distanceKm: session.metrics.distanceKm ?? null,
        source: session.source,
    };
}

export function buildCardioSessionSignature(session: CardioSessionLike): string {
    const externalId = normalizeString(session.externalId);
    if (externalId) {
        return `external:${externalId}`;
    }

    return [
        normalizeString(session.source),
        normalizeString(session.activityType),
        normalizeString(session.cardioEnvironment),
        normalizeString(session.startAt),
        normalizeString(session.endAt),
        normalizeNumber(session.durationSeconds),
        normalizeNumber(session.distanceKm),
    ].join("|");
}

export function isSameCardioSession(
    existing: WorkoutSession,
    incoming: HealthImportedCardioSession | WorkoutSession
): boolean {
    const existingLike = toCardioSessionLikeFromWorkoutSession(existing);

    const incomingLike =
        "metrics" in incoming
            ? toCardioSessionLikeFromImported(incoming)
            : toCardioSessionLikeFromWorkoutSession(incoming);

    const existingExternalId = normalizeString(existingLike.externalId);
    const incomingExternalId = normalizeString(incomingLike.externalId);

    if (existingExternalId && incomingExternalId) {
        return existingExternalId === incomingExternalId;
    }

    return (
        normalizeString(existingLike.source) === normalizeString(incomingLike.source) &&
        normalizeString(existingLike.activityType) === normalizeString(incomingLike.activityType) &&
        normalizeString(existingLike.cardioEnvironment) === normalizeString(incomingLike.cardioEnvironment) &&
        normalizeString(existingLike.startAt) === normalizeString(incomingLike.startAt) &&
        normalizeString(existingLike.endAt) === normalizeString(incomingLike.endAt) &&
        normalizeNumber(existingLike.durationSeconds) ===
        normalizeNumber(incomingLike.durationSeconds) &&
        normalizeNumber(existingLike.distanceKm) === normalizeNumber(incomingLike.distanceKm)
    );
}

function isHealthImportedCardioWorkoutSession(session: WorkoutSession): boolean {
    const source = session.meta?.source ?? null;
    const sessionKind = session.meta?.sessionKind ?? null;

    return (
        isCardioActivityType(session.activityType) &&
        sessionKind === "device-import" &&
        (source === "healthkit" || source === "health-connect")
    );
}

function isManualCardioFallbackSession(session: WorkoutSession): boolean {
    const source = session.meta?.source ?? null;
    const sessionKind = session.meta?.sessionKind ?? null;

    return (
        isCardioActivityType(session.activityType) &&
        source === "manual" &&
        (sessionKind === "manual-cardio" || sessionKind === null || sessionKind === undefined)
    );
}

/**
 * Manual fallback sessions will not have second-level precision like provider imports,
 * so we match them with relaxed tolerances when a real Health import arrives later.
 */
function isSameManualFallbackAsImported(
    existingManual: WorkoutSession,
    importedIncoming: WorkoutSession
): boolean {
    const existingLike = toCardioSessionLikeFromWorkoutSession(existingManual);
    const incomingLike = toCardioSessionLikeFromWorkoutSession(importedIncoming);

    if (
        normalizeString(existingLike.activityType) !== normalizeString(incomingLike.activityType) ||
        normalizeString(existingLike.cardioEnvironment) !== normalizeString(incomingLike.cardioEnvironment)
    ) {
        return false;
    }

    const startMatches = isCloseDateTime(existingLike.startAt, incomingLike.startAt, 15 * 60 * 1000);
    if (!startMatches) {
        return false;
    }

    const endMatches = isCloseDateTime(existingLike.endAt, incomingLike.endAt, 15 * 60 * 1000);
    const durationMatches = isCloseNumber(
        existingLike.durationSeconds,
        incomingLike.durationSeconds,
        15 * 60
    );

    if (!endMatches && !durationMatches) {
        return false;
    }

    const bothHaveDistance =
        isFiniteNumber(existingLike.distanceKm) && isFiniteNumber(incomingLike.distanceKm);

    if (bothHaveDistance) {
        return isCloseNumber(existingLike.distanceKm, incomingLike.distanceKm, 0.5);
    }

    return true;
}

export function mergeCardioSessionsIntoExistingSessions(
    existingSessions: WorkoutSession[],
    importedSessions: HealthImportedCardioSession[]
): {
    mergedSessions: WorkoutSession[];
    insertedCount: number;
    updatedCount: number;
    unchangedCount: number;
} {
    const mergedSessions = [...existingSessions];
    const mappedIncomingSessions = importedSessions.map((session) =>
        mapImportedCardioSessionToWorkoutSession(session)
    );

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const incomingSession of mappedIncomingSessions) {
        const importedExistingIndex = mergedSessions.findIndex((existingSession) => {
            if (!isHealthImportedCardioWorkoutSession(existingSession)) {
                return false;
            }

            return isSameCardioSession(existingSession, incomingSession);
        });

        const manualFallbackIndex =
            importedExistingIndex >= 0
                ? -1
                : mergedSessions.findIndex((existingSession) => {
                    if (!isManualCardioFallbackSession(existingSession)) {
                        return false;
                    }

                    return isSameManualFallbackAsImported(existingSession, incomingSession);
                });

        const existingIndex =
            importedExistingIndex >= 0 ? importedExistingIndex : manualFallbackIndex;

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

        const currentSignature = buildCardioSessionSignature(
            toCardioSessionLikeFromWorkoutSession(currentSession)
        );

        const incomingSignature = buildCardioSessionSignature(
            toCardioSessionLikeFromWorkoutSession(incomingSession)
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
