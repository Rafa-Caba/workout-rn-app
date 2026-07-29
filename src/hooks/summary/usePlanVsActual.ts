// /src/hooks/summary/usePlanVsActual.ts
// Fetches and safely merges plan-vs-actual data with the local routine contract.

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import { getPlanVsActual } from "@/src/services/planVsActual.service";
import { getRoutineWeek } from "@/src/services/workout/routines.service";
import {
    mergePlanVsActualPlanned,
    type GymCheckSummary,
    type MergedPlanVsActualDay,
    type MergedPlanVsActualWeek,
} from "@/src/utils/pva/mergePlanVsActual";

export type PlanVsActualDay = MergedPlanVsActualDay;
export type PlanVsActualMerged = MergedPlanVsActualWeek;
export type PvaGymCheckSummary = GymCheckSummary;

function emptyPlanVsActual(weekKey: string): PlanVsActualMerged {
    return {
        weekKey,
        range: { from: "", to: "" },
        hasRoutineTemplate: false,
        days: [],
    };
}

export function usePlanVsActual(weekKey: string, enabled: boolean = true) {
    return useQuery<PlanVsActualMerged, ApiAxiosError>({
        queryKey: queryKeys.summary.planVsActual(weekKey),
        enabled: Boolean(weekKey) && enabled,
        queryFn: async () => {
            const [pva, routine] = await Promise.all([
                getPlanVsActual(weekKey),
                getRoutineWeek(weekKey).catch(() => null),
            ]);

            const merged = mergePlanVsActualPlanned(pva, routine);
            return merged
                ? { ...merged, weekKey: merged.weekKey || weekKey }
                : emptyPlanVsActual(weekKey);
        },
        staleTime: 30_000,
    });
}
