import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useRoutineWeek(weekKey: string) {
    return useQuery<WorkoutRoutineWeek | null, ApiAxiosError>({
        queryKey: ["routineWeek", weekKey],
        queryFn: () => getRoutineWeek(weekKey),
        enabled: Boolean(weekKey),
        staleTime: 30_000,
    });
}

export function useInitRoutineWeek(weekKey: string) {
    const qc = useQueryClient();

    return useMutation<
        WorkoutRoutineWeek,
        ApiAxiosError,
        { title?: string; split?: string; unarchive?: boolean } | undefined
    >({
        mutationFn: (args) => initRoutineWeek(weekKey, args),
        onSuccess: (data) => {
            qc.setQueryData(["routineWeek", weekKey], data);
            qc.invalidateQueries({ queryKey: ["routineWeek", weekKey] });
            qc.invalidateQueries({ queryKey: ["routineWeeksList"] });
        },
    });
}

export function useUpdateRoutineWeek(weekKey: string) {
    const qc = useQueryClient();

    return useMutation<WorkoutRoutineWeek, ApiAxiosError, { routine: WorkoutRoutineWeek }>({
        mutationFn: ({ routine }) => updateRoutineWeek(weekKey, routine),
        onSuccess: (data) => {
            qc.setQueryData(["routineWeek", weekKey], data);
            qc.invalidateQueries({ queryKey: ["routineWeek", weekKey] });
            qc.invalidateQueries({ queryKey: ["routineWeeksList"] });
        },
    });
}

export function useSetRoutineArchived() {
    const qc = useQueryClient();

    return useMutation<
        unknown,
        ApiAxiosError,
        { weekKey: string; archived: boolean; status?: WorkoutRoutineStatus }
    >({
        mutationFn: ({ weekKey, archived }) => setRoutineArchived(weekKey, archived),
        onSuccess: async (_data, vars) => {
            await Promise.allSettled([
                qc.invalidateQueries({ queryKey: ["routineWeek", vars.weekKey] }),
                qc.invalidateQueries({ queryKey: ["routineWeeksList"] }),
            ]);
        },
    });
}

export function useRoutineWeeksList(status: WorkoutRoutineStatus = "active") {
    return useQuery<WorkoutRoutineWeekSummary[], ApiAxiosError>({
        queryKey: ["routineWeeksList", status],
        queryFn: () => listRoutineWeeks(status),
        staleTime: 30_000,
    });
}