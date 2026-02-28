export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export type WorkoutRoutineStatus = "active" | "archived";

export type WorkoutMediaResourceType = "image" | "video";

export type WorkoutRoutineAttachment = {
    publicId: string;
    url: string;
    resourceType: WorkoutMediaResourceType;
    format: string | null;
    createdAt: string; // ISO
    meta: unknown | null;
    originalName: string | null;
};

export type WorkoutRoutineWeekRange = {
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
};

export type WorkoutRoutineExercise = {
    id: string;

    name: string;

    // Movement catalog link + snapshot (Option A)
    movementId: string | null;
    movementName: string | null;

    sets: number | null;
    reps: string | null;
    rpe: number | null;

    load: string | null;
    notes: string | null;

    attachmentPublicIds: string[] | null;
};

export type WorkoutRoutineDay = {
    date: string; // YYYY-MM-DD
    dayKey: DayKey;

    sessionType: string | null;
    focus: string | null;

    exercises: WorkoutRoutineExercise[] | null;

    notes: string | null;
    tags: string[] | null;
};

export type WorkoutRoutineWeek = {
    id: string;
    userId?: string;

    weekKey: string; // YYYY-W##
    range: WorkoutRoutineWeekRange;

    status: WorkoutRoutineStatus;

    title: string | null;
    split: string | null;
    plannedDays: DayKey[] | null;

    attachments: WorkoutRoutineAttachment[];

    // CANONICAL
    days: WorkoutRoutineDay[];

    // UI helper only
    meta: Record<string, unknown> | null;

    createdAt?: string;
    updatedAt?: string;
};

export type WorkoutRoutineWeekSummary = {
    id: string;
    weekKey: string;
    range: WorkoutRoutineWeekRange;
    status: WorkoutRoutineStatus;
    title: string | null;
    split: string | null;
    plannedDays: DayKey[] | null;
    createdAt?: string;
    updatedAt?: string;
};
