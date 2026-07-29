// src/services/health/cardio/cardioAndroid.service.ts

import { healthAndroidBridge } from "@/src/services/health/bridge/healthAndroid.bridge";
import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutRoute,
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
} from "@/src/types/health/cardio/health.types";
import type {
    CardioActivityType,
    HealthImportedCardioQuery,
    HealthImportedCardioSession,
    HealthImportedCardioSessionsResult,
} from "@/src/types/health/cardio/healthCardio.types";
import type { ISODate, ISODateTime, WorkoutCardioEnvironment } from "@/src/types/workoutDay.types";
import {
    enumerateLocalDatesInDateTimeRange,
    resolveLocalISODateFromDateTime,
} from "@/src/utils/dates/localDateTime";
import { resolveCardioEnvironmentFromMinimalWorkout } from "@/src/utils/health/cardio/cardioEnvironment.mapper";
import { dedupeImportedCardioSessions } from "@/src/utils/health/cardio/importedCardioSession.dedupe";

export type CardioAndroidReadSessionsInput = HealthImportedCardioQuery & {
    includeRoutes?: boolean;
};

export type CardioAndroidPermissionsRequest = {
    permissions: HealthPermissionKey[];
};

function toIsoNow(): ISODateTime {
    return new Date().toISOString();
}

function buildUnknownPermissionsStatus(
    requestedPermissions: HealthPermissionKey[]
): HealthPermissionsStatus {
    const permissions: Record<string, "granted" | "unknown"> = {};

    for (const permission of requestedPermissions) {
        permissions[permission] = "unknown";
    }

    return {
        provider: "health-connect",
        available: true,
        permissions,
        checkedAt: toIsoNow(),
    };
}

function normalizeText(value: string | null | undefined): string {
    return (value ?? "").trim().toLowerCase();
}

function detectCardioActivityTypeFromWorkout(
    workout: HealthImportedWorkoutSessionMinimal
): CardioActivityType | null {
    const normalizedType = normalizeText(workout.type);

    if (
        normalizedType.includes("running") ||
        normalizedType.includes("run") ||
        normalizedType.includes("jog")
    ) {
        return "running";
    }

    if (
        normalizedType.includes("walking") ||
        normalizedType.includes("walk") ||
        normalizedType.includes("hiking") ||
        normalizedType.includes("hike")
    ) {
        return "walking";
    }

    return null;
}

function matchesRequestedActivityTypes(
    activityType: CardioActivityType,
    requestedActivityTypes?: CardioActivityType[]
): boolean {
    if (!Array.isArray(requestedActivityTypes) || requestedActivityTypes.length === 0) {
        return true;
    }

    return requestedActivityTypes.includes(activityType);
}

function detectCardioEnvironmentFromWorkout(
    workout: HealthImportedWorkoutSessionMinimal
): WorkoutCardioEnvironment {
    return resolveCardioEnvironmentFromMinimalWorkout(workout);
}

function matchesRequestedCardioEnvironments(
    cardioEnvironment: WorkoutCardioEnvironment,
    requestedCardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[]
): boolean {
    if (!Array.isArray(requestedCardioEnvironments) || requestedCardioEnvironments.length === 0) {
        return true;
    }

    if (cardioEnvironment === null) {
        return false;
    }

    return requestedCardioEnvironments.includes(cardioEnvironment);
}

function buildProviderWorkoutType(
    workout: HealthImportedWorkoutSessionMinimal
): string | null {
    return workout.providerWorkoutType ?? workout.type ?? null;
}

