// src/services/health/cardio/cardioIOSWrite.service.ts
// iOS HealthKit writer for app-created Cardio sessions.
// Uses defensive runtime access because react-native-health exposes permissions
// through AppleHealthKit.Constants.Permissions, not through the HealthPermission
// type-only export at runtime.

import AppleHealthKit, {
    type HealthKitPermissions,
    type HealthPermission,
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

type HealthPermissionName = "Workout" | "DistanceWalkingRunning" | "ActiveEnergyBurned";
type HealthActivityName = "Walking" | "Running";

type InitHealthKitResult =
    | {
        granted: true;
        error: null;
    }
    | {
        granted: false;
        error: string;
    };

type HealthWorkoutSaveOptions = {
    type: string;
    startDate: string;
    endDate: string;
    energyBurned?: number;
    energyBurnedUnit?: "calorie" | "kilocalorie";
    distance?: number;
    distanceUnit?: "meter" | "mile";
};

type AppleHealthKitWriteModuleLike = {
    isAvailable?: (callback: (error: string | null, result: boolean) => void) => void;
    initHealthKit?: (
        permissions: HealthKitPermissions,
        callback: (error: string | null) => void
    ) => void;
    saveWorkout?: (
        options: HealthWorkoutSaveOptions,
        callback: (error: string | null, result: unknown) => void
    ) => void;
    Constants?: {
        Permissions?: Partial<Record<HealthPermissionName, HealthPermission>>;
        Activities?: Partial<Record<HealthActivityName, string>>;
    };
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getHealthModule(): AppleHealthKitWriteModuleLike | null {
    const moduleCandidate: unknown = AppleHealthKit;

    if (!isRecord(moduleCandidate)) {
        return null;
    }

    return moduleCandidate;
}

function hasFunction<K extends keyof AppleHealthKitWriteModuleLike>(
    moduleRef: AppleHealthKitWriteModuleLike | null,
    key: K
): moduleRef is AppleHealthKitWriteModuleLike & Required<Pick<AppleHealthKitWriteModuleLike, K>> {
    return Boolean(moduleRef && typeof moduleRef[key] === "function");
}

function getWritePermissions(moduleRef: AppleHealthKitWriteModuleLike): HealthPermission[] | null {
    const permissionsMap = moduleRef.Constants?.Permissions;

    if (!permissionsMap?.Workout) {
        return null;
    }

    const permissions: HealthPermission[] = [permissionsMap.Workout];

    if (permissionsMap.DistanceWalkingRunning) {
        permissions.push(permissionsMap.DistanceWalkingRunning);
    }

    if (permissionsMap.ActiveEnergyBurned) {
        permissions.push(permissionsMap.ActiveEnergyBurned);
    }

    return Array.from(new Set(permissions));
}

function isHealthKitAvailable(moduleRef: AppleHealthKitWriteModuleLike): Promise<boolean> {
    return new Promise((resolve) => {
        if (!hasFunction(moduleRef, "isAvailable")) {
            resolve(true);
            return;
        }

        moduleRef.isAvailable((error: string | null, available: boolean) => {
            if (error) {
                resolve(false);
                return;
            }

            resolve(Boolean(available));
        });
    });
}

function initHealthKitForWorkoutWrite(): Promise<InitHealthKitResult> {
    return new Promise((resolve) => {
        const moduleRef = getHealthModule();

        if (!moduleRef) {
            resolve({
                granted: false,
                error: "HealthKit no está disponible en este build nativo.",
            });
            return;
        }

        if (!hasFunction(moduleRef, "initHealthKit")) {
            resolve({
                granted: false,
                error: "El módulo nativo de HealthKit no expone initHealthKit.",
            });
            return;
        }

        void isHealthKitAvailable(moduleRef).then((available) => {
            if (!available) {
                resolve({
                    granted: false,
                    error: "HealthKit no está disponible en este entorno o dispositivo.",
                });
                return;
            }

            const writePermissions = getWritePermissions(moduleRef);

            if (!writePermissions) {
                resolve({
                    granted: false,
                    error: "No se encontraron permisos HealthKit para escribir Workout en react-native-health.",
                });
                return;
            }

            const permissions: HealthKitPermissions = {
                permissions: {
                    read: writePermissions,
                    write: writePermissions,
                },
            };

            moduleRef.initHealthKit(permissions, (error: string | null) => {
                if (error) {
                    resolve({ granted: false, error });
                    return;
                }

                resolve({ granted: true, error: null });
            });
        });
    });
}

function extractExternalId(result: unknown, options: HealthWorkoutSaveOptions): string {
    if (typeof result === "string" && result.trim()) {
        return result;
    }

    if (isRecord(result)) {
        const value = result.value;
        if (typeof value === "string" && value.trim()) {
            return value;
        }

        const id = result.id;
        if (typeof id === "string" && id.trim()) {
            return id;
        }

        const uuid = result.uuid;
        if (typeof uuid === "string" && uuid.trim()) {
            return uuid;
        }
    }

    return `healthkit|${options.type}|${options.startDate}`;
}

function saveHealthKitWorkout(options: HealthWorkoutSaveOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        const moduleRef = getHealthModule();

        if (!hasFunction(moduleRef, "saveWorkout")) {
            reject(new Error("El módulo nativo de HealthKit no expone saveWorkout."));
            return;
        }

        moduleRef.saveWorkout(options, (error: string | null, result: unknown) => {
            if (error) {
                reject(new Error(error));
                return;
            }

            resolve(extractExternalId(result, options));
        });
    });
}

function resolveHealthKitActivity(input: CardioHealthWriteInput): string {
    const activityType = getSessionActivityType(input.session);
    const activityName: HealthActivityName = activityType === "running" ? "Running" : "Walking";
    const moduleRef = getHealthModule();
    const activityFromConstants = moduleRef?.Constants?.Activities?.[activityName];

    return typeof activityFromConstants === "string" && activityFromConstants.trim()
        ? activityFromConstants
        : activityName;
}

function buildHealthKitWorkoutOptions(input: CardioHealthWriteInput): HealthWorkoutSaveOptions {
    const startDate = getSessionStartAt(input.session);
    const endDate = getSessionEndAt(input.session);
    const distanceKm = getSessionDistanceKm(input.session, input.snapshot);
    const activeKcal = getSessionActiveKcal(input.session);

    if (!startDate || !endDate) {
        throw new Error("La sesión no trae startAt/endAt para escribir en HealthKit.");
    }

    return {
        type: resolveHealthKitActivity(input),
        startDate,
        endDate,
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
        const initResult = await initHealthKitForWorkoutWrite();

        if (!initResult.granted) {
            return {
                provider: "healthkit",
                status: "failed",
                externalId: null,
                writtenAt: null,
                error: initResult.error,
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
