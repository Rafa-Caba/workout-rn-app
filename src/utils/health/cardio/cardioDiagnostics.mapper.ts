// src/utils/health/cardio/cardioDiagnostics.mapper.ts
// Builds bounded JSON-safe cardio diagnostic projections for local troubleshooting.

import { toHealthDiagnosticJson } from "@/src/services/health/diagnostics/healthDiagnostics.service";
import type { HealthImportedCardioSession } from "@/src/types/health/cardio/healthCardio.types";
import type {
    HealthCardioDiagnosticRoute,
    HealthCardioDiagnosticSession,
    HealthCardioPersistenceOperation,
} from "@/src/types/health/healthDiagnostics.types";
import type { WorkoutSession } from "@/src/types/workoutDay.types";
import { toCardioPatchSessionBody } from "@/src/utils/health/cardio/cardioSessionPayload.mapper";

const MAX_DIAGNOSTIC_ROUTE_POINTS = 30;

function toDiagnosticRoute(
    session: HealthImportedCardioSession
): HealthCardioDiagnosticRoute {
    const route = session.route;
    const allPoints = route?.points ?? [];
    const points = allPoints.slice(0, MAX_DIAGNOSTIC_ROUTE_POINTS).map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        altitudeM: point.altitudeM,
        accuracyM: point.accuracyM,
        speedMps: point.speedMps,
        headingDeg: point.headingDeg,
        recordedAt: point.recordedAt,
    }));

    return {
        hasRoute: route?.hasRoute === true && allPoints.length > 0,
        pointCount: allPoints.length,
        pointsStored: points.length,
        pointsTruncated: allPoints.length > points.length,
        points,
        summary: toHealthDiagnosticJson(route?.routeSummary ?? null),
        raw: toHealthDiagnosticJson(route?.raw ?? null),
    };
}

export function toHealthCardioDiagnosticSession(
    session: HealthImportedCardioSession
): HealthCardioDiagnosticSession {
    return {
        externalId: session.externalId,
        date: session.date,
        activityType: session.activityType,
        cardioEnvironment: session.cardioEnvironment,
        providerWorkoutType: session.providerWorkoutType,
        startAt: session.startAt,
        endAt: session.endAt,
        source: session.source,
        sourceDevice: session.sourceDevice,
        metrics: {
            durationSeconds: session.metrics.durationSeconds,
            activeKcal: session.metrics.activeKcal,
            totalKcal: session.metrics.totalKcal,
            totalKcalEstimated: session.metrics.totalKcalEstimated === true,
            avgHr: session.metrics.avgHr,
            maxHr: session.metrics.maxHr,
            distanceKm: session.metrics.distanceKm,
            steps: session.metrics.steps,
            elevationGainM: session.metrics.elevationGainM,
            paceSecPerKm: session.metrics.paceSecPerKm,
            avgSpeedKmh: session.metrics.avgSpeedKmh,
            maxSpeedKmh: session.metrics.maxSpeedKmh,
            cadenceRpm: session.metrics.cadenceRpm,
            effortRpe: session.metrics.effortRpe,
            strideLengthM: session.metrics.strideLengthM,
        },
        route: toDiagnosticRoute(session),
        raw: toHealthDiagnosticJson(session.raw),
    };
}

export function toHealthCardioPersistenceOperation(input: {
    operation: "create" | "patch";
    session: WorkoutSession;
    sessionId: string | null;
}): HealthCardioPersistenceOperation {
    return {
        operation: input.operation,
        sessionId: input.sessionId,
        externalId:
            typeof input.session.meta?.externalId === "string"
                ? input.session.meta.externalId
                : null,
        activityType: input.session.activityType,
        payload: toHealthDiagnosticJson(toCardioPatchSessionBody(input.session)),
    };
}
