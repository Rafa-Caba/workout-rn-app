// src/utils/health/cardio/cardioSessionPayload.mapper.ts
// Converts normalized cardio sessions into strict API-safe create/patch payloads.

import type {
    CreateSessionBody,
    PatchSessionBody,
} from "@/src/services/workout/sessions.service";
import type {
    WorkoutCardioMetrics,
    WorkoutHealthWriteStatus,
    WorkoutRoutePoint,
    WorkoutRouteSummary,
    WorkoutSession,
    WorkoutSessionDataSource,
    WorkoutSessionKind,
    WorkoutSessionMeta,
} from "@/src/types/workoutDay.types";

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function normalizeNullableString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeBoundedString(value: unknown, maxLength: number): string | null {
    const normalized = normalizeNullableString(value);
    return normalized === null ? null : normalized.slice(0, maxLength);
}

function normalizeNullableNonNegativeNumber(value: unknown): number | null {
    return isFiniteNumber(value) && value >= 0 ? value : null;
}

function normalizeNullableNonNegativeInteger(value: unknown): number | null {
    const normalized = normalizeNullableNonNegativeNumber(value);
    return normalized === null ? null : Math.round(normalized);
}

function normalizeNullableHeartRate(value: unknown): number | null {
    const normalized = normalizeNullableNonNegativeInteger(value);
    return normalized !== null && normalized <= 300 ? normalized : null;
}

function normalizeNullableRpe(value: unknown): number | null {
    return isFiniteNumber(value) && value >= 0 && value <= 10 ? value : null;
}

function normalizeSessionSource(value: unknown): WorkoutSessionDataSource | null {
    return value === "manual" ||
        value === "healthkit" ||
        value === "health-connect" ||
        value === "app-live"
        ? value
        : null;
}

function normalizeSessionKind(value: unknown): WorkoutSessionKind | null {
    return value === "device-import" ||
        value === "gym-check" ||
        value === "manual-cardio" ||
        value === "live-cardio"
        ? value
        : null;
}

function normalizeHealthWriteStatus(value: unknown): WorkoutHealthWriteStatus | null {
    return value === "pending" || value === "synced" || value === "failed"
        ? value
        : null;
}

function normalizeRoutePoint(point: WorkoutRoutePoint): WorkoutRoutePoint | null {
    if (
        !isFiniteNumber(point.latitude) ||
        point.latitude < -90 ||
        point.latitude > 90 ||
        !isFiniteNumber(point.longitude) ||
        point.longitude < -180 ||
        point.longitude > 180
    ) {
        return null;
    }

    const headingDeg =
        isFiniteNumber(point.headingDeg) &&
        point.headingDeg >= 0 &&
        point.headingDeg <= 360
            ? point.headingDeg
            : null;

    return {
        latitude: point.latitude,
        longitude: point.longitude,
        altitudeM: isFiniteNumber(point.altitudeM) ? point.altitudeM : null,
        accuracyM: normalizeNullableNonNegativeNumber(point.accuracyM),
        speedMps: normalizeNullableNonNegativeNumber(point.speedMps),
        headingDeg,
        recordedAt: normalizeNullableString(point.recordedAt),
    };
}

function normalizeRoutePoints(points: WorkoutRoutePoint[] | null): WorkoutRoutePoint[] | null {
    if (!Array.isArray(points)) return null;

    const normalized = points
        .map((point) => normalizeRoutePoint(point))
        .filter((point): point is WorkoutRoutePoint => point !== null);

    return normalized.length > 0 ? normalized : null;
}

function normalizeCoordinate(value: unknown, min: number, max: number): number | null {
    return isFiniteNumber(value) && value >= min && value <= max ? value : null;
}

