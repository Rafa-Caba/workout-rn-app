// src/hooks/bodyMetrics/useDeleteBodyMetric.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";

import { deleteMyBodyMetricByDate } from "@/src/services/bodyMetrics.service";
import type { ApiAxiosError } from "@/src/services/http.client";
import { useUserStore } from "@/src/store/user.store";

export function useDeleteBodyMetric() {
    const qc = useQueryClient();

    return useMutation<
        { ok: true },
        ApiAxiosError,
        { date: string }
    >({
        mutationFn: ({ date }) => deleteMyBodyMetricByDate(date),
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