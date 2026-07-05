// src/types/health.types.ts

import type {
    ISODate,
    ISODateTime,
    WorkoutCardioEnvironment,
    WorkoutDataSource,
    WorkoutSessionKind,
    WorkoutSourceDevice,
} from "../workoutDay.types";

/**
 * Neutral provider names for mobile health integrations.
 */
export type HealthProvider = "healthkit" | "health-connect";

/**
 * Permission status by capability / scope.
 * Keep generic enough so RN native bridge can map platform-specific states.
 */
export type HealthPermissionState =
    | "granted"
    | "denied"
    | "blocked"
    | "unavailable"
    | "unknown";

export type HealthPermissionsStatus = {
    provider: HealthProvider;
    available: boolean;
    permissions: Record<string, HealthPermissionState>;
    checkedAt: ISODateTime;
};

/**
 * Imported sleep block from device/provider before final WorkoutDay upsert.
 */
export type HealthImportedSleep = {
    date: ISODate;

    timeAsleepMinutes: number | null;
    timeInBedMinutes: number | null;
    score: number | null;

    awakeMinutes: number | null;
    remMinutes: number | null;
    coreMinutes: number | null;
    deepMinutes: number | null;

    source: WorkoutDataSource;
    sourceDevice: WorkoutSourceDevice | null;

    importedAt: ISODateTime | null;
    lastSyncedAt: ISODateTime | null;

    raw: unknown | null;
};

/**
 * Neutral workout metrics imported from device/provider.
 * These can be used either for:
 * - a full imported device session
 * - or enrichment of an existing gym-check session
 */
export type HealthImportedWorkoutMetrics = {
    durationSeconds: number | null;

    activeKcal: number | null;
    totalKcal: number | null;

    avgHr: number | null;
    maxHr: number | null;

    distanceKm: number | null;
    steps: number | null;
    elevationGainM: number | null;

    paceSecPerKm: number | null;
    cadenceRpm: number | null;

    effortRpe: number | null;
};


/**
 * A single normalized route point imported from native health providers.
 * Some providers omit altitude, speed, or timestamp data, so those fields
 * remain nullable while latitude/longitude are required for map usability.
 */
export type HealthImportedWorkoutRoutePoint = {
    latitude: number;
    longitude: number;
    altitudeM: number | null;
    speedMps: number | null;
    recordedAt: ISODateTime | null;
};

/**
 * Neutral route representation for imported walking/running workouts.
 * This lets Cardio decide outdoor vs indoor by actual route availability
 * without tying HealthKit and Health Connect to UI-specific types.
 */
export type HealthImportedWorkoutRoute = {
    hasRoute: boolean;
    points: HealthImportedWorkoutRoutePoint[];
    raw: unknown | null;
};

/**
 * Minimal imported session representation from HealthKit / Health Connect.
 * This is intentionally neutral and detached from FE gym-check exercise details.
 */
export type HealthImportedWorkoutSessionMinimal = {
    /**
     * Optional provider/external identifier to support dedupe.
     */
    externalId?: string | null;

    /**
     * Useful for day bootstrap flows when the provider gives a session-local date.
     */
    date?: ISODate | null;

    type: string;

    /**
     * Optional provider-specific type label/code before app normalization.
     * Examples: RUNNING, RUNNING_TREADMILL, HKWorkoutActivityTypeRunning.
     */
    providerWorkoutType?: string | null;

    /**
     * Optional environment hint when the provider exposes it.
     * Null means unknown; Cardio can still infer outdoor from route availability.
     */
    cardioEnvironment?: WorkoutCardioEnvironment;

    startAt: ISODateTime | null;
    endAt: ISODateTime | null;

    metrics: HealthImportedWorkoutMetrics;

    /**
     * Optional route points when the provider exposes workout routes.
     */
    route?: HealthImportedWorkoutRoute | null;

    notes?: string | null;

    source: WorkoutDataSource;
    sourceDevice: WorkoutSourceDevice | null;

    importedAt: ISODateTime | null;
    lastSyncedAt: ISODateTime | null;

    sessionKind: WorkoutSessionKind;

    raw: unknown | null;
};

/**
 * Optional request helpers for sync/import flows.
 */
export type HealthSyncSleepInput = {
    provider: HealthProvider;
    from: ISODate;
    to: ISODate;
};

export type HealthSyncWorkoutInput = {
    provider: HealthProvider;
    from: ISODateTime;
    to: ISODateTime;
};

export type HealthSyncResult<T> = {
    provider: HealthProvider;
    items: T[];
    syncedAt: ISODateTime;
};