// src/hooks/bodyMetrics/useUpsertBodyMetric.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";

import { upsertMyBodyMetricByDate } from "@/src/services/bodyMetrics.service";
import type { ApiAxiosError } from "@/src/services/http.client";
import { useUserStore } from "@/src/store/user.store";
import type {
    UpsertUserMetricRequest,
    UserMetricEntry,
} from "@/src/types/bodyMetrics.types";

export function useUpsertBodyMetric() {
    const qc = useQueryClient();

    return useMutation<
        UserMetricEntry,
        ApiAxiosError,
        {
            date: string;
            payload: UpsertUserMetricRequest;
        }
    >({
        mutationFn: ({ date, payload }) => upsertMyBodyMetricByDate(date, payload),
        onSuccess: async () => {
            await Promise.allSettled([
                qc.invalidateQueries({ queryKey: queryKeys.bodyMetrics.root }),
                qc.invalidateQueries({ queryKey: queryKeys.bodyProgress.root }),
                qc.invalidateQueries({ queryKey: queryKeys.progress.root }),
            ]);

            await useUserStore.getState().fetchMe();
        },
    });
}