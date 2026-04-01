// src/types/health/healthOutdoor.types.ts

import type { HealthProvider } from "@/src/types/health/health.types";
import type {
    ISODate,
    ISODateTime,
    WorkoutDataSource,
    WorkoutSourceDevice,
} from "@/src/types/workoutDay.types";

/**
 * Neutral outdoor activity family supported by the outdoor module.
 * Keep this intentionally small for the first scope:
 * - walking
 * - running
 */
export type OutdoorActivityType = "walking" | "running";

/**
 * A single normalized point in a device-imported route.
 * Coordinates are optional-safe because some providers may partially omit
 * altitude, speed, or timestamp granularity for certain samples.
 */
export type OutdoorRoutePoint = {
    latitude: number;
    longitude: number;

    altitudeM: number | null;
    speedMps: number | null;

    recordedAt: ISODateTime | null;
};

/**
 * Normalized imported route for an outdoor session.
 * No real map rendering yet, but this gives the UI enough information
 * to support:
 * - hasRoute
 * - route summary
 * - future map screen integration
 */
export type HealthImportedOutdoorRoute = {
    hasRoute: boolean;

    points: OutdoorRoutePoint[];

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
 * Keep both generic and outdoor-friendly fields together so the same
 * contract can power:
 * - dashboard totals
 * - session cards
 * - session detail screens
 */
export type HealthImportedOutdoorMetrics = {
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
 * A normalized imported outdoor session before persistence
 * into WorkoutDay.training.sessions[].
 */
export type HealthImportedOutdoorSession = {
    /**
     * External/native identifier used for dedupe/merge logic when possible.
     */
    externalId: string | null;

    /**
     * Canonical app day this session belongs to.
     */
    date: ISODate;

    activityType: OutdoorActivityType;

    /**
     * Useful when the provider differentiates indoor/outdoor variants.
     * Since current module scope is outdoor-first, keep this optional-safe
     * instead of over-constraining the source contract.
     */
    providerWorkoutType: string | null;

    startAt: ISODateTime | null;
    endAt: ISODateTime | null;

    metrics: HealthImportedOutdoorMetrics;

    route: HealthImportedOutdoorRoute | null;

    source: WorkoutDataSource;
    sourceDevice: WorkoutSourceDevice | null;

    importedAt: ISODateTime | null;
    lastSyncedAt: ISODateTime | null;

    notes: string | null;

    raw: unknown | null;
};

/**
 * Typed read query for outdoor imports.
 * Supports both single-day and explicit datetime-range reads.
 */
export type HealthImportedOutdoorQuery = {
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
     * Optional filtering by outdoor family.
     * When omitted, providers may return both walking and running.
     */
    activityTypes?: OutdoorActivityType[];
};

/**
 * Wrapper returned by outdoor import/sync flows.
 */
export type HealthImportedOutdoorSessionsResult = {
    provider: HealthProvider;
    query: HealthImportedOutdoorQuery;

    sessions: HealthImportedOutdoorSession[];

    syncedAt: ISODateTime;
};