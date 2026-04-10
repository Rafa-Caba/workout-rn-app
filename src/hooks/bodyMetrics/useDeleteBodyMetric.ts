// src/hooks/bodyMetrics/useDeleteBodyMetric.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

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
                qc.invalidateQueries({ queryKey: ["bodyMetrics"] }),
                qc.invalidateQueries({ queryKey: ["bodyProgress"] }),
                qc.invalidateQueries({ queryKey: ["workoutProgressOverview"] }),
            ]);

            await useUserStore.getState().fetchMe();
        },
    });
}