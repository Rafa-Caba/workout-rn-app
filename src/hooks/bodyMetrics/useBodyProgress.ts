// src/hooks/bodyMetrics/useBodyProgress.ts

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import { getBodyProgressOverview } from "@/src/services/workout/bodyProgress.service";
import type { BodyProgressOverviewResponse } from "@/src/types/bodyProgress.types";
import type {
    WorkoutProgressCompareTo,
    WorkoutProgressMode,
} from "@/src/types/workoutProgress.types";

type UseBodyProgressArgs = {
    mode: WorkoutProgressMode;
    from?: string;
    to?: string;
    compareTo?: WorkoutProgressCompareTo;
};

function isCustomRangeValid(args: UseBodyProgressArgs): boolean {
    if (args.mode !== "customRange") {
        return true;
    }

    return Boolean(args.from) && Boolean(args.to);
}

export function useBodyProgress(args: UseBodyProgressArgs) {
    const enabled = isCustomRangeValid(args);

    return useQuery<BodyProgressOverviewResponse, ApiAxiosError>({
        queryKey: queryKeys.bodyProgress.overview({
            mode: args.mode,
            from: args.from ?? null,
            to: args.to ?? null,
            compareTo: args.compareTo ?? "previous_period",
        }),
        queryFn: () =>
            getBodyProgressOverview({
                mode: args.mode,
                from: args.from,
                to: args.to,
                compareTo: args.compareTo ?? "previous_period",
            }),
        enabled,
        staleTime: 30_000,
    });
}