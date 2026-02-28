// src/types/workoutDay.types.ts

/**
 * Keep FE names to avoid breaking imports.
 * This file mirrors BE shape while preserving existing FE type names.
 */

/**
 * Canonical date keys (added to match BE types & trainer module)
 */
export type ISODate = string; // "YYYY-MM-DD"
export type WeekKey = string; // "YYYY-W##"

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
    createdAt: string; // ISO datetime string

    // BE uses Record<string, unknown> | null; keep safe but more precise than unknown.
    meta: Record<string, unknown> | null;
};

/**
 * =========================================================
 * Exercises (actual performed) (FE names preserved)
 * =========================================================
 */

/**
 * Mirrors WorkoutExerciseSetSchema (embedded, _id: false)
 */
export type WorkoutExerciseSet = {
    setIndex: number; // min 1

    reps: number | null;
    weight: number | null;

    unit: WeightUnit;

    rpe: number | null;

    isWarmup: boolean;
    isDropSet: boolean;

    tempo: string | null;
    restSec: number | null;

    tags: string[] | null;

    // BE uses Record<string, unknown> | null
    meta: Record<string, unknown> | null;
};

/**
 * Mirrors WorkoutExerciseSchema (embedded, _id: true, mapped to "id" in toJSON)
 */
export type WorkoutExercise = {
    id: string;

    name: string;

    movementId: string | null;

    // Added to mirror BE public JSON types (trainer/week views expect it)
    movementName: string | null;

    notes: string | null;

    // IMPORTANT:
    // - null means "no block"
    // - [] means explicitly empty
    sets: WorkoutExerciseSet[] | null;

    // BE uses Record<string, unknown> | null
    meta: Record<string, unknown> | null;
};

/**
 * =========================================================
 * Training sessions & blocks (FE names preserved)
 * =========================================================
 */

/**
 * Mirrors WorkoutSessionSchema (embedded, _id: true, mapped to "id" in toJSON)
 */
export type WorkoutSession = {
    id: string;

    type: string;

    startAt: string | null; // ISO datetime string
    endAt: string | null; // ISO datetime string

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

    notes: string | null;

    /**
     * BE schema: media default null
     * BE public types (trainer/week) show MediaItem[] always in TrainingSession,
     * but actual WorkoutDay JSON uses schema defaults.
     * Keep FE as nullable array to preserve existing FE behavior.
     */
    media: WorkoutMediaItem[] | null;

    /**
     * Exercises performed in THIS session
     * BE schema: default null
     */
    exercises: WorkoutExercise[] | null;

    // BE uses Record<string, unknown> | null
    meta: Record<string, unknown> | null;
};

/**
 * Mirrors TrainingBlockSchema (_id: false)
 */
export type TrainingBlock = {
    sessions: WorkoutSession[] | null;

    source: string | null; // maxlength 120
    dayEffortRpe: number | null; // 1..10

    raw: unknown | null; // Schema.Types.Mixed
};

/**
 * =========================================================
 * Sleep (FE names preserved)
 * =========================================================
 */

/**
 * Mirrors SleepBlockSchema (_id: false)
 */
export type SleepBlock = {
    timeAsleepMinutes: number | null;

    timeInBedMinutes: number | null;

    score: number | null;

    awakeMinutes: number | null;
    remMinutes: number | null;
    coreMinutes: number | null;
    deepMinutes: number | null;

    source: string | null; // maxlength 120
    raw: unknown | null; // Schema.Types.Mixed
};

/**
 * =========================================================
 * Planned routine (NEW in FE, keep names as introduced)
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
    plannedBy: string; // User id
    plannedAt: string; // ISO datetime
    source: PlannedRoutineSource | null;
};

/**
 * =========================================================
 * WorkoutDay doc (FE name preserved: WorkoutDay)
 * =========================================================
 */

/**
 * Mirrors WorkoutDaySchema (+ toJSON transform)
 */
export type WorkoutDay = {
    id: string;

    // In DB it's always there; keep optional only if some endpoints omit it.
    userId?: string;

    date: ISODate; // YYYY-MM-DD
    weekKey: WeekKey; // e.g. 2026-W07

    sleep: SleepBlock | null;

    // actual training
    training: TrainingBlock | null;

    // planned routine (trainer/template-owned)
    plannedRoutine: PlannedRoutine | null;
    plannedMeta: PlannedMeta | null;

    notes: string | null;
    tags: string[] | null;

    // BE uses Record<string, unknown> | null
    meta: Record<string, unknown> | null;

    createdAt?: string; // timestamps
    updatedAt?: string; // timestamps
};

/**
 * =========================================================
 * Builders outputs (added for trainer/week services)
 * Keep names matching BE here (these are new to FE in most setups)
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
    source: string | null;
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

    // actual training
    training?: TrainingBlock | null;

    // planned routine (optional in views)
    plannedRoutine?: PlannedRoutine | null;
    plannedMeta?: PlannedMeta | null;

    notes?: string | null;
    tags?: string[] | null;
    meta?: Record<string, unknown> | null;

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
 * Service args (added to match BE)
 * =========================================================
 */

export type StatsRangeArgs = {
    userId: string;
    from: ISODate;
    to: ISODate;
};

export type UpsertMode = "merge" | "replace";

export type UpsertArgs = {
    userId: string;
    date: ISODate;
    payload: any;
    mode: UpsertMode;
};