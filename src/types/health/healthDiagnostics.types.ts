// /src/types/health/healthDiagnostics.types.ts
// Strongly typed local Health diagnostics for sleep, gym workouts, and cardio sync.

import type { HealthProvider } from "@/src/types/health/cardio/health.types";
import type { CardioActivityType } from "@/src/types/health/cardio/healthCardio.types";
import type {
    ISODate,
    ISODateTime,
    WorkoutCardioEnvironment,
    WorkoutDataSource,
} from "@/src/types/workoutDay.types";

/**
 * JSON-safe values used in local diagnostic snapshots.
 * Health diagnostics never require executable/native objects.
 */
export type HealthDiagnosticJsonPrimitive = string | number | boolean | null;
export type HealthDiagnosticJsonValue =
    | HealthDiagnosticJsonPrimitive
    | HealthDiagnosticJsonValue[]
    | { [key: string]: HealthDiagnosticJsonValue };

export type HealthDiagnosticLevel = "info" | "warning" | "error";

export type HealthSleepStageBucket =
    | "awake"
    | "rem"
    | "core"
    | "deep"
    | "in-bed"
    | "asleep"
    | "unknown";

/**
 * Sanitized local-only representation of a HealthKit sleep sample.
 * The original object is reduced to JSON-safe data before it is stored.
 */
export type HealthSleepDiagnosticSample = {
    id: string | null;
    startDate: ISODateTime | null;
    endDate: ISODateTime | null;
    value: string | null;
    bucket: HealthSleepStageBucket;
    sourceId: string | null;
    sourceName: string | null;
    durationMinutes: number | null;
    nightKey: ISODate | null;
    raw: HealthDiagnosticJsonValue | null;
};

export type HealthSleepQueryRange = {
    targetDate: ISODate;
    startDate: ISODateTime;
    endDate: ISODateTime;
    strategy: "previous-noon-to-target-evening";
};

export type HealthSleepSourceSummary = {
    sourceKey: string;
    sourceId: string | null;
    sourceName: string | null;
    sampleCount: number;
    detailedStageMinutes: number;
    genericAsleepMinutes: number;
    inBedMinutes: number;
    awakeMinutes: number;
    selected: boolean;
    selectedForInBed: boolean;
};

export type HealthSleepNightSummary = {
    startDate: ISODateTime;
    endDate: ISODateTime;
    sampleCount: number;
    meaningfulSleepMinutes: number;
    selected: boolean;
};

export type HealthSleepNormalizedTotals = {
    timeAsleepMinutes: number | null;
    timeInBedMinutes: number | null;
    awakeMinutes: number | null;
    remMinutes: number | null;
    coreMinutes: number | null;
    deepMinutes: number | null;
};

export type HealthWorkoutQueryRange = {
    targetDate: ISODate;
    startDate: ISODateTime;
    endDate: ISODateTime;
    strategy: "local-calendar-day";
};

export type HealthWorkoutDiagnosticMetrics = {
    durationSeconds: number | null;
    activeKcal: number | null;
    totalKcal: number | null;
    totalKcalEstimated: boolean;
    avgHr: number | null;
    maxHr: number | null;
    distanceKm: number | null;
    steps: number | null;
    elevationGainM: number | null;
    paceSecPerKm: number | null;
    cadenceRpm: number | null;
    effortRpe: number | null;
};

export type HealthWorkoutDiagnosticSample = {
    externalId: string | null;
    type: string;
    providerWorkoutType: string | null;
    startAt: ISODateTime | null;
    endAt: ISODateTime | null;
    sourceDevice: string | null;
    eligibleForGymCheck: boolean;
    hasMeaningfulMetrics: boolean;
    metrics: HealthWorkoutDiagnosticMetrics;
    raw: HealthDiagnosticJsonValue | null;
};

/**
 * Cardio-specific diagnostic projection. It keeps the useful workout/session
 * fields plus a bounded route preview without persisting native raw objects to API.
 */
