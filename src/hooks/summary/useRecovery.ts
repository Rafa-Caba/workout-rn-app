// src/hooks/summary/useRecovery.ts
// React Query hook for recovery points within the shared insights range.

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import {
    getRecovery,
    type GetInsightRangeArgs,
    type RecoveryResponse,
} from "@/src/services/workout/insights.service";

/** Loads recovery only when both normalized range limits are available. */
export function useRecovery(args: GetInsightRangeArgs, enabled: boolean) {
    const from = args.from ?? "";
    const to = args.to ?? "";

    return useQuery<RecoveryResponse, ApiAxiosError>({
        queryKey: queryKeys.insights.recovery(from, to),
        queryFn: () => getRecovery({ from, to }),
        enabled: enabled && Boolean(from) && Boolean(to),
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}