function mapWorkoutRouteToCardioRoute(
    route: HealthImportedWorkoutRoute | null | undefined
): HealthImportedCardioSession["route"] {
    if (!route || !route.hasRoute || route.points.length === 0) {
        return null;
    }

    const points = route.points.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        altitudeM: point.altitudeM,
        accuracyM: point.accuracyM,
        speedMps: point.speedMps,
        headingDeg: point.headingDeg,
        recordedAt: point.recordedAt,
    }));

    let minLatitude: number | null = null;
    let maxLatitude: number | null = null;
    let minLongitude: number | null = null;
    let maxLongitude: number | null = null;

    for (const point of points) {
        minLatitude = minLatitude === null ? point.latitude : Math.min(minLatitude, point.latitude);
        maxLatitude = maxLatitude === null ? point.latitude : Math.max(maxLatitude, point.latitude);
        minLongitude = minLongitude === null ? point.longitude : Math.min(minLongitude, point.longitude);
        maxLongitude = maxLongitude === null ? point.longitude : Math.max(maxLongitude, point.longitude);
    }

    const startPoint = points[0] ?? null;
    const endPoint = points[points.length - 1] ?? null;

    return {
        hasRoute: true,
        points,
        routeSummary: {
            pointCount: points.length,
            startLatitude: startPoint?.latitude ?? null,
            startLongitude: startPoint?.longitude ?? null,
            endLatitude: endPoint?.latitude ?? null,
            endLongitude: endPoint?.longitude ?? null,
            minLatitude,
            maxLatitude,
            minLongitude,
            maxLongitude,
        },
        raw: route.raw,
    };
}


function resolveSessionRange(
    workout: HealthImportedWorkoutSessionMinimal
): { from: ISODateTime; to: ISODateTime } | null {
    if (workout.startAt && workout.endAt) {
        return {
            from: workout.startAt,
            to: workout.endAt,
        };
    }

    const startDate = workout.startAt ? new Date(workout.startAt) : null;
    if (startDate && Number.isFinite(startDate.getTime())) {
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + 1);

        return {
            from: startDate.toISOString(),
            to: endDate.toISOString(),
        };
    }

    return null;
}

function mergeMetrics(
    baseMetrics: HealthImportedWorkoutSessionMinimal["metrics"],
    extraMetrics: HealthImportedWorkoutMetrics | null
): HealthImportedWorkoutMetrics {
    return {
        durationSeconds: baseMetrics.durationSeconds ?? extraMetrics?.durationSeconds ?? null,
        activeKcal: baseMetrics.activeKcal ?? extraMetrics?.activeKcal ?? null,
        totalKcal: baseMetrics.totalKcal ?? extraMetrics?.totalKcal ?? null,
        avgHr: baseMetrics.avgHr ?? extraMetrics?.avgHr ?? null,
        maxHr: baseMetrics.maxHr ?? extraMetrics?.maxHr ?? null,
        distanceKm: baseMetrics.distanceKm ?? extraMetrics?.distanceKm ?? null,
        steps: baseMetrics.steps ?? extraMetrics?.steps ?? null,
        elevationGainM: baseMetrics.elevationGainM ?? extraMetrics?.elevationGainM ?? null,
        paceSecPerKm: baseMetrics.paceSecPerKm ?? extraMetrics?.paceSecPerKm ?? null,
        cadenceRpm: baseMetrics.cadenceRpm ?? extraMetrics?.cadenceRpm ?? null,
        effortRpe: baseMetrics.effortRpe ?? extraMetrics?.effortRpe ?? null,
    };
}

async function enrichCardioWorkout(
    workout: HealthImportedWorkoutSessionMinimal,
    activityType: CardioActivityType,
    date: ISODate,
    includeRoutes: boolean
): Promise<HealthImportedCardioSession> {
    const sessionRange = resolveSessionRange(workout);

    const rangeMetrics = sessionRange
        ? await healthAndroidBridge.readMetricsByRange(sessionRange).catch(() => null)
        : null;

    const mergedMetrics = mergeMetrics(workout.metrics, rangeMetrics);
    const route = includeRoutes ? mapWorkoutRouteToCardioRoute(workout.route ?? null) : null;
    const cardioEnvironment = route ? "outdoor" : detectCardioEnvironmentFromWorkout(workout);

    return {
        externalId: workout.externalId ?? null,
        date: resolveLocalISODateFromDateTime(workout.startAt) ?? date,
        activityType,
        cardioEnvironment,
        providerWorkoutType: buildProviderWorkoutType(workout),
        startAt: workout.startAt ?? null,
        endAt: workout.endAt ?? null,
        metrics: {
            durationSeconds: mergedMetrics.durationSeconds ?? null,
            activeKcal: mergedMetrics.activeKcal ?? null,
            totalKcal: mergedMetrics.totalKcal ?? null,
            avgHr: mergedMetrics.avgHr ?? null,
            maxHr: mergedMetrics.maxHr ?? null,
            distanceKm: mergedMetrics.distanceKm ?? null,
            steps: mergedMetrics.steps ?? null,
            elevationGainM: mergedMetrics.elevationGainM ?? null,
            paceSecPerKm: mergedMetrics.paceSecPerKm ?? null,
            avgSpeedKmh: null,
            maxSpeedKmh: null,
            cadenceRpm: mergedMetrics.cadenceRpm ?? null,
            strideLengthM: null,
        },
        route,
        source: workout.source,
        sourceDevice: workout.sourceDevice ?? null,
        importedAt: workout.importedAt ?? toIsoNow(),
        lastSyncedAt: workout.lastSyncedAt ?? toIsoNow(),
        notes: workout.notes ?? null,
        raw: workout.raw ?? null,
    };
}

