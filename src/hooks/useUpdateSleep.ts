// /src/hooks/useUpdateSleep.ts
import type { ApiAxiosError } from "@/src/services/http.client";
import { updateSleepForDay } from "@/src/services/workout/days.service";
import type { SleepBlock, WorkoutDay } from "@/src/types/workoutDay.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateSleep() {
    const qc = useQueryClient();

    return useMutation<WorkoutDay, ApiAxiosError, { date: string; sleep: Partial<SleepBlock> | null }>({
        mutationFn: (args) => updateSleepForDay(args.date, args.sleep, "merge"),
        onSuccess: (day, vars) => {
            qc.setQueryData(["workoutDay", vars.date], day);
            // If you have week/calendar queries, you can invalidate them here:
            // qc.invalidateQueries({ queryKey: ["weekView"] });
        },
    });
}