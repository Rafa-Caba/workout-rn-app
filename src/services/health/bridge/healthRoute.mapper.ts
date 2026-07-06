// src/services/health/bridge/healthRoute.mapper.ts
// Native-health route normalizer shared by HealthKit and Health Connect bridges.
// It safely inspects unknown provider objects without type assertions to fake safety.

import type {
    HealthImportedWorkoutRoute,
    HealthImportedWorkoutRoutePoint,
} from "@/src/types/health/cardio/health.types";

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

function collectCandidateArrays(record: Record<string, unknown>): unknown[][] {
    const candidates: unknown[][] = [];

    const directKeys = [
        "locations",
        "locationSamples",
        "routePoints",
        "points",
        "samples",
        "coordinates",
    ];

    for (const key of directKeys) {
        const value = record[key];
        if (Array.isArray(value)) {
            candidates.push(value);
        }
    }

    const route = record.route;
    if (isRecord(route)) {
        const routeKeys = ["route", "points", "locations", "samples", "coordinates"];
        for (const key of routeKeys) {
            const value = route[key];
            if (Array.isArray(value)) {
                candidates.push(value);
            }
        }
    }

    const exerciseRoute = record.exerciseRoute;
    if (isRecord(exerciseRoute)) {
        const routeKeys = ["route", "points", "locations", "samples", "coordinates"];
        for (const key of routeKeys) {
            const value = exerciseRoute[key];
            if (Array.isArray(value)) {
                candidates.push(value);
            }
        }
    }

    return candidates;
}

export function extractImportedWorkoutRoute(raw: unknown): HealthImportedWorkoutRoute | null {
    if (!isRecord(raw)) {
        return null;
    }

    const candidates = collectCandidateArrays(raw);
    const points: HealthImportedWorkoutRoutePoint[] = [];

    for (const candidate of candidates) {
        for (const rawPoint of candidate) {
            const point = extractRoutePoint(rawPoint);
            if (point) {
                points.push(point);
            }
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
