// src/utils/health/cardio/cardioSession.mapper.ts

import type {
    CardioActivityType,
    HealthImportedCardioMetrics,
    HealthImportedCardioSession,
} from "@/src/types/health/cardio/healthCardio.types";
import type {
    ISODateTime,
    WorkoutCardioMetrics,
    WorkoutSession,
    WorkoutSessionMeta,
} from "@/src/types/workoutDay.types";
import { resolveImportedCardioEnvironment } from "@/src/utils/health/cardio/cardioEnvironment.mapper";
import {
    resolveAverageSpeedKmh,
    resolvePaceSecPerKm,
} from "@/src/utils/health/cardio/cardioImportedMetrics.utils";
import {
    mapCardioRouteToSummary,
    mapCardioRouteToWorkoutRoutePoints,
} from "@/src/utils/health/cardio/cardioRoute.mapper";
import {
    buildCardioSessionTitleFromImported,
    isCardioActivityType,
} from "@/src/utils/health/cardio/cardioSession.helpers";

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

function resolveEffortRpe(value: number | null | undefined): number | null {
    if (!isFiniteNumber(value) || value < 0 || value > 10) {
        return null;
    }

    return Math.round(value * 10) / 10;
}

function resolveActivityType(
    session: HealthImportedCardioSession
): CardioActivityType {
    if (isCardioActivityType(session.activityType)) {
        return session.activityType;
    }

    const normalizedType = (session.providerWorkoutType ?? "").trim().toLowerCase();

    if (normalizedType.includes("run")) {
        return "running";
    }

    return "walking";
}

function buildSessionId(session: HealthImportedCardioSession): string {
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

export function mapImportedCardioMetricsToWorkoutCardioMetrics(
    metrics: HealthImportedCardioMetrics
): WorkoutCardioMetrics {
    return {
        distanceKm: metrics.distanceKm ?? null,
        steps: metrics.steps ?? null,
        elevationGainM: metrics.elevationGainM ?? null,
        paceSecPerKm: resolvePaceSecPerKm({
            paceSecPerKm: metrics.paceSecPerKm,
            distanceKm: metrics.distanceKm,
            durationSeconds: metrics.durationSeconds,
        }),
        avgSpeedKmh: resolveAverageSpeedKmh({
            avgSpeedKmh: metrics.avgSpeedKmh,
            distanceKm: metrics.distanceKm,
            durationSeconds: metrics.durationSeconds,
        }),
        maxSpeedKmh: metrics.maxSpeedKmh ?? null,
        cadenceRpm: metrics.cadenceRpm ?? null,
        strideLengthM: metrics.strideLengthM ?? null,
    };
}

export function mapImportedCardioSessionToWorkoutSessionMeta(
    session: HealthImportedCardioSession
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
        healthExternalId: session.externalId ?? null,
        totalKcalEstimated: session.metrics.totalKcalEstimated === true,
    };
}

export function mapImportedCardioSessionToWorkoutSession(
    session: HealthImportedCardioSession
): WorkoutSession {
    const resolvedActivityType = resolveActivityType(session);
    const resolvedRouteSummary = mapCardioRouteToSummary(session.route);
    const resolvedRoutePoints = mapCardioRouteToWorkoutRoutePoints(session.route);
    const resolvedDurationSeconds = resolveDurationSeconds({
        explicitDurationSeconds: session.metrics.durationSeconds,
        startAt: session.startAt,
        endAt: session.endAt,
    });
    const resolvedPaceSecPerKm = resolvePaceSecPerKm({
        paceSecPerKm: session.metrics.paceSecPerKm,
        distanceKm: session.metrics.distanceKm,
        durationSeconds: resolvedDurationSeconds,
    });
    const resolvedCardioEnvironment = resolveImportedCardioEnvironment({
        providerWorkoutType: session.providerWorkoutType,
        raw: session.raw,
        route: session.route,
        routeSummary: resolvedRouteSummary,
        hasRoute: session.route?.hasRoute ?? false,
    }) ?? session.cardioEnvironment ?? null;

    return {
        id: buildSessionId(session),
        type: buildCardioSessionTitleFromImported({
            ...session,
            activityType: resolvedActivityType,
            cardioEnvironment: resolvedCardioEnvironment,
        }),

        activityType: resolvedActivityType,
        cardioEnvironment: resolvedCardioEnvironment,

        startAt: session.startAt ?? null,
        endAt: session.endAt ?? null,

        durationSeconds: resolvedDurationSeconds,

        activeKcal: session.metrics.activeKcal ?? null,
        totalKcal: session.metrics.totalKcal ?? null,

        avgHr: session.metrics.avgHr ?? null,
        maxHr: session.metrics.maxHr ?? null,

        distanceKm: session.metrics.distanceKm ?? null,
        steps: session.metrics.steps ?? null,
        elevationGainM: session.metrics.elevationGainM ?? null,

        paceSecPerKm: resolvedPaceSecPerKm,
        cadenceRpm: session.metrics.cadenceRpm ?? null,

        hasRoute: (session.route?.hasRoute ?? false) || resolvedRouteSummary !== null,
        routeSummary: resolvedRouteSummary,
        routePoints: resolvedRoutePoints,
        cardioMetrics: mapImportedCardioMetricsToWorkoutCardioMetrics({
            ...session.metrics,
            durationSeconds: resolvedDurationSeconds,
            paceSecPerKm: resolvedPaceSecPerKm,
        }),

        effortRpe: resolveEffortRpe(session.metrics.effortRpe),

        notes: session.notes ?? null,
        media: null,
        exercises: null,

        meta: mapImportedCardioSessionToWorkoutSessionMeta(session),
    };
}
