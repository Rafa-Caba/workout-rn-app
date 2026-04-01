// src/services/health/outdoor/outdoorAndroid.service.ts

import { healthAndroidBridge } from "@/src/services/health/bridge/healthAndroid.bridge";
import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal, HealthPermissionsStatus
} from "@/src/types/health/health.types";
import type {
    HealthImportedOutdoorQuery,
    HealthImportedOutdoorSession,
    HealthImportedOutdoorSessionsResult,
    OutdoorActivityType,
} from "@/src/types/health/healthOutdoor.types";
import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";

export type OutdoorAndroidReadSessionsInput = HealthImportedOutdoorQuery & {
    includeRoutes?: boolean;
};

export type OutdoorAndroidPermissionsRequest = {
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

function addDays(date: ISODate, deltaDays: number): ISODate {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + deltaDays);
    return value.toISOString().slice(0, 10);
}

function enumerateDatesInRange(from: ISODateTime, to: ISODateTime): ISODate[] {
    const start = new Date(from);
    const end = new Date(to);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
        return [];
    }

    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const output: ISODate[] = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
        output.push(currentDate);
        currentDate = addDays(currentDate, 1);
    }

    return output;
}

function normalizeText(value: string | null | undefined): string {
    return (value ?? "").trim().toLowerCase();
}

function detectOutdoorActivityTypeFromWorkout(
    workout: HealthImportedWorkoutSessionMinimal
): OutdoorActivityType | null {
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
    activityType: OutdoorActivityType,
    requestedActivityTypes?: OutdoorActivityType[]
): boolean {
    if (!Array.isArray(requestedActivityTypes) || requestedActivityTypes.length === 0) {
        return true;
    }

    return requestedActivityTypes.includes(activityType);
}

function buildProviderWorkoutType(
    workout: HealthImportedWorkoutSessionMinimal
): string | null {
    return workout.type ?? null;
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

async function enrichOutdoorWorkout(
    workout: HealthImportedWorkoutSessionMinimal,
    activityType: OutdoorActivityType,
    date: ISODate,
    includeRoutes: boolean
): Promise<HealthImportedOutdoorSession> {
    const sessionRange = resolveSessionRange(workout);

    const rangeMetrics = sessionRange
        ? await healthAndroidBridge.readMetricsByRange(sessionRange).catch(() => null)
        : null;

    const mergedMetrics = mergeMetrics(workout.metrics, rangeMetrics);

    return {
        externalId: workout.externalId ?? null,
        date,
        activityType,
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
        /**
         * Current Android bridge does not expose route/location points yet.
         * Keep contract ready while safely returning null.
         */
        route: includeRoutes ? null : null,
        source: workout.source,
        sourceDevice: workout.sourceDevice ?? null,
        importedAt: workout.importedAt ?? toIsoNow(),
        lastSyncedAt: workout.lastSyncedAt ?? toIsoNow(),
        notes: workout.notes ?? null,
        raw: workout.raw ?? null,
    };
}

async function readOutdoorSessionsByDate(
    date: ISODate,
    requestedActivityTypes?: OutdoorActivityType[],
    includeRoutes = false
): Promise<HealthImportedOutdoorSession[]> {
    const workouts = await healthAndroidBridge.readWorkoutsByDate({ date });
    const outdoorWorkouts = workouts
        .map((workout) => ({
            workout,
            activityType: detectOutdoorActivityTypeFromWorkout(workout),
        }))
        .filter(
            (
                item
            ): item is {
                workout: HealthImportedWorkoutSessionMinimal;
                activityType: OutdoorActivityType;
            } =>
                item.activityType !== null &&
                matchesRequestedActivityTypes(item.activityType, requestedActivityTypes)
        );

    const sessions: HealthImportedOutdoorSession[] = [];

    for (const item of outdoorWorkouts) {
        sessions.push(
            await enrichOutdoorWorkout(
                item.workout,
                item.activityType,
                date,
                includeRoutes
            )
        );
    }

    return sessions;
}

export async function isOutdoorAndroidAvailable(): Promise<boolean> {
    return healthAndroidBridge.isAvailable();
}

export async function getOutdoorAndroidPermissionsStatus(
    input: OutdoorAndroidPermissionsRequest
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

export async function requestOutdoorAndroidPermissions(
    input: OutdoorAndroidPermissionsRequest
): Promise<HealthPermissionsStatus> {
    return healthAndroidBridge.requestPermissions(input);
}

export async function readOutdoorAndroidSessions(
    input: OutdoorAndroidReadSessionsInput
): Promise<HealthImportedOutdoorSessionsResult> {
    const sessions: HealthImportedOutdoorSession[] = [];

    if (input.date) {
        const byDate = await readOutdoorSessionsByDate(
            input.date,
            input.activityTypes,
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
            },
            sessions: byDate,
            syncedAt: toIsoNow(),
        };
    }

    if (input.from && input.to) {
        const dates = enumerateDatesInRange(input.from, input.to);

        for (const date of dates) {
            const byDate = await readOutdoorSessionsByDate(
                date,
                input.activityTypes,
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
        },
        sessions,
        syncedAt: toIsoNow(),
    };
}