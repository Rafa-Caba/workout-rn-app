// src/utils/health/outdoor/outdoorSession.mapper.ts

import type {
    HealthImportedOutdoorMetrics,
    HealthImportedOutdoorSession,
    OutdoorActivityType,
} from "@/src/types/health/healthOutdoor.types";
import type {
    ISODateTime,
    WorkoutOutdoorMetrics,
    WorkoutSession,
    WorkoutSessionMeta,
} from "@/src/types/workoutDay.types";
import { mapOutdoorRouteToSummary } from "@/src/utils/health/outdoor/outdoorRoute.mapper";
import {
    buildOutdoorSessionTitleFromImported,
    isOutdoorActivityType,
} from "@/src/utils/health/outdoor/outdoorSession.helpers";

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function toIsoNow(): ISODateTime {
    return new Date().toISOString();
}

function resolveDurationSeconds(input: {
    explicitDurationSeconds: number | null | undefined;
    startAt: string | null | undefined;
    endAt: string | null | undefined;
}): number | null {
    if (isFiniteNumber(input.explicitDurationSeconds) && input.explicitDurationSeconds >= 0) {
        return Math.round(input.explicitDurationSeconds);
    }

    if (!input.startAt || !input.endAt) {
        return null;
    }

    const startMs = new Date(input.startAt).getTime();
    const endMs = new Date(input.endAt).getTime();

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return null;
    }

    return Math.round((endMs - startMs) / 1000);
}

function resolveActivityType(
    session: HealthImportedOutdoorSession
): OutdoorActivityType {
    if (isOutdoorActivityType(session.activityType)) {
        return session.activityType;
    }

    const normalizedType = (session.providerWorkoutType ?? "").trim().toLowerCase();

    if (normalizedType.includes("run")) {
        return "running";
    }

    return "walking";
}

function buildSessionId(session: HealthImportedOutdoorSession): string {
    if (typeof session.externalId === "string" && session.externalId.trim().length > 0) {
        return session.externalId.trim();
    }

    return [
        session.source,
        resolveActivityType(session),
        session.startAt ?? "",
        session.endAt ?? "",
        session.metrics.distanceKm ?? "",
        session.metrics.durationSeconds ?? "",
    ].join("|");
}

export function mapImportedOutdoorMetricsToWorkoutOutdoorMetrics(
    metrics: HealthImportedOutdoorMetrics
): WorkoutOutdoorMetrics {
    return {
        distanceKm: metrics.distanceKm ?? null,
        steps: metrics.steps ?? null,
        elevationGainM: metrics.elevationGainM ?? null,
        paceSecPerKm: metrics.paceSecPerKm ?? null,
        avgSpeedKmh: metrics.avgSpeedKmh ?? null,
        maxSpeedKmh: metrics.maxSpeedKmh ?? null,
        cadenceRpm: metrics.cadenceRpm ?? null,
        strideLengthM: metrics.strideLengthM ?? null,
    };
}

export function mapImportedOutdoorSessionToWorkoutSessionMeta(
    session: HealthImportedOutdoorSession
): WorkoutSessionMeta {
    return {
        source: session.source,
        sourceDevice: session.sourceDevice ?? null,
        importedAt: session.importedAt ?? toIsoNow(),
        lastSyncedAt: session.lastSyncedAt ?? toIsoNow(),
        sessionKind: "device-import",

        externalId: session.externalId ?? null,
        originalType: session.providerWorkoutType ?? null,
        provider: session.source === "healthkit" ? "healthkit" : "health-connect",
    };
}

export function mapImportedOutdoorSessionToWorkoutSession(
    session: HealthImportedOutdoorSession
): WorkoutSession {
    const resolvedActivityType = resolveActivityType(session);
    const resolvedRouteSummary = mapOutdoorRouteToSummary(session.route);

    return {
        id: buildSessionId(session),
        type: buildOutdoorSessionTitleFromImported({
            ...session,
            activityType: resolvedActivityType,
        }),

        activityType: resolvedActivityType,

        startAt: session.startAt ?? null,
        endAt: session.endAt ?? null,

        durationSeconds: resolveDurationSeconds({
            explicitDurationSeconds: session.metrics.durationSeconds,
            startAt: session.startAt,
            endAt: session.endAt,
        }),

        activeKcal: session.metrics.activeKcal ?? null,
        totalKcal: session.metrics.totalKcal ?? null,

        avgHr: session.metrics.avgHr ?? null,
        maxHr: session.metrics.maxHr ?? null,

        distanceKm: session.metrics.distanceKm ?? null,
        steps: session.metrics.steps ?? null,
        elevationGainM: session.metrics.elevationGainM ?? null,

        paceSecPerKm: session.metrics.paceSecPerKm ?? null,
        cadenceRpm: session.metrics.cadenceRpm ?? null,

        hasRoute: (session.route?.hasRoute ?? false) || resolvedRouteSummary !== null,
        routeSummary: resolvedRouteSummary,
        outdoorMetrics: mapImportedOutdoorMetricsToWorkoutOutdoorMetrics(session.metrics),

        effortRpe: null,

        notes: session.notes ?? null,
        media: null,
        exercises: null,

        meta: mapImportedOutdoorSessionToWorkoutSessionMeta(session),
    };
}