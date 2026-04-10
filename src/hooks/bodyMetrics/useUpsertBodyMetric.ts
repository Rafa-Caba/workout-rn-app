// src/hooks/bodyMetrics/useUpsertBodyMetric.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

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
                qc.invalidateQueries({ queryKey: ["bodyMetrics"] }),
                qc.invalidateQueries({ queryKey: ["bodyProgress"] }),
                qc.invalidateQueries({ queryKey: ["workoutProgressOverview"] }),
            ]);

            await useUserStore.getState().fetchMe();
        },
    });
}