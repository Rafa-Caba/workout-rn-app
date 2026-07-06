// src/services/cardio/cardioLiveSession.mapper.ts
// Maps phone-GPS live Cardio snapshots into backend WorkoutDay session payloads.

import type { CreateSessionBody } from "@/src/services/workout/sessions.service";
import type {
    CardioLiveRoutePoint,
    CardioLiveSessionSnapshot,
} from "@/src/types/health/cardio/cardioLiveSession.types";
import type { CardioActivityType } from "@/src/types/health/cardio/healthCardio.types";
import type { ISODate, WorkoutRouteSummary } from "@/src/types/workoutDay.types";

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function normalizeNullableNonNegativeNumber(value: unknown): number | null {
    return isFiniteNumber(value) && value >= 0 ? value : null;
}

function normalizeHeadingDegrees(value: unknown): number | null {
    return isFiniteNumber(value) && value >= 0 && value <= 360 ? value : null;
}

function pad2(value: number): string {
    return value < 10 ? `0${value}` : String(value);
}

export function getLocalIsoDateFromDate(value: Date): ISODate {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}` as ISODate;
}

export function buildCardioLiveSessionType(activityType: CardioActivityType): string {
    return activityType === "running" ? "Outdoor Running" : "Outdoor Walking";
}

export function buildCardioLiveRouteSummary(
    points: CardioLiveRoutePoint[]
): WorkoutRouteSummary | null {
    if (points.length === 0) {
        return null;
    }

    const startPoint = points[0] ?? null;
    const endPoint = points[points.length - 1] ?? null;

    let minLatitude: number | null = null;
    let maxLatitude: number | null = null;
    let minLongitude: number | null = null;
    let maxLongitude: number | null = null;

    for (const point of points) {
        if (isFiniteNumber(point.latitude)) {
            minLatitude = minLatitude === null ? point.latitude : Math.min(minLatitude, point.latitude);
            maxLatitude = maxLatitude === null ? point.latitude : Math.max(maxLatitude, point.latitude);
        }

        if (isFiniteNumber(point.longitude)) {
            minLongitude = minLongitude === null ? point.longitude : Math.min(minLongitude, point.longitude);
            maxLongitude = maxLongitude === null ? point.longitude : Math.max(maxLongitude, point.longitude);
        }
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

export function resolveCardioLivePaceSecPerKm(input: {
    durationSeconds: number;
    distanceKm: number;
}): number | null {
    if (input.durationSeconds <= 0 || input.distanceKm <= 0) {
        return null;
    }

    return Math.round(input.durationSeconds / input.distanceKm);
}

export function resolveCardioLiveAvgSpeedKmh(input: {
    durationSeconds: number;
    distanceKm: number;
}): number | null {
    if (input.durationSeconds <= 0 || input.distanceKm <= 0) {
        return null;
    }

    return Math.round((input.distanceKm / (input.durationSeconds / 3600)) * 100) / 100;
}

export function resolveCardioLiveMaxSpeedKmh(points: CardioLiveRoutePoint[]): number | null {
    let maxSpeedKmh: number | null = null;

    for (const point of points) {
        if (!isFiniteNumber(point.speedMps) || point.speedMps <= 0) {
            continue;
        }

        const speedKmh = point.speedMps * 3.6;
        maxSpeedKmh = maxSpeedKmh === null ? speedKmh : Math.max(maxSpeedKmh, speedKmh);
    }

    return maxSpeedKmh === null ? null : Math.round(maxSpeedKmh * 100) / 100;
}

export function mapCardioLiveSnapshotToCreateSessionBody(
    snapshot: CardioLiveSessionSnapshot
): CreateSessionBody {
    const avgSpeedKmh = snapshot.avgSpeedKmh ?? resolveCardioLiveAvgSpeedKmh({
        durationSeconds: snapshot.durationSeconds,
        distanceKm: snapshot.distanceKm,
    });

    const maxSpeedKmh = snapshot.maxSpeedKmh ?? resolveCardioLiveMaxSpeedKmh(snapshot.routePoints);

    return {
        type: buildCardioLiveSessionType(snapshot.activityType),
        activityType: snapshot.activityType,
        cardioEnvironment: "outdoor",

        startAt: snapshot.startAt,
        endAt: snapshot.endAt,
        durationSeconds: snapshot.durationSeconds,

        activeKcal: null,
        totalKcal: null,
        avgHr: null,
        maxHr: null,

        distanceKm: snapshot.distanceKm,
        steps: null,
        elevationGainM: null,
        paceSecPerKm: snapshot.paceSecPerKm,
        cadenceRpm: null,

        hasRoute: snapshot.hasRoute,
        routeSummary: snapshot.routeSummary,
        routePoints: snapshot.routePoints.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            altitudeM: point.altitudeM ?? null,
            accuracyM: normalizeNullableNonNegativeNumber(point.accuracyM),
            speedMps: normalizeNullableNonNegativeNumber(point.speedMps),
            headingDeg: normalizeHeadingDegrees(point.headingDeg),
            recordedAt: point.recordedAt ?? null,
        })),
        cardioMetrics: {
            distanceKm: snapshot.distanceKm,
            steps: null,
            elevationGainM: null,
            paceSecPerKm: snapshot.paceSecPerKm,
            avgSpeedKmh,
            maxSpeedKmh,
            cadenceRpm: null,
            strideLengthM: null,
        },

        effortRpe: null,
        notes: null,
        exercises: null,
        meta: {
            source: "app-live",
            sourceDevice: "Phone GPS",
            importedAt: null,
            lastSyncedAt: null,
            sessionKind: "live-cardio",
            externalId: `app-live|${snapshot.activityType}|${snapshot.startAt}`,
            originalType: buildCardioLiveSessionType(snapshot.activityType),
            provider: "phone-gps",
            healthWriteStatus: "pending",
            healthExternalId: null,
            healthWrittenAt: null,
        },
    };
}
