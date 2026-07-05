// src/utils/health/cardio/cardioSession.dedupe.ts
// Dedupe and merge logic for imported Cardio sessions.
// Handles device-import sessions, manual-cardio fallbacks, and future app-live
// sessions that later reappear through HealthKit / Health Connect backfill.

import type { HealthImportedCardioSession } from "@/src/types/health/cardio/healthCardio.types";
import type {
    WorkoutCardioEnvironment,
    WorkoutCardioMetrics,
    WorkoutSession,
    WorkoutSessionDataSource,
    WorkoutSessionKind,
} from "@/src/types/workoutDay.types";
import {
    isCardioActivityType,
    resolveWorkoutSessionCardioEnvironment,
} from "@/src/utils/health/cardio/cardioSession.helpers";
import { mapImportedCardioSessionToWorkoutSession } from "@/src/utils/health/cardio/cardioSession.mapper";

export type CardioSessionLike = {
    externalIds: string[];
    activityType: string | null;
    cardioEnvironment: WorkoutCardioEnvironment;
    startAt: string | null;
    endAt: string | null;
    durationSeconds: number | null;
    distanceKm: number | null;
    source: WorkoutSessionDataSource | null;
    sessionKind: WorkoutSessionKind | null;
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

function uniqueNonEmptyStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(
        new Set(
            values
                .map((value) => normalizeString(value))
                .filter((value) => value.length > 0)
        )
    );
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

function environmentsAreCompatibleForFuzzyMatch(
    left: WorkoutCardioEnvironment,
    right: WorkoutCardioEnvironment
): boolean {
    if (left === right) {
        return true;
    }

    return left === null || right === null;
}

function hasExternalIdOverlap(left: string[], right: string[]): boolean {
    if (left.length === 0 || right.length === 0) {
        return false;
    }

    const rightSet = new Set(right);
    return left.some((value) => rightSet.has(value));
}

function toCardioSessionLikeFromWorkoutSession(session: WorkoutSession): CardioSessionLike {
    return {
        externalIds: uniqueNonEmptyStrings([
            session.meta?.externalId ?? null,
            session.meta?.healthExternalId ?? null,
        ]),
        activityType: isCardioActivityType(session.activityType) ? session.activityType : null,
        cardioEnvironment: resolveWorkoutSessionCardioEnvironment(session),
        startAt: session.startAt ?? null,
        endAt: session.endAt ?? null,
        durationSeconds: session.durationSeconds ?? null,
        distanceKm: session.distanceKm ?? session.cardioMetrics?.distanceKm ?? null,
        source: session.meta?.source ?? null,
        sessionKind: session.meta?.sessionKind ?? null,
    };
}

function toCardioSessionLikeFromImported(
    session: HealthImportedCardioSession
): CardioSessionLike {
    return {
        externalIds: uniqueNonEmptyStrings([session.externalId]),
        activityType: session.activityType,
        cardioEnvironment: session.cardioEnvironment,
        startAt: session.startAt ?? null,
        endAt: session.endAt ?? null,
        durationSeconds: session.metrics.durationSeconds ?? null,
        distanceKm: session.metrics.distanceKm ?? null,
        source: session.source,
        sessionKind: "device-import",
    };
}

export function buildCardioSessionSignature(session: CardioSessionLike): string {
    const externalId = session.externalIds[0] ?? "";
    if (externalId) {
        return `external:${externalId}`;
    }

    return [
        normalizeString(session.source),
        normalizeString(session.sessionKind),
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

    if (hasExternalIdOverlap(existingLike.externalIds, incomingLike.externalIds)) {
        return true;
    }

    return (
        normalizeString(existingLike.source) === normalizeString(incomingLike.source) &&
        normalizeString(existingLike.sessionKind) === normalizeString(incomingLike.sessionKind) &&
        normalizeString(existingLike.activityType) === normalizeString(incomingLike.activityType) &&
        normalizeString(existingLike.cardioEnvironment) ===
        normalizeString(incomingLike.cardioEnvironment) &&
        normalizeString(existingLike.startAt) === normalizeString(incomingLike.startAt) &&
        normalizeString(existingLike.endAt) === normalizeString(incomingLike.endAt) &&
        normalizeNumber(existingLike.durationSeconds) === normalizeNumber(incomingLike.durationSeconds) &&
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

function isAppLiveCardioSession(session: WorkoutSession): boolean {
    return (
        isCardioActivityType(session.activityType) &&
        session.meta?.source === "app-live" &&
        session.meta?.sessionKind === "live-cardio"
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

function isSameFuzzyCardioSession(
    existingSession: WorkoutSession,
    incomingSession: WorkoutSession,
    options: {
        startToleranceMs: number;
        endToleranceMs: number;
        durationToleranceSeconds: number;
        distanceToleranceKm: number;
    }
): boolean {
    const existingLike = toCardioSessionLikeFromWorkoutSession(existingSession);
    const incomingLike = toCardioSessionLikeFromWorkoutSession(incomingSession);

    if (normalizeString(existingLike.activityType) !== normalizeString(incomingLike.activityType)) {
        return false;
    }

    if (
        !environmentsAreCompatibleForFuzzyMatch(
            existingLike.cardioEnvironment,
            incomingLike.cardioEnvironment
        )
    ) {
        return false;
    }

    const startMatches = isCloseDateTime(
        existingLike.startAt,
        incomingLike.startAt,
        options.startToleranceMs
    );
    if (!startMatches) {
        return false;
    }

    const endMatches = isCloseDateTime(
        existingLike.endAt,
        incomingLike.endAt,
        options.endToleranceMs
    );
    const durationMatches = isCloseNumber(
        existingLike.durationSeconds,
        incomingLike.durationSeconds,
        options.durationToleranceSeconds
    );

    if (!endMatches && !durationMatches) {
        return false;
    }

    const bothHaveDistance =
        isFiniteNumber(existingLike.distanceKm) && isFiniteNumber(incomingLike.distanceKm);

    if (bothHaveDistance) {
        return isCloseNumber(
            existingLike.distanceKm,
            incomingLike.distanceKm,
            options.distanceToleranceKm
        );
    }

    return true;
}

function mergeNullableNumber(current: number | null, incoming: number | null): number | null {
    return current ?? incoming ?? null;
}

function mergeCardioMetrics(
    current: WorkoutCardioMetrics | null,
    incoming: WorkoutCardioMetrics | null
): WorkoutCardioMetrics | null {
    if (!current && !incoming) {
        return null;
    }

    return {
        distanceKm: mergeNullableNumber(current?.distanceKm ?? null, incoming?.distanceKm ?? null),
        steps: mergeNullableNumber(current?.steps ?? null, incoming?.steps ?? null),
        elevationGainM: mergeNullableNumber(
            current?.elevationGainM ?? null,
            incoming?.elevationGainM ?? null
        ),
        paceSecPerKm: mergeNullableNumber(
            current?.paceSecPerKm ?? null,
            incoming?.paceSecPerKm ?? null
        ),
        avgSpeedKmh: mergeNullableNumber(
            current?.avgSpeedKmh ?? null,
            incoming?.avgSpeedKmh ?? null
        ),
        maxSpeedKmh: mergeNullableNumber(
            current?.maxSpeedKmh ?? null,
            incoming?.maxSpeedKmh ?? null
        ),
        cadenceRpm: mergeNullableNumber(current?.cadenceRpm ?? null, incoming?.cadenceRpm ?? null),
        strideLengthM: mergeNullableNumber(
            current?.strideLengthM ?? null,
            incoming?.strideLengthM ?? null
        ),
    };
}

function mergeExistingCardioSessionWithIncoming(
    existing: WorkoutSession,
    incoming: WorkoutSession
): WorkoutSession {
    const keepAppLiveIdentity = isAppLiveCardioSession(existing);
    const incomingExternalId = incoming.meta?.externalId ?? incoming.meta?.healthExternalId ?? null;

    return {
        ...existing,
        type: existing.type || incoming.type,
        activityType: existing.activityType ?? incoming.activityType,
        cardioEnvironment:
            existing.cardioEnvironment ?? incoming.cardioEnvironment ?? resolveWorkoutSessionCardioEnvironment(incoming),
        startAt: existing.startAt ?? incoming.startAt ?? null,
        endAt: existing.endAt ?? incoming.endAt ?? null,
        durationSeconds: mergeNullableNumber(existing.durationSeconds, incoming.durationSeconds),
        activeKcal: mergeNullableNumber(existing.activeKcal, incoming.activeKcal),
        totalKcal: mergeNullableNumber(existing.totalKcal, incoming.totalKcal),
        avgHr: mergeNullableNumber(existing.avgHr, incoming.avgHr),
        maxHr: mergeNullableNumber(existing.maxHr, incoming.maxHr),
        distanceKm: mergeNullableNumber(existing.distanceKm, incoming.distanceKm),
        steps: mergeNullableNumber(existing.steps, incoming.steps),
        elevationGainM: mergeNullableNumber(existing.elevationGainM, incoming.elevationGainM),
        paceSecPerKm: mergeNullableNumber(existing.paceSecPerKm, incoming.paceSecPerKm),
        cadenceRpm: mergeNullableNumber(existing.cadenceRpm, incoming.cadenceRpm),
        hasRoute: existing.hasRoute || incoming.hasRoute,
        routeSummary: existing.routeSummary ?? incoming.routeSummary ?? null,
        cardioMetrics: mergeCardioMetrics(existing.cardioMetrics, incoming.cardioMetrics),
        notes: existing.notes ?? incoming.notes ?? null,
        media: existing.media ?? incoming.media ?? null,
        exercises: existing.exercises ?? incoming.exercises ?? null,
        meta: {
            ...(incoming.meta ?? {}),
            ...(existing.meta ?? {}),
            provider: incoming.meta?.provider ?? existing.meta?.provider ?? null,
            originalType: existing.meta?.originalType ?? incoming.meta?.originalType ?? null,
            externalId: existing.meta?.externalId ?? incoming.meta?.externalId ?? null,
            healthExternalId: existing.meta?.healthExternalId ?? incomingExternalId ?? null,
            healthWriteStatus:
                keepAppLiveIdentity && incomingExternalId
                    ? "synced"
                    : existing.meta?.healthWriteStatus ?? incoming.meta?.healthWriteStatus ?? null,
            lastSyncedAt: incoming.meta?.lastSyncedAt ?? existing.meta?.lastSyncedAt ?? null,
            source: keepAppLiveIdentity ? "app-live" : incoming.meta?.source ?? existing.meta?.source ?? null,
            sessionKind: keepAppLiveIdentity
                ? "live-cardio"
                : incoming.meta?.sessionKind ?? existing.meta?.sessionKind ?? null,
        },
    };
}

function replaceExistingWithImportedSession(
    existing: WorkoutSession,
    incoming: WorkoutSession
): WorkoutSession {
    return {
        ...incoming,
        id: existing.id,
        notes: existing.notes ?? incoming.notes ?? null,
        media: existing.media ?? incoming.media ?? null,
        exercises: existing.exercises ?? incoming.exercises ?? null,
    };
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

        const appLiveExistingIndex =
            importedExistingIndex >= 0
                ? -1
                : mergedSessions.findIndex((existingSession) => {
                    if (!isAppLiveCardioSession(existingSession)) {
                        return false;
                    }

                    return (
                        isSameCardioSession(existingSession, incomingSession) ||
                        isSameFuzzyCardioSession(existingSession, incomingSession, {
                            startToleranceMs: 5 * 60 * 1000,
                            endToleranceMs: 5 * 60 * 1000,
                            durationToleranceSeconds: 5 * 60,
                            distanceToleranceKm: 0.2,
                        })
                    );
                });

        const manualFallbackIndex =
            importedExistingIndex >= 0 || appLiveExistingIndex >= 0
                ? -1
                : mergedSessions.findIndex((existingSession) => {
                    if (!isManualCardioFallbackSession(existingSession)) {
                        return false;
                    }

                    return isSameFuzzyCardioSession(existingSession, incomingSession, {
                        startToleranceMs: 15 * 60 * 1000,
                        endToleranceMs: 15 * 60 * 1000,
                        durationToleranceSeconds: 15 * 60,
                        distanceToleranceKm: 0.5,
                    });
                });

        const existingIndex =
            importedExistingIndex >= 0
                ? importedExistingIndex
                : appLiveExistingIndex >= 0
                    ? appLiveExistingIndex
                    : manualFallbackIndex;

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

        const nextSession = isAppLiveCardioSession(currentSession)
            ? mergeExistingCardioSessionWithIncoming(currentSession, incomingSession)
            : replaceExistingWithImportedSession(currentSession, incomingSession);

        if (JSON.stringify(currentSession) === JSON.stringify(nextSession)) {
            unchangedCount += 1;
            continue;
        }

        mergedSessions[existingIndex] = nextSession;
        updatedCount += 1;
    }

    return {
        mergedSessions,
        insertedCount,
        updatedCount,
        unchangedCount,
    };
}
