// src/hooks/bodyMetrics/useBodyMetrics.ts

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import { getMyBodyMetrics } from "@/src/services/bodyMetrics.service";
import type { ApiAxiosError } from "@/src/services/http.client";
import type {
    UserMetricListQuery,
    UserMetricListResponse,
} from "@/src/types/bodyMetrics.types";

export function useBodyMetrics(query: UserMetricListQuery = {}) {
    return useQuery<UserMetricListResponse, ApiAxiosError>({
        queryKey: queryKeys.bodyMetrics.list({
            from: query.from,
            to: query.to,
        }),
        queryFn: () => getMyBodyMetrics(query),
        staleTime: 30_000,
    });
}