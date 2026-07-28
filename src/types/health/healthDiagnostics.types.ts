// /src/types/health/healthDiagnostics.types.ts

import type { HealthProvider } from "@/src/types/health/cardio/health.types";
import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";

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

export type HealthDiagnosticEvent =
    | HealthAvailabilityDiagnosticEvent
    | HealthPermissionsDiagnosticEvent
    | HealthSleepQueryStartedDiagnosticEvent
    | HealthSleepQueryResultDiagnosticEvent
    | HealthSleepNormalizationDiagnosticEvent
    | HealthSleepQueryErrorDiagnosticEvent
    | HealthSleepPersistenceDiagnosticEvent;
