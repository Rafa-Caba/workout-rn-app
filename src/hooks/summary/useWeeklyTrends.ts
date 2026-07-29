// /src/hooks/summary/useWeeklyTrends.ts

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getWeeklyTrends } from "@/src/services/workout/trends.service";
import type { WeekKey, WeeksTrendResponse } from "@/src/types/workoutSummary.types";

export function useWeeklyTrends(fromWeek: WeekKey | "", toWeek: WeekKey | "") {
    return useQuery<WeeksTrendResponse, ApiAxiosError>({
        queryKey: queryKeys.summary.weeksTrend(fromWeek, toWeek),
        queryFn: () => getWeeklyTrends(fromWeek, toWeek),
        enabled: Boolean(fromWeek) && Boolean(toWeek),
        staleTime: 30_000,
    });
}