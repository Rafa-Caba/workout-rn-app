// src/utils/health/outdoor/outdoorRoute.mapper.ts

import type {
    HealthImportedOutdoorRoute,
    OutdoorRoutePoint,
} from "@/src/types/health/healthOutdoor.types";
import type { WorkoutRouteSummary } from "@/src/types/workoutDay.types";

function hasFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function getPointLatitude(point: OutdoorRoutePoint | null | undefined): number | null {
    return point && hasFiniteNumber(point.latitude) ? point.latitude : null;
}

function getPointLongitude(point: OutdoorRoutePoint | null | undefined): number | null {
    return point && hasFiniteNumber(point.longitude) ? point.longitude : null;
}

export function mapOutdoorRouteToSummary(
    route: HealthImportedOutdoorRoute | null | undefined
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