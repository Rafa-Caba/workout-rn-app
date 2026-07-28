// src/hooks/workout/useWorkoutWeekView.ts
// React Query wrapper for the complete typed ISO-week view.

import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import {
    defaultTraineeWeekViewParams,
    getWorkoutWeekView,
    type GetWorkoutWeekArgs,
} from "@/src/services/workout/workoutWeek.service";
import type { WeekKey, WeekViewResponse } from "@/src/types/workoutDay.types";

export function useWorkoutWeekView(
    weekKey: WeekKey | null | undefined,
    args?: Partial<GetWorkoutWeekArgs>,
) {
    return useQuery<WeekViewResponse, ApiAxiosError>({
        queryKey: ["workoutWeekView", weekKey, args ?? null],
        queryFn: () => {
            if (!weekKey) {
                throw new Error("A week key is required to load the WorkoutDay week view.");
            }

            const base = defaultTraineeWeekViewParams(weekKey);
            return getWorkoutWeekView({
                ...base,
                ...(args ?? {}),
                weekKey,
            });
        },
        enabled: Boolean(weekKey),
        staleTime: 30_000,
    });
}
