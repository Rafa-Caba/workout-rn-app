// src/services/workout/progress.service.ts
// Service for the Workout Progress overview endpoint.

import { api } from "@/src/services/http.client";
import type {
    WorkoutProgressOverviewQuery,
    WorkoutProgressOverviewResponse,
} from "@/src/types/workoutProgress.types";

type ProgressRequestParams = {
    mode: WorkoutProgressOverviewQuery["mode"];
    from?: string;
    to?: string;
    compareTo?: WorkoutProgressOverviewQuery["compareTo"];
    weekKey?: string;
    includeExerciseProgress?: boolean;
};

export async function getWorkoutProgressOverview(
    args: ProgressRequestParams
): Promise<WorkoutProgressOverviewResponse> {
    const params: Record<string, string | boolean | undefined> = {
        mode: args.mode,
        from: args.from,
        to: args.to,
        compareTo: args.compareTo ?? "previous_period",
        weekKey: args.weekKey,
        includeExerciseProgress: args.includeExerciseProgress ?? true,
    };

    const res = await api.get("/workout/progress/overview", { params });

    return res.data as WorkoutProgressOverviewResponse;
}