function buildRouteSummaryFromPoints(points: WorkoutRoutePoint[]): WorkoutRouteSummary {
    const startPoint = points[0] ?? null;
    const endPoint = points[points.length - 1] ?? null;

    let minLatitude: number | null = null;
    let maxLatitude: number | null = null;
    let minLongitude: number | null = null;
    let maxLongitude: number | null = null;

    for (const point of points) {
        minLatitude = minLatitude === null ? point.latitude : Math.min(minLatitude, point.latitude);
        maxLatitude = maxLatitude === null ? point.latitude : Math.max(maxLatitude, point.latitude);
        minLongitude =
            minLongitude === null ? point.longitude : Math.min(minLongitude, point.longitude);
        maxLongitude =
            maxLongitude === null ? point.longitude : Math.max(maxLongitude, point.longitude);
    }

    return {
        pointCount: points.length,
        startLatitude: startPoint?.latitude ?? null,
        startLongitude: startPoint?.longitude ?? null,
        endLatitude: endPoint?.latitude ?? null,
        endLongitude: endPoint?.longitude ?? null,
        minLatitude,
        maxLatitude,
        minLongitude,
        maxLongitude,
    };
}

function normalizeRouteSummary(
    summary: WorkoutRouteSummary | null,
    points: WorkoutRoutePoint[] | null
): WorkoutRouteSummary | null {
    if (points && points.length > 0) {
        return buildRouteSummaryFromPoints(points);
    }

    if (!summary || !isFiniteNumber(summary.pointCount) || summary.pointCount < 0) {
        return null;
    }

    return {
        pointCount: Math.round(summary.pointCount),
        startLatitude: normalizeCoordinate(summary.startLatitude, -90, 90),
        startLongitude: normalizeCoordinate(summary.startLongitude, -180, 180),
        endLatitude: normalizeCoordinate(summary.endLatitude, -90, 90),
        endLongitude: normalizeCoordinate(summary.endLongitude, -180, 180),
        minLatitude: normalizeCoordinate(summary.minLatitude, -90, 90),
        maxLatitude: normalizeCoordinate(summary.maxLatitude, -90, 90),
        minLongitude: normalizeCoordinate(summary.minLongitude, -180, 180),
        maxLongitude: normalizeCoordinate(summary.maxLongitude, -180, 180),
    };
}

function normalizeCardioMetrics(
    metrics: WorkoutCardioMetrics | null,
    session: WorkoutSession
): WorkoutCardioMetrics | null {
    const source = metrics ?? {
        distanceKm: session.distanceKm,
        steps: session.steps,
        elevationGainM: session.elevationGainM,
        paceSecPerKm: session.paceSecPerKm,
        avgSpeedKmh: null,
        maxSpeedKmh: null,
        cadenceRpm: session.cadenceRpm,
        strideLengthM: null,
    };

    const normalized: WorkoutCardioMetrics = {
        distanceKm: normalizeNullableNonNegativeNumber(source.distanceKm),
        steps: normalizeNullableNonNegativeInteger(source.steps),
        elevationGainM: normalizeNullableNonNegativeNumber(source.elevationGainM),
        paceSecPerKm: normalizeNullableNonNegativeNumber(source.paceSecPerKm),
        avgSpeedKmh: normalizeNullableNonNegativeNumber(source.avgSpeedKmh),
        maxSpeedKmh: normalizeNullableNonNegativeNumber(source.maxSpeedKmh),
        cadenceRpm: normalizeNullableNonNegativeNumber(source.cadenceRpm),
        strideLengthM: normalizeNullableNonNegativeNumber(source.strideLengthM),
    };

    return Object.values(normalized).some((value) => value !== null) ? normalized : null;
}

