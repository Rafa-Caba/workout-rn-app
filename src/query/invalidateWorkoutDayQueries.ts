// /src/query/invalidateWorkoutDayQueries.ts
// Shared cache invalidation for mutations that change one WorkoutDay.

import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import type { ISODate, WeekKey } from "@/src/types/workoutDay.types";

export type WorkoutDayInvalidationArgs = {
    date: ISODate | string;
    weekKey?: WeekKey | string | null;
    includeInsights?: boolean;
};

export async function invalidateWorkoutDayRelatedQueries(
    queryClient: QueryClient,
    args: WorkoutDayInvalidationArgs,
): Promise<void> {
    const invalidations = [
        queryClient.invalidateQueries({ queryKey: queryKeys.workout.calendarRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workout.weekViewRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary.day(args.date) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary.weekRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary.rangeRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.progress.root }),
    ];

    if (args.weekKey) {
        invalidations.push(
            queryClient.invalidateQueries({
                queryKey: queryKeys.summary.planVsActual(args.weekKey),
            }),
        );
    } else {
        invalidations.push(
            queryClient.invalidateQueries({
                queryKey: queryKeys.summary.planVsActualRoot,
            }),
        );
    }

    if (args.includeInsights !== false) {
        invalidations.push(
            queryClient.invalidateQueries({ queryKey: queryKeys.insights.root }),
        );
    }

    await Promise.allSettled(invalidations);
}

export async function invalidateWorkoutDayRangeRelatedQueries(
    queryClient: QueryClient,
): Promise<void> {
    await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: queryKeys.workout.calendarRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workout.weekViewRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary.dayRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary.weekRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary.rangeRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary.planVsActualRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.insights.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.progress.root }),
    ]);
}
