// src/hooks/summary/usePRs.ts
// React Query hook for personal records within a shared insights range.

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import {
    getPRs,
    type GetInsightRangeArgs,
    type PrsResponse,
} from "@/src/services/workout/insights.service";

/** Loads PRs only when both normalized range limits are available. */
export function usePRs(args: GetInsightRangeArgs, enabled: boolean) {
    const from = args.from ?? "";
    const to = args.to ?? "";

    return useQuery<PrsResponse, ApiAxiosError>({
        queryKey: queryKeys.insights.prs({ from, to }),
        queryFn: () => getPRs({ from, to }),
        enabled: enabled && Boolean(from) && Boolean(to),
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}
