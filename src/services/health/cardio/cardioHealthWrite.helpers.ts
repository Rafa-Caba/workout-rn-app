// src/services/health/cardio/cardioHealthWrite.helpers.ts
// Shared helpers for Health Connect / HealthKit write flows.

import type { CardioHealthWriteBackendPatch } from "@/src/types/health/cardio/cardioHealthWrite.types";
import type { CardioLiveSessionSnapshot } from "@/src/types/health/cardio/cardioLiveSession.types";
import type {
    ISODateTime,
    WorkoutActivityType,
    WorkoutHealthWriteStatus,
    WorkoutSession,
    WorkoutSessionMeta,
} from "@/src/types/workoutDay.types";

export function toIsoNow(): ISODateTime {
    return new Date().toISOString();
}

export function getErrorMessage(error: unknown, fallback: string): string {
    const message = error instanceof Error ? error.message : fallback;

    if (message.includes("Length is not valid")) {
        return "Health Connect no aceptó la ruta de esta sesión porque necesita más puntos válidos. La sesión quedó guardada en Workout App.";
    }

    return message;
}

export function isFinitePositiveNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getSessionActivityType(session: WorkoutSession): Exclude<WorkoutActivityType, null> {
    return session.activityType === "running" ? "running" : "walking";
}

export function getSessionStartAt(session: WorkoutSession): string | null {
    return session.startAt ?? null;
}

export function getSessionEndAt(session: WorkoutSession): string | null {
    return session.endAt ?? null;
}

export function getSessionDistanceKm(
    session: WorkoutSession,
    snapshot: CardioLiveSessionSnapshot | null
): number | null {
    return (
        session.distanceKm ??
        session.cardioMetrics?.distanceKm ??
        snapshot?.distanceKm ??
        null
    );
}

export function getSessionActiveKcal(session: WorkoutSession): number | null {
    return session.activeKcal ?? null;
}


export function getSessionExternalId(session: WorkoutSession): string {
    const existingExternalId = session.meta?.externalId;

    if (typeof existingExternalId === "string" && existingExternalId.trim().length > 0) {
        return existingExternalId.trim();
    }

    const activityType = getSessionActivityType(session);
    const startAt = session.startAt ?? "unknown-start";

    return `app-live|${activityType}|${startAt}`;
}

export function buildHealthWriteMetaPatch(
    currentMeta: WorkoutSessionMeta | null,
    patch: CardioHealthWriteBackendPatch
): WorkoutSessionMeta {
    return {
        ...(currentMeta ?? {}),
        healthWriteStatus: patch.healthWriteStatus,
        healthExternalId: patch.healthExternalId,
        healthWrittenAt: patch.healthWrittenAt,
        lastSyncedAt: patch.healthWrittenAt ?? currentMeta?.lastSyncedAt ?? null,
    };
}

export function buildFallbackHealthWritePatch(
    status: WorkoutHealthWriteStatus,
    externalId: string | null,
    writtenAt: ISODateTime | null
): CardioHealthWriteBackendPatch {
    return {
        healthWriteStatus: status,
        healthExternalId: externalId,
        healthWrittenAt: writtenAt,
    };
}
