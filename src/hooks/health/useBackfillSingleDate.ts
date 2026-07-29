// /src/hooks/health/useBackfillSingleDate.ts
// Imports one day from HealthKit / Health Connect and refreshes every consumer
// of that WorkoutDay after persistence.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateWorkoutDayRelatedQueries } from "@/src/query/invalidateWorkoutDayQueries";
import { queryKeys } from "@/src/query/queryKeys";
import { buildCardioBackfillPayloadForDate } from "@/src/services/health/cardio/cardioBackfill.service";
import { backfillWorkoutDayByDate } from "@/src/services/workout/days.service";
import type { WorkoutDay } from "@/src/types/workoutDay.types";
import { normalizeApiError } from "@/src/utils/api/apiErrorMessage";

type BackfillSingleDateArgs = {
    date: string;
    mode?: "merge" | "replace";
};

function createHumanBackfillError(error: unknown): Error {
    const normalized = normalizeApiError(error);
    return new Error(normalized.message);
}

export function useBackfillSingleDate() {
    const queryClient = useQueryClient();

    return useMutation<WorkoutDay | null, Error, BackfillSingleDateArgs>({
        mutationFn: async ({ date, mode = "merge" }) => {
            const result = await buildCardioBackfillPayloadForDate({ date, mode });

            if (!result.payload) return null;

            try {
                return await backfillWorkoutDayByDate(date, result.payload, mode);
            } catch (error: unknown) {
                throw createHumanBackfillError(error);
            }
        },
        onSuccess: async (day, variables) => {
            if (!day) return;

            queryClient.setQueryData(queryKeys.workout.day(variables.date), day);
            await invalidateWorkoutDayRelatedQueries(queryClient, {
                date: variables.date,
            });
        },
    });
}
