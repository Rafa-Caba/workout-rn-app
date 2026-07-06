// src/services/health/cardio/cardioAndroidWrite.service.ts
// Android Health Connect writer for app-created Cardio sessions.

import {
    DeviceType,
    ExerciseType,
    initialize,
    insertRecords,
    RecordingMethod,
    requestPermission,
    type HealthConnectRecord,
    type Permission,
    type WriteExerciseRoutePermission,
} from "react-native-health-connect";

import {
    getErrorMessage,
    getSessionActiveKcal,
    getSessionActivityType,
    getSessionDistanceKm,
    getSessionEndAt,
    getSessionExternalId,
    getSessionStartAt,
    isFinitePositiveNumber,
    toIsoNow,
} from "@/src/services/health/cardio/cardioHealthWrite.helpers";
import type {
    CardioHealthWriteDetail,
    CardioHealthWriteInput,
    CardioHealthWriteResult,
} from "@/src/types/health/cardio/cardioHealthWrite.types";
import type { CardioLiveRoutePoint } from "@/src/types/health/cardio/cardioLiveSession.types";

type WritePermission = Permission | WriteExerciseRoutePermission;

type HealthConnectLocation = {
    time: string;
    latitude: number;
    longitude: number;
    altitude?: {
        value: number;
        unit: "meters";
    };
    horizontalAccuracy?: {
        value: number;
        unit: "meters";
    };
};

function buildWritePermissions(includeRoute: boolean): WritePermission[] {
    const permissions: WritePermission[] = [
        { accessType: "write", recordType: "ExerciseSession" },
        { accessType: "write", recordType: "Distance" },
        { accessType: "write", recordType: "Speed" },
        { accessType: "write", recordType: "ActiveCaloriesBurned" },
    ];

    if (includeRoute) {
        permissions.push({ accessType: "write", recordType: "ExerciseRoute" });
    }

    return permissions;
}

async function requestAndroidWritePermissions(includeRoute: boolean): Promise<boolean> {
    const initialized = await initialize();

    if (!initialized) {
        return false;
    }

    const requested = buildWritePermissions(includeRoute);
    const granted = await requestPermission(requested);

    return requested.every((permission) =>
        granted.some(
            (item) =>
                item.accessType === permission.accessType &&
                item.recordType === permission.recordType
        )
    );
}

function resolveAndroidExerciseType(input: CardioHealthWriteInput): number {
    const activityType = getSessionActivityType(input.session);

    if (input.session.cardioEnvironment === "indoor" && activityType === "running") {
        return ExerciseType.RUNNING_TREADMILL;
    }

    if (activityType === "running") {
        return ExerciseType.RUNNING;
    }

    return ExerciseType.WALKING;
}

function toHealthConnectLocations(points: CardioLiveRoutePoint[]): HealthConnectLocation[] {
    return points
        .filter((point) =>
            Number.isFinite(point.latitude) &&
            Number.isFinite(point.longitude) &&
            typeof point.recordedAt === "string" &&
            point.recordedAt.trim().length > 0
        )
        .map((point) => ({
            time: point.recordedAt,
            latitude: point.latitude,
            longitude: point.longitude,
            ...(isFinitePositiveNumber(point.altitudeM)
                ? {
                    altitude: {
                        value: point.altitudeM,
                        unit: "meters" as const,
                    },
                }
                : {}),
            ...(isFinitePositiveNumber(point.accuracyM)
                ? {
                    horizontalAccuracy: {
                        value: point.accuracyM,
                        unit: "meters" as const,
                    },
                }
                : {}),
        }));
}

function buildBaseMetadata(clientRecordId: string) {
    return {
        clientRecordId,
        clientRecordVersion: 1,
        recordingMethod: RecordingMethod.RECORDING_METHOD_ACTIVELY_RECORDED,
        device: {
            type: DeviceType.TYPE_PHONE,
        },
    };
}

function getHealthConnectRouteLocations(input: CardioHealthWriteInput): HealthConnectLocation[] {
    if (input.session.cardioEnvironment !== "outdoor") {
        return [];
    }

    return toHealthConnectLocations(input.snapshot?.routePoints ?? []);
}

function shouldWriteHealthConnectRoute(locations: HealthConnectLocation[]): boolean {
    /**
     * Health Connect rejects an exercise route with a single location point.
     * Keep the route persisted in our BE/map, but only write route data to
     * Health Connect when there is enough geometry to represent a real path.
     */
    return locations.length >= 2;
}

function buildExerciseSessionRecord(
    input: CardioHealthWriteInput,
    routeLocations: HealthConnectLocation[]
): HealthConnectRecord {
    const externalId = getSessionExternalId(input.session);
    const startTime = getSessionStartAt(input.session);
    const endTime = getSessionEndAt(input.session);
    const shouldIncludeRoute = shouldWriteHealthConnectRoute(routeLocations);

    if (!startTime || !endTime) {
        throw new Error("La sesión no trae startAt/endAt para escribir en Health Connect.");
    }

    return {
        recordType: "ExerciseSession",
        startTime,
        endTime,
        exerciseType: resolveAndroidExerciseType(input),
        title: input.session.type,
        notes: input.session.notes ?? undefined,
        metadata: buildBaseMetadata(`${externalId}|exercise-session`),
        ...(shouldIncludeRoute
            ? {
                exerciseRoute: {
                    route: routeLocations,
                },
            }
            : {}),
    };
}

