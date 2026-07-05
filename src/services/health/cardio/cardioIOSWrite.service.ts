// src/services/health/cardio/cardioIOSWrite.service.ts
// iOS HealthKit writer for app-created Cardio sessions.

import AppleHealthKit, {
    HealthActivity,
    type HealthActivityOptions,
    type HealthKitPermissions,
    HealthPermission,
} from "react-native-health";

import {
    getErrorMessage,
    getSessionActiveKcal,
    getSessionActivityType,
    getSessionDistanceKm,
    getSessionEndAt,
    getSessionStartAt,
    isFinitePositiveNumber,
    toIsoNow,
} from "@/src/services/health/cardio/cardioHealthWrite.helpers";
import type {
    CardioHealthWriteDetail,
    CardioHealthWriteInput,
    CardioHealthWriteResult,
} from "@/src/types/health/cardio/cardioHealthWrite.types";

function initHealthKitForWorkoutWrite(): Promise<boolean> {
    return new Promise((resolve) => {
        const permissions: HealthKitPermissions = {
            permissions: {
                read: [
                    HealthPermission.Workout,
                    HealthPermission.DistanceWalkingRunning,
                    HealthPermission.ActiveEnergyBurned,
                ],
                write: [
                    HealthPermission.Workout,
                    HealthPermission.DistanceWalkingRunning,
                    HealthPermission.ActiveEnergyBurned,
                ],
            },
        };

        AppleHealthKit.initHealthKit(permissions, (error: string) => {
            resolve(!error);
        });
    });
}

type HealthWorkoutSaveOptions = HealthActivityOptions & {
    energyBurned?: number;
    energyBurnedUnit?: "calorie" | "kilocalorie";
    distance?: number;
    distanceUnit?: "meter" | "mile";
};

function saveHealthKitWorkout(options: HealthWorkoutSaveOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        AppleHealthKit.saveWorkout(options, (error: string, result) => {
            if (error) {
                reject(new Error(error));
                return;
            }

            const output: unknown = result;

            if (typeof output === "string") {
                resolve(output);
                return;
            }

            if (typeof output === "object" && output !== null && "value" in output) {
                const value = output.value;
                if (typeof value === "string") {
                    resolve(value);
                    return;
                }
            }

            if (typeof output === "object" && output !== null && "id" in output) {
                const id = output.id;
                if (typeof id === "string") {
                    resolve(id);
                    return;
                }
            }

            resolve(`healthkit|${options.type}|${options.startDate}`);
        });
    });
}

function resolveHealthKitActivity(input: CardioHealthWriteInput): HealthActivity {
    const activityType = getSessionActivityType(input.session);
    return activityType === "running" ? HealthActivity.Running : HealthActivity.Walking;
}

function buildHealthKitWorkoutOptions(input: CardioHealthWriteInput): HealthWorkoutSaveOptions {
    const startDate = getSessionStartAt(input.session);
    const endDate = getSessionEndAt(input.session);
    const distanceKm = getSessionDistanceKm(input.session, input.snapshot);
    const activeKcal = getSessionActiveKcal(input.session);

    if (!startDate || !endDate) {
        throw new Error("La sesión no trae startAt/endAt para escribir en HealthKit.");
    }

    const baseOptions: HealthActivityOptions = {
        type: resolveHealthKitActivity(input),
        startDate,
        endDate,
    };

    return {
        ...baseOptions,
        ...(isFinitePositiveNumber(activeKcal)
            ? {
                energyBurned: activeKcal,
                energyBurnedUnit: "kilocalorie" as const,
            }
            : {}),
        ...(isFinitePositiveNumber(distanceKm)
            ? {
                distance: distanceKm * 1000,
                distanceUnit: "meter" as const,
            }
            : {}),
    };
}

function buildFailureResult(error: unknown): CardioHealthWriteResult {
    return {
        provider: "healthkit",
        status: "failed",
        externalId: null,
        writtenAt: null,
        error: getErrorMessage(error, "No se pudo escribir la sesión en HealthKit."),
        details: [],
    };
}

export async function writeCardioWorkoutToHealthKit(
    input: CardioHealthWriteInput
): Promise<CardioHealthWriteResult> {
    try {
        const granted = await initHealthKitForWorkoutWrite();

        if (!granted) {
            return {
                provider: "healthkit",
                status: "failed",
                externalId: null,
                writtenAt: null,
                error: "HealthKit no concedió permisos de escritura para Workout.",
                details: [],
            };
        }

        const options = buildHealthKitWorkoutOptions(input);
        const externalId = await saveHealthKitWorkout(options);
        const details: CardioHealthWriteDetail[] = [
            { key: "workoutWritten", value: true },
            { key: "distanceWritten", value: typeof options.distance === "number" },
            { key: "energyWritten", value: typeof options.energyBurned === "number" },
            {
                key: "routeWritten",
                value: false,
            },
        ];

        return {
            provider: "healthkit",
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