export type HealthCardioDiagnosticMetrics = {
    durationSeconds: number | null;
    activeKcal: number | null;
    totalKcal: number | null;
    totalKcalEstimated: boolean;
    avgHr: number | null;
    maxHr: number | null;
    distanceKm: number | null;
    steps: number | null;
    elevationGainM: number | null;
    paceSecPerKm: number | null;
    avgSpeedKmh: number | null;
    maxSpeedKmh: number | null;
    cadenceRpm: number | null;
    effortRpe: number | null;
    strideLengthM: number | null;
};

export type HealthCardioDiagnosticRoutePoint = {
    latitude: number;
    longitude: number;
    altitudeM: number | null;
    accuracyM: number | null;
    speedMps: number | null;
    headingDeg: number | null;
    recordedAt: ISODateTime | null;
};

export type HealthCardioDiagnosticRoute = {
    hasRoute: boolean;
    pointCount: number;
    pointsStored: number;
    pointsTruncated: boolean;
    points: HealthCardioDiagnosticRoutePoint[];
    summary: HealthDiagnosticJsonValue | null;
    raw: HealthDiagnosticJsonValue | null;
};

export type HealthCardioDiagnosticSession = {
    externalId: string | null;
    date: ISODate;
    activityType: CardioActivityType;
    cardioEnvironment: WorkoutCardioEnvironment;
    providerWorkoutType: string | null;
    startAt: ISODateTime | null;
    endAt: ISODateTime | null;
    source: WorkoutDataSource;
    sourceDevice: string | null;
    metrics: HealthCardioDiagnosticMetrics;
    route: HealthCardioDiagnosticRoute;
    raw: HealthDiagnosticJsonValue | null;
};

export type HealthCardioPersistenceOperation = {
    operation: "create" | "patch";
    sessionId: string | null;
    externalId: string | null;
    activityType: CardioActivityType | null;
    payload: HealthDiagnosticJsonValue | null;
};

export type HealthDiagnosticEventBase = {
    id: string;
    createdAt: ISODateTime;
    provider: HealthProvider;
    level: HealthDiagnosticLevel;
};

export type HealthAvailabilityDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "availability";
    available: boolean;
    nativeFunctionAvailable: boolean;
    errorMessage: string | null;
};

export type HealthPermissionsDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "permissions";
    requestedPermissions: string[];
    nativeRequestCompleted: boolean;
    readAccessVerification: "confirmed" | "requested-only" | "unknown";
    errorMessage: string | null;
};

export type HealthSleepQueryStartedDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "sleep-query-started";
    range: HealthSleepQueryRange;
};

export type HealthSleepQueryResultDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "sleep-query-result";
    range: HealthSleepQueryRange;
    receivedSampleCount: number;
    storedSampleCount: number;
    samplesTruncated: boolean;
    samples: HealthSleepDiagnosticSample[];
};

export type HealthSleepNormalizationDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "sleep-normalization";
    targetDate: ISODate;
    receivedSampleCount: number;
    validSampleCount: number;
    rejectedSampleCount: number;
    duplicateSampleCount: number;
    targetDateSampleCount: number;
    targetNightSampleCount: number;
    discardedTargetDateSampleCount: number;
    availableNightKeys: ISODate[];
    nightSummaries: HealthSleepNightSummary[];
    unknownValues: string[];
    selectedSourceKey: string | null;
    sourceSummaries: HealthSleepSourceSummary[];
    totals: HealthSleepNormalizedTotals;
    outcome: "normalized" | "no-samples" | "no-target-night" | "no-meaningful-sleep";
};

export type HealthSleepQueryErrorDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "sleep-query-error";
    targetDate: ISODate;
    range: HealthSleepQueryRange | null;
    errorMessage: string;
    nativeCode: string | null;
};

export type HealthSleepPersistenceDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "sleep-persistence";
    targetDate: ISODate;
    saved: boolean;
    rawPersisted: false;
    errorMessage: string | null;
};

export type HealthWorkoutQueryStartedDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "workout-query-started";
    range: HealthWorkoutQueryRange;
};

export type HealthWorkoutQueryResultDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "workout-query-result";
    range: HealthWorkoutQueryRange;
    receivedSampleCount: number;
    mappedSampleCount: number;
    rejectedSampleCount: number;
    storedSampleCount: number;
    samplesTruncated: boolean;
    samples: HealthWorkoutDiagnosticSample[];
};

export type HealthWorkoutSelectionDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "workout-selection";
    targetDate: ISODate;
    candidateCount: number;
    matchingCandidateCount?: number;
    meaningfulCandidateCount: number;
    requiredProviderWorkoutType?: string;
    selectedExternalId: string | null;
    selectedType: string | null;
    selectedSample?: HealthWorkoutDiagnosticSample | null;
    outcome:
    | "selected"
    | "no-samples"
    | "no-matching-workout"
    | "no-meaningful-workout";
};

export type HealthWorkoutQueryErrorDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "workout-query-error";
    targetDate: ISODate;
    range: HealthWorkoutQueryRange | null;
    errorMessage: string;
    nativeCode: string | null;
};

export type HealthWorkoutPersistenceDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "workout-persistence";
    targetDate: ISODate;
    saved: boolean;
    mode: "patched-existing-session" | "created-minimal-session" | "noop";
    selectedExternalId: string | null;
    errorMessage: string | null;
};

export type HealthCardioInspectionDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "cardio-inspection";
    targetDate: ISODate;
    includeRoutes: boolean;
    existingSessionCount: number;
    importedSessionCount: number;
    mappedSessionCount: number;
    routeSessionCount: number;
    routePointCount: number;
    sessionsStored: number;
    sessionsTruncated: boolean;
    sessions: HealthCardioDiagnosticSession[];
};

export type HealthCardioMergeDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "cardio-merge";
    targetDate: ISODate;
    existingSessionCount: number;
    mergedSessionCount: number;
    insertedCount: number;
    updatedCount: number;
    unchangedCount: number;
    operations: HealthCardioPersistenceOperation[];
};

export type HealthCardioPersistenceDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "cardio-persistence";
    targetDate: ISODate;
    operation: "create" | "patch";
    sessionId: string | null;
    externalId: string | null;
    saved: boolean;
    httpStatus: number | null;
    apiCode: string | null;
    message: string;
    validationDetails: HealthDiagnosticJsonValue | null;
    payload: HealthDiagnosticJsonValue | null;
};

export type HealthCardioSyncCompletedDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "cardio-sync-completed";
    targetDate: ISODate;
    importedCount: number;
    insertedCount: number;
    updatedCount: number;
    unchangedCount: number;
    persistedCount: number;
    routeSessionCount: number;
    routePointCount: number;
};

export type HealthCardioSyncErrorDiagnosticEvent = HealthDiagnosticEventBase & {
    kind: "cardio-sync-error";
    targetDate: ISODate;
    stage: "provider" | "inspection" | "merge" | "persistence" | "refresh";
    httpStatus: number | null;
    apiCode: string | null;
    message: string;
    validationDetails: HealthDiagnosticJsonValue | null;
    payload: HealthDiagnosticJsonValue | null;
};

export type HealthDiagnosticEvent =
    | HealthAvailabilityDiagnosticEvent
    | HealthPermissionsDiagnosticEvent
    | HealthSleepQueryStartedDiagnosticEvent
    | HealthSleepQueryResultDiagnosticEvent
    | HealthSleepNormalizationDiagnosticEvent
    | HealthSleepQueryErrorDiagnosticEvent
    | HealthSleepPersistenceDiagnosticEvent
    | HealthWorkoutQueryStartedDiagnosticEvent
    | HealthWorkoutQueryResultDiagnosticEvent
    | HealthWorkoutSelectionDiagnosticEvent
    | HealthWorkoutQueryErrorDiagnosticEvent
    | HealthWorkoutPersistenceDiagnosticEvent
    | HealthCardioInspectionDiagnosticEvent
    | HealthCardioMergeDiagnosticEvent
    | HealthCardioPersistenceDiagnosticEvent
    | HealthCardioSyncCompletedDiagnosticEvent
    | HealthCardioSyncErrorDiagnosticEvent;
