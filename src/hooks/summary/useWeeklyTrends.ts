import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getWeeklyTrends } from "@/src/services/workout/trends.service";
import type { WeekKey, WeeksTrendResponse } from "@/src/types/workoutSummary.types";

export function useWeeklyTrends(fromWeek: WeekKey | "", toWeek: WeekKey | "") {
    return useQuery<WeeksTrendResponse, ApiAxiosError>({
        queryKey: ["weeklyTrends", fromWeek, toWeek],
        queryFn: () => getWeeklyTrends(fromWeek as WeekKey, toWeek as WeekKey),
        enabled: Boolean(fromWeek) && Boolean(toWeek),
        staleTime: 30_000,
    });
}