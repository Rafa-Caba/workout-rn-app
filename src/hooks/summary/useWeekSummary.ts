// /src/hooks/summary/useWeekSummary.ts

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getWeekSummary } from "@/src/services/workout/weeks.service";
import type { WeekSummaryResponse } from "@/src/types/workoutSummary.types";

export function useWeekSummary(weekKey: string) {
    return useQuery<WeekSummaryResponse, ApiAxiosError>({
        queryKey: queryKeys.summary.week(weekKey),
        queryFn: () => getWeekSummary(weekKey),
        enabled: Boolean(weekKey),
        staleTime: 30_000,
    });
}