async function readCardioSessionsByDate(
    date: ISODate,
    requestedActivityTypes?: CardioActivityType[],
    requestedCardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[],
    includeRoutes = false
): Promise<HealthImportedCardioSession[]> {
    const workouts = await healthAndroidBridge.readWorkoutsByDate({ date });
    const cardioWorkouts = workouts
        .map((workout) => ({
            workout,
            activityType: detectCardioActivityTypeFromWorkout(workout),
            cardioEnvironment: detectCardioEnvironmentFromWorkout(workout),
        }))
        .filter(
            (
                item
            ): item is {
                workout: HealthImportedWorkoutSessionMinimal;
                activityType: CardioActivityType;
                cardioEnvironment: WorkoutCardioEnvironment;
            } =>
                item.activityType !== null &&
                matchesRequestedActivityTypes(item.activityType, requestedActivityTypes) &&
                matchesRequestedCardioEnvironments(item.cardioEnvironment, requestedCardioEnvironments)
        );

    const sessions: HealthImportedCardioSession[] = [];

    for (const item of cardioWorkouts) {
        sessions.push(
            await enrichCardioWorkout(
                item.workout,
                item.activityType,
                date,
                includeRoutes
            )
        );
    }

    return sessions;
}

export async function isCardioAndroidAvailable(): Promise<boolean> {
    return healthAndroidBridge.isAvailable();
}

export async function getCardioAndroidPermissionsStatus(
    input: CardioAndroidPermissionsRequest
): Promise<HealthPermissionsStatus> {
    const available = await healthAndroidBridge.isAvailable();

    if (!available) {
        return {
            provider: "health-connect",
            available: false,
            permissions: Object.fromEntries(
                input.permissions.map((permission) => [permission, "unknown" as const])
            ),
            checkedAt: toIsoNow(),
        };
    }

    /**
     * Current bridge exposes requestPermissions, but not a passive permission-status reader.
     * Return an availability-based unknown status without triggering permission prompts.
     */
    return buildUnknownPermissionsStatus(input.permissions);
}

export async function requestCardioAndroidPermissions(
    input: CardioAndroidPermissionsRequest
): Promise<HealthPermissionsStatus> {
    return healthAndroidBridge.requestPermissions(input);
}

export async function readCardioAndroidSessions(
    input: CardioAndroidReadSessionsInput
): Promise<HealthImportedCardioSessionsResult> {
    const sessions: HealthImportedCardioSession[] = [];

    if (input.date) {
        const byDate = await readCardioSessionsByDate(
            input.date,
            input.activityTypes,
            input.cardioEnvironments,
            input.includeRoutes ?? false
        );

        return {
            provider: "health-connect",
            query: {
                provider: "health-connect",
                date: input.date,
                from: input.from,
                to: input.to,
                activityTypes: input.activityTypes,
                cardioEnvironments: input.cardioEnvironments,
            },
            sessions: byDate,
            syncedAt: toIsoNow(),
        };
    }

    if (input.from && input.to) {
        const dates = enumerateLocalDatesInDateTimeRange(input.from, input.to);

        for (const date of dates) {
            const byDate = await readCardioSessionsByDate(
                date,
                input.activityTypes,
                input.cardioEnvironments,
                input.includeRoutes ?? false
            );
            sessions.push(...byDate);
        }
    }

    return {
        provider: "health-connect",
        query: {
            provider: "health-connect",
            date: input.date,
            from: input.from,
            to: input.to,
            activityTypes: input.activityTypes,
            cardioEnvironments: input.cardioEnvironments,
        },
        sessions: dedupeImportedCardioSessions(sessions),
        syncedAt: toIsoNow(),
    };
}
