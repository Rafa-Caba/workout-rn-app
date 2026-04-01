// src/types/workoutDay.types.ts

/**
 * Keep FE names to avoid breaking imports.
 * This file mirrors BE shape while preserving existing FE type names.
 */

/**
 * Canonical date keys
 */
export type ISODate = string; // "YYYY-MM-DD"
export type ISODateTime = string; // ISO datetime
export type WeekKey = string; // "YYYY-W##"

/**
 * =========================================================
 * Health / source helpers
 * =========================================================
 */

export type WorkoutDataSource = "manual" | "healthkit" | "health-connect";

export type WorkoutSessionKind = "device-import" | "gym-check";

/**
 * Neutral activity family used by training sessions.
 * Keep current compatibility with existing gym/manual/device-import sessions,
 * while adding explicit outdoor support.
 */
export type WorkoutActivityType = "walking" | "running" | null;

/**
 * Keep broad string support because device names may vary:
 * - "Apple Watch"
 * - "iPhone"
 * - "Samsung Watch"
 * - "Pixel Watch"
 * - etc.
 */
export type WorkoutSourceDevice = string;

export type UpsertMode = "merge" | "replace";

/**
 * =========================================================
 * Media (FE names preserved)
 * =========================================================
 */

export type WorkoutMediaResourceType = "image" | "video";
export type WeightUnit = "lb" | "kg";

/**
 * Mirrors WorkoutMediaItemSchema (WorkoutDay.model)
 * Note: schema uses { _id: false } so NO "id" here.
 */
export type WorkoutMediaItem = {
    publicId: string;
    url: string;
    resourceType: WorkoutMediaResourceType;
    format: string | null;
    createdAt: ISODateTime;
    meta: Record<string, unknown> | null;
};

/**
 * =========================================================
 * Exercises (actual performed)
 * =========================================================
 */

export type WorkoutExerciseSet = {
    setIndex: number;

    reps: number | null;
    weight: number | null;

    unit: WeightUnit;

    rpe: number | null;

    isWarmup: boolean;
    isDropSet: boolean;

    tempo: string | null;
    restSec: number | null;

    tags: string[] | null;

    meta: Record<string, unknown> | null;
};

/**
 * Strongly typed plan and gym-check meta blocks
 * based on the real document shape already used by the app.
 */
export type WorkoutExerciseGymCheckMeta = {
    done: boolean;
    durationMin: number | null;
    mediaPublicIds: string[] | null;
    exerciseId: string | null;
};

export type WorkoutExercisePlanMeta = {
    sets: string | null;
    reps: string | null;
    load: string | null;
    rpe: string | null;
    attachmentPublicIds: string[] | null;
};

export type WorkoutExerciseMeta = {
    gymCheck?: WorkoutExerciseGymCheckMeta | null;
    plan?: WorkoutExercisePlanMeta | null;
} & Record<string, unknown>;

export type WorkoutExercise = {
    id: string;

    name: string;

    movementId: string | null;
    movementName: string | null;

    notes: string | null;

    /**
     * - null means "no block"
     * - [] means explicitly empty
     */
    sets: WorkoutExerciseSet[] | null;

    meta: WorkoutExerciseMeta | null;
};

/**
 * =========================================================
 * Training sessions & blocks
 * =========================================================
 */

/**
 * Outdoor-specific normalized metrics.
 * These are kept grouped so outdoor screens can read them directly
 * without overloading the generic session root fields.
 */
export type WorkoutOutdoorMetrics = {
    distanceKm: number | null;
    steps: number | null;
    elevationGainM: number | null;

    paceSecPerKm: number | null;
    avgSpeedKmh: number | null;
    maxSpeedKmh: number | null;

    cadenceRpm: number | null;
    strideLengthM: number | null;
};

/**
 * Lightweight route summary persisted with the session so the UI can:
 * - know if a route exists
 * - render future preview/map placeholders
 * - avoid recalculating bounds from raw points each time
 */
