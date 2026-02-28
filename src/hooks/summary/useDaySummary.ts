import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getDaySummary } from "@/src/services/workout/days.service";
import type { DaySummary } from "@/src/types/workout.types";

export function useDaySummary(date: string) {
    return useQuery<DaySummary, ApiAxiosError>({
        queryKey: ["daySummary", date],
        queryFn: () => getDaySummary(date),
        enabled: Boolean(date),
        staleTime: 30_000,
    });
}