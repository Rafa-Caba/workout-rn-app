// src/types/health/healthCardio.types.ts

import type { HealthProvider } from "@/src/types/health/health.types";
import type {
    ISODate,
    ISODateTime,
    WorkoutCardioEnvironment,
    WorkoutDataSource,
    WorkoutSourceDevice,
} from "@/src/types/workoutDay.types";

/**
 * Neutral cardio activity family supported by the cardio module.
 * Keep this intentionally small for the first scope:
 * - walking
 * - running
 */
export type CardioActivityType = "walking" | "running";

/**
 * A single normalized point in a device-imported route.
 * Coordinates are optional-safe because some providers may partially omit
 * altitude, speed, or timestamp granularity for certain samples.
 */
export type CardioRoutePoint = {
    latitude: number;
    longitude: number;

    altitudeM: number | null;
    speedMps: number | null;

    recordedAt: ISODateTime | null;
};

/**
 * Normalized imported route for a cardio session.
 * No real map rendering yet, but this gives the UI enough information
 * to support:
 * - hasRoute
 * - route summary
 * - future map screen integration
 */
export type HealthImportedCardioRoute = {
    hasRoute: boolean;

    points: CardioRoutePoint[];

    /**
     * Lightweight summary for cards/detail views without requiring
     * the UI to iterate all points every time.
     */
    routeSummary: {
        pointCount: number;

        startLatitude: number | null;
        startLongitude: number | null;

        endLatitude: number | null;
        endLongitude: number | null;

        minLatitude: number | null;
        maxLatitude: number | null;

        minLongitude: number | null;
        maxLongitude: number | null;
    };

    raw: unknown | null;
};

/**
 * Neutral metrics imported from HealthKit / Health Connect
 * for walking/running sessions.
 *
 * Keep both generic and cardio-friendly fields together so the same
 * contract can power:
 * - dashboard totals
 * - session cards
 * - session detail screens
 */
export type HealthImportedCardioMetrics = {
    durationSeconds: number | null;

    activeKcal: number | null;
    totalKcal: number | null;

    avgHr: number | null;
    maxHr: number | null;

    distanceKm: number | null;
    steps: number | null;
    elevationGainM: number | null;

    paceSecPerKm: number | null;
    avgSpeedKmh: number | null;
    maxSpeedKmh: number | null;

    cadenceRpm: number | null;

    /**
     * Optional stride length when available from provider/device.
     */
    strideLengthM: number | null;
};

/**
 * A normalized imported cardio session before persistence
 * into WorkoutDay.training.sessions[].
 */
export type HealthImportedCardioSession = {
    /**
     * External/native identifier used for dedupe/merge logic when possible.
     */
    externalId: string | null;

    /**
     * Canonical app day this session belongs to.
     */
    date: ISODate;

    activityType: CardioActivityType;

    /**
     * Indoor/outdoor environment when the provider can expose or imply it.
     * Null is safer than guessing when the OS does not distinguish it.
     */
    cardioEnvironment: WorkoutCardioEnvironment;

    /**
     * Useful when the provider differentiates indoor/cardio variants.
     * Since current module scope is cardio-first, keep this optional-safe
     * instead of over-constraining the source contract.
     */
    providerWorkoutType: string | null;

    startAt: ISODateTime | null;
    endAt: ISODateTime | null;

    metrics: HealthImportedCardioMetrics;

    route: HealthImportedCardioRoute | null;

    source: WorkoutDataSource;
    sourceDevice: WorkoutSourceDevice | null;

    importedAt: ISODateTime | null;
    lastSyncedAt: ISODateTime | null;

    notes: string | null;

    raw: unknown | null;
};

/**
 * Typed read query for cardio imports.
 * Supports both single-day and explicit datetime-range reads.
 */
export type HealthImportedCardioQuery = {
    provider: HealthProvider;

    /**
     * Optional canonical app day for day bootstrap flows.
     */
    date?: ISODate;

    /**
     * Optional explicit range for screen-driven sync/detail fetches.
     */
    from?: ISODateTime;
    to?: ISODateTime;

    /**
     * Optional filtering by cardio family.
     * When omitted, providers may return both walking and running.
     */
    activityTypes?: CardioActivityType[];

    /**
     * Optional environment filtering for Cardio screens.
     */
    cardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[];
};

/**
 * Wrapper returned by cardio import/sync flows.
 */
export type HealthImportedCardioSessionsResult = {
    provider: HealthProvider;
    query: HealthImportedCardioQuery;

    sessions: HealthImportedCardioSession[];

    syncedAt: ISODateTime;
};