export type WorkoutRouteSummary = {
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

export type WorkoutSessionMeta = {
    /**
     * Existing keys used today
     */
    sessionKey?: string | null;
    trainingSource?: string | null;
    dayEffortRpe?: number | null;

    /**
     * New typed import/source fields
     */
    source?: WorkoutDataSource | null;
    sourceDevice?: WorkoutSourceDevice | null;
    importedAt?: ISODateTime | null;
    lastSyncedAt?: ISODateTime | null;
    sessionKind?: WorkoutSessionKind | null;

    /**
     * Useful import helpers kept flexible
     */
    externalId?: string | null;
    originalType?: string | null;
    provider?: string | null;
} & Record<string, unknown>;

export type WorkoutSession = {
    id: string;

    type: string;

    /**
     * Neutral activity family.
     * - walking / running for outdoor module
     * - null for existing gym/manual sessions that do not need this field
     */
    activityType: WorkoutActivityType;

    startAt: ISODateTime | null;
    endAt: ISODateTime | null;

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

    /**
     * Outdoor route support.
     * No real map yet, but enough for session cards/detail state.
     */
    hasRoute: boolean;
    routeSummary: WorkoutRouteSummary | null;
    outdoorMetrics: WorkoutOutdoorMetrics | null;

    effortRpe: number | null;

    notes: string | null;

    media: WorkoutMediaItem[] | null;
    exercises: WorkoutExercise[] | null;

    meta: WorkoutSessionMeta | null;
};

export type TrainingBlock = {
    sessions: WorkoutSession[] | null;

    source: WorkoutDataSource | null;
    dayEffortRpe: number | null;

    raw: unknown | null;
};

/**
 * =========================================================
 * Sleep
 * =========================================================
 */

export type SleepBlock = {
    timeAsleepMinutes: number | null;

    timeInBedMinutes: number | null;

    score: number | null;

    awakeMinutes: number | null;
    remMinutes: number | null;
    coreMinutes: number | null;
    deepMinutes: number | null;

    source: WorkoutDataSource | null;

    /**
     * Import/sync metadata
     */
    sourceDevice: WorkoutSourceDevice | null;
    importedAt: ISODateTime | null;
    lastSyncedAt: ISODateTime | null;

    raw: unknown | null;
};

/**
 * =========================================================
 * Planned routine
 * =========================================================
 */

export type PlannedRoutineSource = "trainer" | "template";

export type PlannedRoutineExercise = {
    id: string;

    name: string;

    movementId: string | null;
    movementName: string | null;

    sets: number | null;
    reps: string | null;
    rpe: number | null;

    load: string | null;
    notes: string | null;

    attachmentPublicIds: string[] | null;
};

export type PlannedRoutine = {
    sessionType: string | null;
    focus: string | null;
    exercises: PlannedRoutineExercise[] | null;

    notes: string | null;
    tags: string[] | null;
};

export type PlannedMeta = {
    plannedBy: string;
    plannedAt: ISODateTime;
    source: PlannedRoutineSource | null;
};

/**
 * =========================================================
 * WorkoutDay doc
 * =========================================================
 */

export type WorkoutDayMeta = Record<string, unknown> | null;

export type WorkoutDay = {
    id: string;

    userId?: string;

    date: ISODate;
    weekKey: WeekKey;

    sleep: SleepBlock | null;
    training: TrainingBlock | null;

    plannedRoutine: PlannedRoutine | null;
    plannedMeta: PlannedMeta | null;

    notes: string | null;
    tags: string[] | null;

    meta: WorkoutDayMeta;

    createdAt?: ISODateTime;
    updatedAt?: ISODateTime;
};

/**
 * =========================================================
 * Calendar / summary / view types
 * =========================================================
 */

export type CalendarTotals = {
    totalSessions: number;

    totalDurationSeconds: number | null;
    totalActiveKcal: number | null;
    totalKcal: number | null;

    totalDistanceKm: number | null;
    totalSteps: number | null;
    totalElevationGainM: number | null;

    avgHr: number | null;
    maxHr: number | null;

    avgPaceSecPerKm: number | null;
    avgCadenceRpm: number | null;
};

export type TrainingTypeTotals = {
    type: string;
    sessions: number;

    totalDurationSeconds: number | null;
    totalActiveKcal: number | null;
    totalKcal: number | null;

    totalDistanceKm: number | null;
    totalSteps: number | null;
    totalElevationGainM: number | null;

    avgHr: number | null;
    maxHr: number | null;

    avgPaceSecPerKm: number | null;
    avgCadenceRpm: number | null;
};

export type SleepSummary = {
    timeAsleepMinutes: number | null;
    timeInBedMinutes: number | null;
    score: number | null;
    awakeMinutes: number | null;
    remMinutes: number | null;
    coreMinutes: number | null;
    deepMinutes: number | null;
};

export type TrainingSummary = {
    source: WorkoutDataSource | null;
    dayEffortRpe: number | null;
    sessionsCount: number;
};

export type CalendarDayFull = {
    date?: ISODate;
    weekKey?: WeekKey;

    hasPlanned?: boolean;
    hasSleep?: boolean;
    hasTraining?: boolean;

    sleep?: SleepBlock | null;
    training?: TrainingBlock | null;

    plannedRoutine?: PlannedRoutine | null;
    plannedMeta?: PlannedMeta | null;

    notes?: string | null;
    tags?: string[] | null;
    meta?: WorkoutDayMeta;

    sleepSummary?: SleepSummary | null;
    trainingSummary?: TrainingSummary | null;

    trainingTotals?: CalendarTotals;
    trainingTypes?: TrainingTypeTotals[];
};

export type BuildOpts = {
    fields?: string[] | null;

    fillMissingDays: boolean;
    includeRollups: boolean;

    includeSleep: boolean;
    includeTraining: boolean;

    includeSummaries: boolean;
    includeTotals: boolean;
    includeTypes: boolean;

    includeRaw: boolean;
};

export type WeekRange = {
    from: ISODate;
    to: ISODate;
};

export type WeekRollups = {
    trainingTotals: CalendarTotals;
    trainingTypes: TrainingTypeTotals[];
    sleepAverages: {
        daysWithSleep: number;
        avgTimeAsleepMinutes: number | null;
        avgScore: number | null;
        avgAwakeMinutes: number | null;
        avgRemMinutes: number | null;
        avgCoreMinutes: number | null;
        avgDeepMinutes: number | null;
    };
};

export type WeekViewResponse = {
    weekKey: WeekKey;
    range: WeekRange;

    fields: string[] | null;
    fillMissingDays: boolean;

    days: CalendarDayFull[];

    rollups?: WeekRollups;
};

/**
 * =========================================================
 * Upsert payload helpers
 * =========================================================
 */

export type WorkoutExerciseSetUpsert = Partial<WorkoutExerciseSet>;

export type WorkoutExerciseUpsert = Partial<Omit<WorkoutExercise, "id" | "sets">> & {
    id?: string;
    sets?: WorkoutExerciseSetUpsert[] | null;
};

export type WorkoutSessionUpsert = Partial<
    Omit<WorkoutSession, "id" | "exercises" | "media">
> & {
    id?: string;
    media?: WorkoutMediaItem[] | null;
    exercises?: WorkoutExerciseUpsert[] | null;
};

export type SleepBlockUpsert = Partial<SleepBlock>;

export type TrainingBlockUpsert = Partial<Omit<TrainingBlock, "sessions">> & {
    sessions?: WorkoutSessionUpsert[] | null;
};

export type PlannedRoutineExerciseUpsert = Partial<PlannedRoutineExercise> & {
    id?: string;
};

export type PlannedRoutineUpsert = Partial<Omit<PlannedRoutine, "exercises">> & {
    exercises?: PlannedRoutineExerciseUpsert[] | null;
};

export type PlannedMetaUpsert = Partial<PlannedMeta>;

export type WorkoutDayUpsertBody = {
    /**
     * Kept optional only for compatibility with existing FE callers.
     * Backend derives canonical date/weekKey from the route date.
     */
    date?: ISODate;
    weekKey?: WeekKey;

    sleep?: SleepBlockUpsert | null;
    training?: TrainingBlockUpsert | null;

    plannedRoutine?: PlannedRoutineUpsert | null;
    plannedMeta?: PlannedMetaUpsert | null;

    notes?: string | null;
    tags?: string[] | null;
    meta?: Record<string, unknown> | null;
};

/**
 * =========================================================
 * Historical backfill
 * =========================================================
 */

export type WorkoutDayBackfillItem = {
    date: ISODate;
    payload: WorkoutDayUpsertBody;
};

export type WorkoutDayBackfillBody = {
    mode: UpsertMode;
    days: WorkoutDayBackfillItem[];
};

export type WorkoutDayBackfillItemResult = {
    date: ISODate;
    ok: boolean;
    error: string | null;
    day: WorkoutDay | Record<string, unknown> | null;
};

export type WorkoutDayBackfillResult = {
    mode: UpsertMode;
    total: number;
    successCount: number;
    failedCount: number;
    results: WorkoutDayBackfillItemResult[];
};

/**
 * =========================================================
 * Service args
 * =========================================================
 */

export type StatsRangeArgs = {
    userId: string;
    from: ISODate;
    to: ISODate;
};

export type UpsertArgs = {
    userId: string;
    date: ISODate;
    payload: WorkoutDayUpsertBody;
    mode: UpsertMode;
};