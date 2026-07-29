// /src/hooks/useUpdateSleep.ts
// Updates one sleep block and refreshes every screen that derives day metrics.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateWorkoutDayRelatedQueries } from "@/src/query/invalidateWorkoutDayQueries";
import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import { updateSleepForDay } from "@/src/services/workout/days.service";
import type { SleepBlock, WorkoutDay } from "@/src/types/workoutDay.types";

export function useUpdateSleep() {
    const queryClient = useQueryClient();

    return useMutation<
        WorkoutDay,
        ApiAxiosError,
        { date: string; sleep: Partial<SleepBlock> | null }
    >({
        mutationFn: (args) => updateSleepForDay(args.date, args.sleep, "merge"),
        onSuccess: async (day, variables) => {
            queryClient.setQueryData(
                queryKeys.workout.day(variables.date),
                day,
            );
            await invalidateWorkoutDayRelatedQueries(queryClient, {
                date: variables.date,
            });
        },
    });
}
