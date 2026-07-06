// src/utils/health/cardio/cardioRoute.mapper.ts

import type {
    CardioRoutePoint,
    HealthImportedCardioRoute,
} from "@/src/types/health/cardio/healthCardio.types";
import type { WorkoutRoutePoint, WorkoutRouteSummary } from "@/src/types/workoutDay.types";

function hasFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function normalizeNullableNonNegativeNumber(value: unknown): number | null {
    return hasFiniteNumber(value) && value >= 0 ? value : null;
}

function normalizeHeadingDegrees(value: unknown): number | null {
    return hasFiniteNumber(value) && value >= 0 && value <= 360 ? value : null;
}

function getPointLatitude(point: CardioRoutePoint | null | undefined): number | null {
    return point && hasFiniteNumber(point.latitude) ? point.latitude : null;
}

function getPointLongitude(point: CardioRoutePoint | null | undefined): number | null {
    return point && hasFiniteNumber(point.longitude) ? point.longitude : null;
}

export function mapCardioRouteToSummary(
    route: HealthImportedCardioRoute | null | undefined
): WorkoutRouteSummary | null {
    if (!route) {
        return null;
    }

    const points = Array.isArray(route.points) ? route.points : [];
    const pointCount = points.length;

    if (pointCount === 0) {
        return {
            pointCount: 0,
            startLatitude: null,
            startLongitude: null,
            endLatitude: null,
            endLongitude: null,
            minLatitude: null,
            maxLatitude: null,
            minLongitude: null,
            maxLongitude: null,
        };
    }

    const startPoint = points[0] ?? null;
    const endPoint = points[pointCount - 1] ?? null;

    let minLatitude: number | null = null;
    let maxLatitude: number | null = null;
    let minLongitude: number | null = null;
    let maxLongitude: number | null = null;

    for (const point of points) {
        if (hasFiniteNumber(point.latitude)) {
            minLatitude =
                minLatitude === null ? point.latitude : Math.min(minLatitude, point.latitude);
            maxLatitude =
                maxLatitude === null ? point.latitude : Math.max(maxLatitude, point.latitude);
        }

        if (hasFiniteNumber(point.longitude)) {
            minLongitude =
                minLongitude === null ? point.longitude : Math.min(minLongitude, point.longitude);
            maxLongitude =
                maxLongitude === null ? point.longitude : Math.max(maxLongitude, point.longitude);
        }
    }

    return {
        pointCount,
        startLatitude: getPointLatitude(startPoint),
        startLongitude: getPointLongitude(startPoint),
        endLatitude: getPointLatitude(endPoint),
        endLongitude: getPointLongitude(endPoint),
        minLatitude,
        maxLatitude,
        minLongitude,
        maxLongitude,
    };
}


export function mapCardioRouteToWorkoutRoutePoints(
    route: HealthImportedCardioRoute | null | undefined
): WorkoutRoutePoint[] | null {
    if (!route || !Array.isArray(route.points) || route.points.length === 0) {
        return null;
    }

    const points = route.points
        .filter((point) => hasFiniteNumber(point.latitude) && hasFiniteNumber(point.longitude))
        .map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            altitudeM: point.altitudeM ?? null,
            accuracyM: normalizeNullableNonNegativeNumber(point.accuracyM),
            speedMps: normalizeNullableNonNegativeNumber(point.speedMps),
            headingDeg: normalizeHeadingDegrees(point.headingDeg),
            recordedAt: point.recordedAt ?? null,
        }));

    return points.length > 0 ? points : null;
}
