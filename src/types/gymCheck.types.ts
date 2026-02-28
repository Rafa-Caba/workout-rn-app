
// -------------------- UI State Types (inputs as strings) --------------------

export type GymExerciseState = {
    done: boolean;
    notes?: string;
    durationMin?: string; // UI input (string)
    mediaPublicIds?: string[]; // UI state can start empty
};

export type GymDayMetricsState = {
    startAt?: string;
    endAt?: string;

    activeKcal?: string;
    totalKcal?: string;

    avgHr?: string;
    maxHr?: string;

    distanceKm?: string;
    steps?: string;
    elevationGainM?: string;

    paceSecPerKm?: string;
    cadenceRpm?: string;

    effortRpe?: string;

    trainingSource?: string;
    dayEffortRpe?: string;
};

export type GymDayState = {
    durationMin: string;
    notes: string;
    metrics?: GymDayMetricsState;
    exercises: Record<string, GymExerciseState>;
};

// -------------------- API Patch Types (what BE expects) --------------------

export type GymCheckExercisePatch = {
    done?: boolean | null;
    notes?: string | null;
    durationMin?: number | null;
    mediaPublicIds?: string[] | null;
};

export type GymCheckMetricsPatch = {
    startAt?: string | null;
    endAt?: string | null;

    activeKcal?: number | null;
    totalKcal?: number | null;

    avgHr?: number | null;
    maxHr?: number | null;

    distanceKm?: number | null;
    steps?: number | null;
    elevationGainM?: number | null;

    paceSecPerKm?: number | null;
    cadenceRpm?: number | null;

    effortRpe?: number | null;

    trainingSource?: string | null;
    dayEffortRpe?: number | null;
};

export type GymCheckDayPatchBody = {
    durationMin?: number | null;
    notes?: string | null;
    metrics?: GymCheckMetricsPatch | null;
    exercises?: Record<string, GymCheckExercisePatch> | null;
};
