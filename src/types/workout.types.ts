// src/types/workout.types.ts

export type IsoDate = string; // YYYY-MM-DD
export type IsoDateTime = string; // ISO string

export type WorkoutMediaItem = {
    publicId: string;
    url: string;
    resourceType: "image" | "video";
    format?: string | null;
    createdAt: IsoDateTime; // backend uses string
    meta?: Record<string, unknown> | null;
};

export type WorkoutExerciseSet = {
    setIndex: number;
    reps?: number | null;
    weight?: number | null;
    unit: "lb" | "kg";
    rpe?: number | null;
    isWarmup?: boolean;
    isDropSet?: boolean;
    tempo?: string | null;
    restSec?: number | null;
    tags?: string[] | null;
    meta?: Record<string, unknown> | null;
};

export type WorkoutExercise = {
    id: string;
    name: string;
    movementId?: string | null;
    notes?: string | null;
    sets?: WorkoutExerciseSet[] | null;
    meta?: Record<string, unknown> | null;
};

export type WorkoutSession = {
    id: string;
    type: string;

    startAt: IsoDateTime | null;
    endAt: IsoDateTime | null;

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

    media: WorkoutMediaItem[] | null;
    exercises: WorkoutExercise[] | null;

    meta: Record<string, unknown> | null;
};

export type TrainingBlock = {
    sessions: WorkoutSession[] | null;
    source: string | null;
    dayEffortRpe: number | null;
    raw: unknown | null;
};

export type SleepBlock = {
    timeAsleepMinutes: number | null;
    score: number | null;

    awakeMinutes: number | null;
    remMinutes: number | null;
    coreMinutes: number | null;
    deepMinutes: number | null;

    source: string | null;
    raw: unknown | null;
};

export type WorkoutDay = {
    id: string;
    userId: string; // FE uses string
    date: IsoDate;
    weekKey: string;

    sleep: SleepBlock | null;
    training: TrainingBlock | null;

    notes: string | null;
    tags: string[] | null;

    meta: Record<string, unknown> | null;

    createdAt?: IsoDateTime;
    updatedAt?: IsoDateTime;
};

/**
 * DaySummary is a "summary view", not the full model.
 * Keep it small but aligned with what UI consumes.
 */
export type DaySummary = {
    date: IsoDate;
    weekKey: string | null;

    sleep: {
        timeAsleepMinutes: number | null;
        score: number | null;
        awakeMinutes: number | null;
        remMinutes: number | null;
        coreMinutes: number | null;
        deepMinutes: number | null;
        source: string | null;

        // optional compatibility
        raw?: unknown | null;
    } | null;

    training: {
        sessionsCount: number;
        durationSeconds: number;

        activeKcal: number | null;
        totalKcal: number | null;

        avgHr: number | null;
        maxHr: number | null;

        distanceKm: number | null;
        steps: number | null;

        mediaCount: number;

        // optional compatibility
        source?: string | null;
        dayEffortRpe?: number | null;
        raw?: unknown | null;
    };

    notes: string | null;
    tags: string[] | null;

    // optional so TS doesn’t complain if summary API includes it later
    meta?: Record<string, unknown> | null;
};
