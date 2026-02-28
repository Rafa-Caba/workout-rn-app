
import type { PublicUser } from "@/types/auth.types";
import type {
    ISODate,
    WeekKey,
    WorkoutDay,
    WeekViewResponse,
    SleepBlock,
    TrainingBlock,
    PlannedRoutine,
    PlannedRoutineSource,
} from "@/types/workoutDay.types";

/**
 * =========================================================
 * Trainer module (FE) - request/response types
 * Mirrors BE trainer routes payloads
 * =========================================================
 */

export type ListTraineesResponse = PublicUser[];

export type GetTraineeDayResponse = {
    day: WorkoutDay | null;
};

export type GetTraineeWeekSummaryResponse = WeekViewResponse;

export type TraineeRecoveryDay = {
    date: ISODate;
    sleep: SleepBlock | null;
    training: TrainingBlock | null;
    hasTraining: boolean;
};

export type GetTraineeRecoveryResponse = {
    from: ISODate;
    to: ISODate;
    days: TraineeRecoveryDay[];
};

export type PatchPlannedRoutineMetaInput = {
    plannedAt: string; // ISO datetime
    source?: PlannedRoutineSource; // optional in BE patch service
} | null;

export type PatchPlannedRoutineBody = {
    plannedRoutine: PlannedRoutine | null;
    plannedMeta: PatchPlannedRoutineMetaInput;
};

export type PatchPlannedRoutineResponse = WorkoutDay;

export type WeeklyAssignBody = {
    clearEmptyDays: boolean;
    plannedAt: string | null; // ISO datetime or null => BE sets now()
};

export type WeeklyAssignReport = {
    weekKey: WeekKey;
    traineeId: string;
    templateWeekId: string;

    totalWeekDays: number;
    totalTemplateDays: number;

    createdPlanned: number;
    createdRest: number;
    updatedPlanned: number;
    clearedToRest: number;

    skippedLockedByTraining: number;
    skippedNoop: number;
};

export type WeeklyAssignResponse = {
    report: WeeklyAssignReport;
};