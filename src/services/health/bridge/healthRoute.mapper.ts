// src/services/health/bridge/healthRoute.mapper.ts
// Native-health route normalizer shared by HealthKit and Health Connect bridges.
// It safely inspects unknown provider objects without fake type assertions.

import type {
    HealthImportedWorkoutRoute,
    HealthImportedWorkoutRoutePoint,
} from "@/src/types/health/cardio/health.types";

const MAX_NESTED_ROUTE_DEPTH = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function asString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableNonNegativeNumber(value: unknown): number | null {
    const parsed = asNumber(value);
    return parsed !== null && parsed >= 0 ? parsed : null;
}

function normalizeHeadingDegrees(value: unknown): number | null {
    const parsed = asNumber(value);
    return parsed !== null && parsed >= 0 && parsed <= 360 ? parsed : null;
}

function extractRoutePoint(rawPoint: unknown): HealthImportedWorkoutRoutePoint | null {
    if (!isRecord(rawPoint)) {
        return null;
    }

    const latitude =
        asNumber(rawPoint.latitude) ??
        asNumber(rawPoint.lat) ??
        asNumber(rawPoint.latitudeInDegrees);

    const longitude =
        asNumber(rawPoint.longitude) ??
        asNumber(rawPoint.lng) ??
        asNumber(rawPoint.lon) ??
        asNumber(rawPoint.longitudeInDegrees);

    if (latitude === null || longitude === null) {
        return null;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return null;
    }

    return {
        latitude,
        longitude,
        altitudeM:
            asNumber(rawPoint.altitude) ??
            asNumber(rawPoint.altitudeM) ??
            asNumber(rawPoint.elevation) ??
            null,
        accuracyM:
            normalizeNullableNonNegativeNumber(rawPoint.accuracy) ??
            normalizeNullableNonNegativeNumber(rawPoint.accuracyM) ??
            normalizeNullableNonNegativeNumber(rawPoint.horizontalAccuracy) ??
            normalizeNullableNonNegativeNumber(rawPoint.speedAccuracy) ??
            null,
        speedMps:
            normalizeNullableNonNegativeNumber(rawPoint.speed) ??
            normalizeNullableNonNegativeNumber(rawPoint.speedMps) ??
            normalizeNullableNonNegativeNumber(rawPoint.velocity) ??
            null,
        headingDeg:
            normalizeHeadingDegrees(rawPoint.heading) ??
            normalizeHeadingDegrees(rawPoint.headingDeg) ??
            normalizeHeadingDegrees(rawPoint.bearing) ??
            null,
        recordedAt:
            asString(rawPoint.time) ??
            asString(rawPoint.timestamp) ??
            asString(rawPoint.date) ??
            asString(rawPoint.startTime) ??
            null,
    };
}

function collectCandidateArrays(
    value: unknown,
    depth = 0,
    visited: Set<object> = new Set<object>()
): unknown[][] {
    if (depth > MAX_NESTED_ROUTE_DEPTH) {
        return [];
    }

    if (Array.isArray(value)) {
        const nestedCandidates: unknown[][] = [value];
        for (const item of value) {
            nestedCandidates.push(...collectCandidateArrays(item, depth + 1, visited));
        }
        return nestedCandidates;
    }

    if (!isRecord(value) || visited.has(value)) {
        return [];
    }

    visited.add(value);

    const candidates: unknown[][] = [];
    const directArrayKeys = [
        "locations",
        "locationSamples",
        "routePoints",
        "points",
        "samples",
        "coordinates",
    ];

    for (const key of directArrayKeys) {
        const candidate = value[key];
        if (Array.isArray(candidate)) {
            candidates.push(candidate);
        }
    }

    // HealthKit getWorkoutRouteSamples returns { anchor, data: { locations } }.
    // Health Connect and future native adapters may use the other wrappers.
    const nestedContainerKeys = [
        "data",
        "route",
        "exerciseRoute",
        "workoutRoute",
        "result",
        "sample",
    ];

    for (const key of nestedContainerKeys) {
        candidates.push(...collectCandidateArrays(value[key], depth + 1, visited));
    }

    return candidates;
}

function routePointKey(point: HealthImportedWorkoutRoutePoint): string {
    return [
        point.latitude.toFixed(7),
        point.longitude.toFixed(7),
        point.recordedAt ?? "",
    ].join("|");
}

/**
 * Extracts a normalized route from embedded provider records or from the
 * HealthKit getWorkoutRouteSamples response shape.
 */
export function extractImportedWorkoutRoute(raw: unknown): HealthImportedWorkoutRoute | null {
    const candidates = collectCandidateArrays(raw);
    const points: HealthImportedWorkoutRoutePoint[] = [];
    const seen = new Set<string>();

    for (const candidate of candidates) {
        for (const rawPoint of candidate) {
            const point = extractRoutePoint(rawPoint);
            if (!point) {
                continue;
            }

            const key = routePointKey(point);
            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            points.push(point);
        }

        if (points.length > 0) {
            break;
        }
    }

    if (points.length === 0) {
        return null;
    }

    return {
        hasRoute: true,
        points,
        raw,
    };
}
