// src/utils/health/cardio/cardioImportedMetrics.utils.ts
// Derives provider-neutral cardio metrics when HealthKit or Health Connect
// exposes the underlying duration, distance, speed, or route altitude samples.

import type { CardioRoutePoint } from "@/src/types/health/cardio/healthCardio.types";

const METERS_PER_SECOND_TO_KILOMETERS_PER_HOUR = 3.6;
const ELEVATION_SMOOTHING_RADIUS = 2;
const MIN_ELEVATION_CHANGE_M = 1;

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function roundTo(value: number, decimalPlaces: number): number {
    const factor = 10 ** decimalPlaces;
    return Math.round(value * factor) / factor;
}

/**
 * Returns provider pace when valid, otherwise derives seconds per kilometer
 * from the normalized duration and distance.
 */
export function resolvePaceSecPerKm(input: {
    paceSecPerKm: number | null | undefined;
    durationSeconds: number | null | undefined;
    distanceKm: number | null | undefined;
}): number | null {
    if (isFiniteNumber(input.paceSecPerKm) && input.paceSecPerKm > 0) {
        return Math.round(input.paceSecPerKm);
    }

    if (
        !isFiniteNumber(input.durationSeconds) ||
        input.durationSeconds <= 0 ||
        !isFiniteNumber(input.distanceKm) ||
        input.distanceKm <= 0
    ) {
        return null;
    }

    return Math.round(input.durationSeconds / input.distanceKm);
}

/**
 * Returns provider average speed when valid, otherwise derives km/h from
 * distance and elapsed time.
 */
export function resolveAverageSpeedKmh(input: {
    avgSpeedKmh: number | null | undefined;
    durationSeconds: number | null | undefined;
    distanceKm: number | null | undefined;
}): number | null {
    if (isFiniteNumber(input.avgSpeedKmh) && input.avgSpeedKmh >= 0) {
        return roundTo(input.avgSpeedKmh, 2);
    }

    if (
        !isFiniteNumber(input.durationSeconds) ||
        input.durationSeconds <= 0 ||
        !isFiniteNumber(input.distanceKm) ||
        input.distanceKm <= 0
    ) {
        return null;
    }

    return roundTo(input.distanceKm / (input.durationSeconds / 3600), 2);
}

/**
 * Derives maximum speed from route points when the native provider exposes
 * speed in meters per second.
 */
export function resolveMaximumSpeedKmhFromRoute(
    points: CardioRoutePoint[] | null | undefined
): number | null {
    if (!Array.isArray(points) || points.length === 0) {
        return null;
    }

    let maximumSpeedMps: number | null = null;

    for (const point of points) {
        if (!isFiniteNumber(point.speedMps) || point.speedMps < 0) {
            continue;
        }

        maximumSpeedMps =
            maximumSpeedMps === null
                ? point.speedMps
                : Math.max(maximumSpeedMps, point.speedMps);
    }

    return maximumSpeedMps === null
        ? null
        : roundTo(
              maximumSpeedMps * METERS_PER_SECOND_TO_KILOMETERS_PER_HOUR,
              2
          );
}

function smoothAltitudes(altitudes: number[]): number[] {
    return altitudes.map((_, index) => {
        const start = Math.max(0, index - ELEVATION_SMOOTHING_RADIUS);
        const end = Math.min(
            altitudes.length - 1,
            index + ELEVATION_SMOOTHING_RADIUS
        );

        let total = 0;
        let count = 0;

        for (let cursor = start; cursor <= end; cursor += 1) {
            const altitude = altitudes[cursor];
            if (!isFiniteNumber(altitude)) {
                continue;
            }

            total += altitude;
            count += 1;
        }

        return count > 0 ? total / count : altitudes[index];
    });
}

/**
 * Estimates positive elevation gain from route altitudes. A short moving
 * average and a one-meter deadband reduce GPS altitude noise before ascent
 * is accumulated.
 */
export function resolveElevationGainMFromRoute(
    points: CardioRoutePoint[] | null | undefined
): number | null {
    if (!Array.isArray(points) || points.length < 2) {
        return null;
    }

    const altitudes = points
        .map((point) => point.altitudeM)
        .filter((altitude): altitude is number => isFiniteNumber(altitude));

    if (altitudes.length < 2) {
        return null;
    }

    const smoothedAltitudes = smoothAltitudes(altitudes);
    let referenceAltitude = smoothedAltitudes[0];
    let elevationGainM = 0;

    for (let index = 1; index < smoothedAltitudes.length; index += 1) {
        const altitude = smoothedAltitudes[index];
        const delta = altitude - referenceAltitude;

        if (delta >= MIN_ELEVATION_CHANGE_M) {
            elevationGainM += delta;
            referenceAltitude = altitude;
            continue;
        }

        if (delta <= -MIN_ELEVATION_CHANGE_M) {
            referenceAltitude = altitude;
        }
    }

    return roundTo(elevationGainM, 1);
}
