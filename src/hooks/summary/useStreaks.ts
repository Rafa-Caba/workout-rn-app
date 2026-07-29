// src/hooks/summary/useStreaks.ts
// React Query hook for the typed streak insight endpoint.

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import {
    getStreaks,
    type GetStreaksArgs,
    type StreaksResponse,
} from "@/src/services/workout/insights.service";

/** Loads streak data and keeps each filter combination independently cached. */
export function useStreaks(args: GetStreaksArgs, enabled: boolean) {
    return useQuery<StreaksResponse, ApiAxiosError>({
        queryKey: queryKeys.insights.streaks({
            mode: args.mode,
            gapDays: args.gapDays,
            asOf: args.asOf,
        }),
        queryFn: () => getStreaks(args),
        enabled,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}
