import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getTraineeWeekSummary, type GetTraineeWeekSummaryArgs } from "@/src/services/workout/trainer.service";
import type { WeekViewResponse } from "@/src/types/workoutDay.types";

/**
 * Notes:
 * - Keep queryKey stable (avoid passing raw objects).
 * - Use a serialized paramsKey so caching behaves predictably.
 */
export function useTrainerWeekSummary(args: GetTraineeWeekSummaryArgs) {
    const enabled = Boolean(args?.traineeId) && Boolean(args?.weekKey);

    const paramsKey = JSON.stringify({
        weekKey: args.weekKey,
        fields: args.fields ?? null,

        fillMissingDays: args.fillMissingDays ?? null,
        includeRollups: args.includeRollups ?? null,

        includeSleep: args.includeSleep ?? null,
        includeTraining: args.includeTraining ?? null,

        includeSummaries: args.includeSummaries ?? null,
        includeTotals: args.includeTotals ?? null,
        includeTypes: args.includeTypes ?? null,

        includeRaw: args.includeRaw ?? null,
    });

    return useQuery<WeekViewResponse, ApiAxiosError>({
        queryKey: ["trainer", "weekSummary", args.traineeId, args.weekKey, paramsKey],
        queryFn: () => getTraineeWeekSummary(args),
        enabled,
        staleTime: 30_000,
    });
}