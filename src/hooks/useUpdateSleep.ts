// /src/hooks/useUpdateSleep.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { updateSleepForDay } from "@/src/services/workout/days.service";
import type { SleepBlock, WorkoutDay } from "@/src/types/workoutDay.types";

/**
 * SleepBlock already includes:
 * - sourceDevice
 * - importedAt
 * - lastSyncedAt
 *
 * So this hook only needs to keep accepting Partial<SleepBlock>.
 */
export function useUpdateSleep() {
    const qc = useQueryClient();

    return useMutation<
        WorkoutDay,
        ApiAxiosError,
        { date: string; sleep: Partial<SleepBlock> | null }
    >({
        mutationFn: (args) => updateSleepForDay(args.date, args.sleep, "merge"),
        onSuccess: (day, vars) => {
            qc.setQueryData(["workoutDay", vars.date], day);
        },
    });
}