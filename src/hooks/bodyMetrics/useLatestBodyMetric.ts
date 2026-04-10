// src/hooks/bodyMetrics/useLatestBodyMetric.ts

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import { getMyLatestBodyMetric } from "@/src/services/bodyMetrics.service";
import type { ApiAxiosError } from "@/src/services/http.client";
import type { UserMetricLatestResponse } from "@/src/types/bodyMetrics.types";

export function useLatestBodyMetric() {
    return useQuery<UserMetricLatestResponse, ApiAxiosError>({
        queryKey: queryKeys.bodyMetrics.latest,
        queryFn: getMyLatestBodyMetric,
        staleTime: 30_000,
    });
}