function buildStrictMeta(meta: WorkoutSessionMeta | null): Record<string, unknown> | null {
    if (!meta) return null;

    const strictMeta: Record<string, unknown> = {
        sessionKey: normalizeBoundedString(meta.sessionKey, 120),
        trainingSource: normalizeBoundedString(meta.trainingSource, 120),
        dayEffortRpe: normalizeNullableRpe(meta.dayEffortRpe),
        totalKcalEstimated:
            typeof meta.totalKcalEstimated === "boolean" ? meta.totalKcalEstimated : null,
        source: normalizeSessionSource(meta.source),
        sourceDevice: normalizeBoundedString(meta.sourceDevice, 200),
        importedAt: normalizeBoundedString(meta.importedAt, 60),
        lastSyncedAt: normalizeBoundedString(meta.lastSyncedAt, 60),
        sessionKind: normalizeSessionKind(meta.sessionKind),
        healthWriteStatus: normalizeHealthWriteStatus(meta.healthWriteStatus),
        healthExternalId: normalizeBoundedString(meta.healthExternalId, 200),
        healthWrittenAt: normalizeBoundedString(meta.healthWrittenAt, 60),
        externalId: normalizeBoundedString(meta.externalId, 200),
        originalType: normalizeBoundedString(meta.originalType, 200),
        provider: normalizeBoundedString(meta.provider, 120),
    };

    return strictMeta;
}

function buildSharedPayload(session: WorkoutSession): PatchSessionBody {
    const routePoints = normalizeRoutePoints(session.routePoints);
    const routeSummary = normalizeRouteSummary(session.routeSummary, routePoints);
    const cardioMetrics = normalizeCardioMetrics(session.cardioMetrics, session);
    const hasRoute = Boolean(
        (routePoints && routePoints.length > 0) ||
            (routeSummary && routeSummary.pointCount > 0)
    );

    return {
        type: normalizeBoundedString(session.type, 120) ?? "Cardio",
        activityType: session.activityType,
        cardioEnvironment: session.cardioEnvironment,
        startAt: normalizeNullableString(session.startAt),
        endAt: normalizeNullableString(session.endAt),
        durationSeconds: normalizeNullableNonNegativeInteger(session.durationSeconds),
        activeKcal: normalizeNullableNonNegativeInteger(session.activeKcal),
        totalKcal: normalizeNullableNonNegativeInteger(session.totalKcal),
        avgHr: normalizeNullableHeartRate(session.avgHr),
        maxHr: normalizeNullableHeartRate(session.maxHr),
        distanceKm: normalizeNullableNonNegativeNumber(session.distanceKm),
        steps: normalizeNullableNonNegativeInteger(session.steps),
        elevationGainM: normalizeNullableNonNegativeNumber(session.elevationGainM),
        paceSecPerKm: normalizeNullableNonNegativeNumber(session.paceSecPerKm),
        cadenceRpm: normalizeNullableNonNegativeNumber(session.cadenceRpm),
        hasRoute,
        routeSummary,
        routePoints,
        cardioMetrics,
        effortRpe: normalizeNullableRpe(session.effortRpe),
        notes: normalizeBoundedString(session.notes, 5000),
        meta: buildStrictMeta(session.meta),
    };
}

/**
 * Full canonical body used only when creating a new cardio session.
 * Media is intentionally excluded because it has dedicated endpoints.
 */
export function toCardioCreateSessionBody(session: WorkoutSession): CreateSessionBody {
    return {
        ...buildSharedPayload(session),
        type: normalizeBoundedString(session.type, 120) ?? "Cardio",
        exercises: null,
    };
}

/**
 * Strict patch body used for an existing imported/app-live cardio session.
 * Unrelated gym exercises and media are never rewritten by a cardio resync.
 */
export function toCardioPatchSessionBody(session: WorkoutSession): PatchSessionBody {
    return buildSharedPayload(session);
}

/**
 * Stable JSON comparison for deciding whether a dedicated PATCH is necessary.
 */
export function areCardioSessionPayloadsEqual(
    current: WorkoutSession,
    next: WorkoutSession
): boolean {
    return (
        JSON.stringify(toCardioPatchSessionBody(current)) ===
        JSON.stringify(toCardioPatchSessionBody(next))
    );
}
