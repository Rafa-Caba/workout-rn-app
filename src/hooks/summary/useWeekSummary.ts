import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getWeekSummary } from "@/src/services/workout/weeks.service";
import type { WeekSummaryResponse } from "@/src/types/workoutSummary.types";

export function useWeekSummary(weekKey: string) {
    return useQuery<WeekSummaryResponse, ApiAxiosError>({
        queryKey: ["weekSummary", weekKey],
        queryFn: () => getWeekSummary(weekKey),
        enabled: Boolean(weekKey),
        staleTime: 30_000,
    });
}