function buildDistanceRecord(input: CardioHealthWriteInput): HealthConnectRecord | null {
    const distanceKm = getSessionDistanceKm(input.session, input.snapshot);
    const startTime = getSessionStartAt(input.session);
    const endTime = getSessionEndAt(input.session);

    if (!isFinitePositiveNumber(distanceKm) || !startTime || !endTime) {
        return null;
    }

    return {
        recordType: "Distance",
        startTime,
        endTime,
        distance: {
            value: distanceKm,
            unit: "kilometers",
        },
        metadata: buildBaseMetadata(`${getSessionExternalId(input.session)}|distance`),
    };
}

function buildSpeedRecord(input: CardioHealthWriteInput): HealthConnectRecord | null {
    const points = input.snapshot?.routePoints ?? [];
    const samples = points
        .filter((point) => isFinitePositiveNumber(point.speedMps))
        .map((point) => ({
            time: point.recordedAt,
            speed: {
                value: point.speedMps ?? 0,
                unit: "metersPerSecond" as const,
            },
        }));

    const startTime = getSessionStartAt(input.session);
    const endTime = getSessionEndAt(input.session);

    if (!samples.length || !startTime || !endTime) {
        return null;
    }

    return {
        recordType: "Speed",
        startTime,
        endTime,
        samples,
        metadata: buildBaseMetadata(`${getSessionExternalId(input.session)}|speed`),
    };
}

function buildActiveCaloriesRecord(input: CardioHealthWriteInput): HealthConnectRecord | null {
    const activeKcal = getSessionActiveKcal(input.session);
    const startTime = getSessionStartAt(input.session);
    const endTime = getSessionEndAt(input.session);

    if (!isFinitePositiveNumber(activeKcal) || !startTime || !endTime) {
        return null;
    }

    return {
        recordType: "ActiveCaloriesBurned",
        startTime,
        endTime,
        energy: {
            value: activeKcal,
            unit: "kilocalories",
        },
        metadata: buildBaseMetadata(`${getSessionExternalId(input.session)}|active-calories`),
    };
}

async function insertSingleRecord(record: HealthConnectRecord): Promise<string[]> {
    return insertRecords([record]);
}

function buildFailureResult(error: unknown): CardioHealthWriteResult {
    return {
        provider: "health-connect",
        status: "failed",
        externalId: null,
        writtenAt: null,
        error: getErrorMessage(error, "No se pudo escribir la sesión en Health Connect."),
        details: [],
    };
}

export async function writeCardioWorkoutToHealthConnect(
    input: CardioHealthWriteInput
): Promise<CardioHealthWriteResult> {
    const routePointCount = input.snapshot?.routePoints.length ?? 0;
    const routeLocations = getHealthConnectRouteLocations(input);
    const includeRoute = shouldWriteHealthConnectRoute(routeLocations);

    try {
        const granted = await requestAndroidWritePermissions(includeRoute);

        if (!granted) {
            return {
                provider: "health-connect",
                status: "failed",
                externalId: null,
                writtenAt: null,
                error: "Health Connect no concedió todos los permisos de escritura necesarios.",
                details: [
                    { key: "routeRequested", value: includeRoute },
                    { key: "routePointCount", value: routePointCount },
                ],
            };
        }

        const details: CardioHealthWriteDetail[] = [];
        const exerciseIds = await insertSingleRecord(
            buildExerciseSessionRecord(input, routeLocations)
        );
        const externalId = exerciseIds[0] ?? null;

        details.push({ key: "exerciseSessionWritten", value: true });
        details.push({ key: "exerciseRouteWritten", value: includeRoute });
        details.push({ key: "routePointCount", value: routePointCount });
        details.push({ key: "healthConnectRoutePointCount", value: routeLocations.length });

        if (routePointCount > 0 && !includeRoute) {
            details.push({
                key: "exerciseRouteSkippedReason",
                value: "Health Connect route writes require at least 2 valid route points.",
            });
        }

        const optionalRecords = [
            buildDistanceRecord(input),
            buildSpeedRecord(input),
            buildActiveCaloriesRecord(input),
        ].filter((record): record is HealthConnectRecord => record !== null);

        for (const record of optionalRecords) {
            const ids = await insertSingleRecord(record);
            details.push({ key: `${record.recordType}Written`, value: ids.length > 0 });
        }

        return {
            provider: "health-connect",
            status: "synced",
            externalId,
            writtenAt: toIsoNow(),
            error: null,
            details,
        };
    } catch (error: unknown) {
        return buildFailureResult(error);
    }
}
