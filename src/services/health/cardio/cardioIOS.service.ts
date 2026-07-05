// src/services/health/cardio/cardioIOS.service.ts

import { healthIOSBridge } from "@/src/services/health/bridge/healthIOS.bridge";
import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal, HealthPermissionsStatus
} from "@/src/types/health/health.types";
import type {
    HealthImportedCardioQuery,
    HealthImportedCardioSession,
    HealthImportedCardioSessionsResult,
    CardioActivityType,
} from "@/src/types/health/healthCardio.types";
import type { ISODate, ISODateTime, WorkoutCardioEnvironment } from "@/src/types/workoutDay.types";

export type CardioIOSReadSessionsInput = HealthImportedCardioQuery & {
    includeRoutes?: boolean;
};

export type CardioIOSPermissionsRequest = {
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
        provider: "healthkit",
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

function buildDateRange(date: ISODate): { from: ISODateTime; to: ISODateTime } {
    const from = new Date(`${date}T00:00:00.000Z`);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 1);

    return {
        from: from.toISOString(),
        to: to.toISOString(),
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
    const normalizedType = normalizeText(workout.type);

    if (
        normalizedType.includes("indoor") ||
        normalizedType.includes("treadmill") ||
        normalizedType.includes("inside")
    ) {
        return "indoor";
    }

    if (
        normalizedType.includes("outdoor") ||
        normalizedType.includes("hiking") ||
        normalizedType.includes("hike")
    ) {
        return "outdoor";
    }

    return null;
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

async function enrichCardioWorkout(
    workout: HealthImportedWorkoutSessionMinimal,
    activityType: CardioActivityType,
    date: ISODate,
    includeRoutes: boolean
): Promise<HealthImportedCardioSession> {
    const sessionRange = resolveSessionRange(workout);

    const rangeMetrics = sessionRange
        ? await healthIOSBridge.readMetricsByRange(sessionRange).catch(() => null)
        : null;

    const mergedMetrics = mergeMetrics(workout.metrics, rangeMetrics);

    return {
        externalId: workout.externalId ?? null,
        date,
        activityType,
        cardioEnvironment: detectCardioEnvironmentFromWorkout(workout),
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
         * Current iOS bridge does not expose workout route samples yet.
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

async function readCardioSessionsByDate(
    date: ISODate,
    requestedActivityTypes?: CardioActivityType[],
    requestedCardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[],
    includeRoutes = false
): Promise<HealthImportedCardioSession[]> {
    const workouts = await healthIOSBridge.readWorkoutsByDate({ date });
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

export async function isCardioIOSAvailable(): Promise<boolean> {
    return healthIOSBridge.isAvailable();
}

export async function getCardioIOSPermissionsStatus(
    input: CardioIOSPermissionsRequest
): Promise<HealthPermissionsStatus> {
    const available = await healthIOSBridge.isAvailable();

    if (!available) {
        return {
            provider: "healthkit",
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

export async function requestCardioIOSPermissions(
    input: CardioIOSPermissionsRequest
): Promise<HealthPermissionsStatus> {
    return healthIOSBridge.requestPermissions(input);
}

export async function readCardioIOSSessions(
    input: CardioIOSReadSessionsInput
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
            provider: "healthkit",
            query: {
                provider: "healthkit",
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
        const dates = enumerateDatesInRange(input.from, input.to);

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
        provider: "healthkit",
        query: {
            provider: "healthkit",
            date: input.date,
            from: input.from,
            to: input.to,
            activityTypes: input.activityTypes,
            cardioEnvironments: input.cardioEnvironments,
        },
        sessions,
        syncedAt: toIsoNow(),
    };
}
