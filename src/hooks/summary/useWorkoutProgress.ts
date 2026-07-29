// /src/hooks/summary/useWorkoutProgress.ts
// React Query hook for the Workout Progress overview endpoint.

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import { getWorkoutProgressOverview } from "@/src/services/workout/progress.service";
import type {
    WorkoutProgressCompareTo,
    WorkoutProgressMode,
    WorkoutProgressOverviewResponse,
} from "@/src/types/workoutProgress.types";

type UseWorkoutProgressArgs = {
    mode: WorkoutProgressMode;
    from?: string;
    to?: string;
    compareTo?: WorkoutProgressCompareTo;
    weekKey?: string;
    includeExerciseProgress?: boolean;
};

function isCustomRangeValid(args: UseWorkoutProgressArgs): boolean {
    return args.mode !== "customRange" || (Boolean(args.from) && Boolean(args.to));
}

export function useWorkoutProgress(args: UseWorkoutProgressArgs) {
    const enabled = isCustomRangeValid(args);
    const params = {
        mode: args.mode,
        from: args.from ?? null,
        to: args.to ?? null,
        compareTo: args.compareTo ?? "previous_period",
        weekKey: args.weekKey ?? null,
        includeExerciseProgress: args.includeExerciseProgress ?? true,
    };

    return useQuery<WorkoutProgressOverviewResponse, ApiAxiosError>({
        queryKey: queryKeys.progress.overview(params),
        queryFn: () =>
            getWorkoutProgressOverview({
                mode: args.mode,
                from: args.from,
                to: args.to,
                compareTo: args.compareTo ?? "previous_period",
                weekKey: args.weekKey,
                includeExerciseProgress: args.includeExerciseProgress ?? true,
            }),
        enabled,
        staleTime: 30_000,
    });
}
