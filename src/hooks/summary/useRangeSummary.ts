// /src/hooks/summary/useRangeSummary.ts

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getRangeSummary } from "@/src/services/workout/weeks.service";
import type { RangeSummaryResponse } from "@/src/types/workoutSummary.types";

export function useRangeSummary(from: string, to: string) {
    return useQuery<RangeSummaryResponse, ApiAxiosError>({
        queryKey: queryKeys.summary.range(from, to),
        queryFn: () => getRangeSummary(from, to),
        enabled: Boolean(from) && Boolean(to),
        staleTime: 30_000,
    });
}