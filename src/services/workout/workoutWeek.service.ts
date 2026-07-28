// src/services/workout/workoutWeek.service.ts
// Typed client for the complete WorkoutDay ISO-week view.

import { api } from "@/src/services/http.client";
import type { WeekKey, WeekViewResponse } from "@/src/types/workoutDay.types";

export type GetWorkoutWeekArgs = {
    weekKey: WeekKey;
    fields?: string[] | null;
    fillMissingDays?: boolean;
    includeRollups?: boolean;
    includeSleep?: boolean;
    includeTraining?: boolean;
    includeSummaries?: boolean;
    includeTotals?: boolean;
    includeTypes?: boolean;
    includeRaw?: boolean;
};

type WorkoutWeekQueryParams = Omit<GetWorkoutWeekArgs, "weekKey">;

function buildWeekParams(args: GetWorkoutWeekArgs): WorkoutWeekQueryParams {
    const params: WorkoutWeekQueryParams = {};

    if (args.fields !== undefined) params.fields = args.fields;
    if (args.fillMissingDays !== undefined) params.fillMissingDays = args.fillMissingDays;
    if (args.includeRollups !== undefined) params.includeRollups = args.includeRollups;
    if (args.includeSleep !== undefined) params.includeSleep = args.includeSleep;
    if (args.includeTraining !== undefined) params.includeTraining = args.includeTraining;
    if (args.includeSummaries !== undefined) params.includeSummaries = args.includeSummaries;
    if (args.includeTotals !== undefined) params.includeTotals = args.includeTotals;
    if (args.includeTypes !== undefined) params.includeTypes = args.includeTypes;
    if (args.includeRaw !== undefined) params.includeRaw = args.includeRaw;

    return params;
}

/**
 * GET /workout/week/:weekKey
 * Returns the full typed week view used by Calendar and Periods.
 */
export async function getWorkoutWeekView(args: GetWorkoutWeekArgs): Promise<WeekViewResponse> {
    const response = await api.get<WeekViewResponse>(
        `/workout/week/${encodeURIComponent(args.weekKey)}`,
        { params: buildWeekParams(args) },
    );

    return response.data;
}

/**
 * Convenience defaults for Trainee Gym Check.
 */
export function defaultTraineeWeekViewParams(weekKey: WeekKey): GetWorkoutWeekArgs {
    return {
        weekKey,
        fields: null,
        fillMissingDays: true,
        includeRollups: false,
        includeSleep: false,
        includeTraining: true,
        includeSummaries: false,
        includeTotals: false,
        includeTypes: false,
        includeRaw: false,
    };
}
