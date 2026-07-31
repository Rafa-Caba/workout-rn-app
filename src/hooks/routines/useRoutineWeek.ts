// /src/hooks/routines/useRoutineWeek.ts
// Routine week queries and mutations using the canonical query-key factory.

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import {
    getRoutineWeek,
    initRoutineWeek,
    listRoutineWeeks,
    setRoutineArchived,
    updateRoutineWeek,
} from "@/src/services/workout/routines.service";
import type {
    WorkoutRoutineStatus,
    WorkoutRoutineWeek,
    WorkoutRoutineWeekSummary,
} from "@/src/types/workoutRoutine.types";

async function invalidateRoutineLists(
    queryClient: QueryClient,
    weekKey: string,
): Promise<void> {
    await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: queryKeys.routines.week(weekKey) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.routines.listRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary.planVsActual(weekKey) }),
    ]);
}

export function useRoutineWeek(weekKey: string) {
    return useQuery<WorkoutRoutineWeek | null, ApiAxiosError>({
        queryKey: queryKeys.routines.week(weekKey),
        queryFn: () => getRoutineWeek(weekKey),
        enabled: Boolean(weekKey),
        staleTime: 30_000,
    });
}

export function useInitRoutineWeek(weekKey: string) {
    const queryClient = useQueryClient();

    return useMutation<
        WorkoutRoutineWeek,
        ApiAxiosError,
        { title?: string; split?: string; unarchive?: boolean } | undefined
    >({
        mutationFn: (args) => initRoutineWeek(weekKey, args),
        onSuccess: async (data) => {
            queryClient.setQueryData(queryKeys.routines.week(weekKey), data);
            await invalidateRoutineLists(queryClient, weekKey);
        },
    });
}

export function useUpdateRoutineWeek(weekKey: string) {
    const queryClient = useQueryClient();

    return useMutation<WorkoutRoutineWeek, ApiAxiosError, unknown>({
        mutationFn: (payload) => updateRoutineWeek(weekKey, payload),
        onSuccess: async (data) => {
            queryClient.setQueryData(queryKeys.routines.week(weekKey), data);
            await invalidateRoutineLists(queryClient, weekKey);
        },
    });
}

export function useSetRoutineArchived() {
    const queryClient = useQueryClient();

    return useMutation<
        WorkoutRoutineWeek,
        ApiAxiosError,
        { weekKey: string; archived: boolean; status?: WorkoutRoutineStatus }
    >({
        mutationFn: ({ weekKey, archived }) => setRoutineArchived(weekKey, archived),
        onSuccess: async (data, variables) => {
            queryClient.setQueryData(queryKeys.routines.week(variables.weekKey), data);
            await invalidateRoutineLists(queryClient, variables.weekKey);
        },
    });
}

export function useRoutineWeeksList(status: WorkoutRoutineStatus = "active") {
    return useQuery<WorkoutRoutineWeekSummary[], ApiAxiosError>({
        queryKey: queryKeys.routines.list(status),
        queryFn: () => listRoutineWeeks(status),
        staleTime: 30_000,
    });
}
