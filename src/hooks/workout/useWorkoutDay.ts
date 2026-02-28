import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getWorkoutDayServ } from "@/src/services/workout/days.service";
import type { WorkoutDay } from "@/src/types/workoutDay.types";

function toStatus(e: any): number | null {
    return e?.status ?? e?.response?.status ?? null;
}

/**
 * Returns WorkoutDay | null.
 * - If backend returns missing day (404), we return null (not an error crash).
 * - Compatible signature:
 *    useWorkoutDay(date)
 *    useWorkoutDay(date, enabled)
 */
export function useWorkoutDay(date: string | null, enabled: boolean = true) {
    const isEnabled = enabled && Boolean(date);

    return useQuery<WorkoutDay | null, ApiAxiosError>({
        queryKey: ["workoutDay", date ?? null],
        queryFn: async () => {
            if (!date) return null;

            try {
                return await getWorkoutDayServ(date);
            } catch (e: any) {
                if (toStatus(e) === 404) return null;
                throw e;
            }
        },
        enabled: isEnabled,
        staleTime: 30_000,
    });
}