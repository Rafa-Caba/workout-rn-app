import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getPlanVsActual } from "@/src/services/planVsActual.service";
import { getRoutineWeek } from "@/src/services/workout/routines.service";
import { mergePlanVsActualPlanned } from "@/src/utils/pva/mergePlanVsActual";

export function usePlanVsActual(weekKey: string, enabled: boolean = true) {
    return useQuery<unknown, ApiAxiosError>({
        queryKey: ["planVsActual", weekKey],
        enabled: Boolean(weekKey) && enabled,
        queryFn: async () => {
            const [pva, routine] = await Promise.all([
                getPlanVsActual(weekKey),
                getRoutineWeek(weekKey).catch(() => null),
            ]);

            return mergePlanVsActualPlanned(pva as any, routine);
        },
        staleTime: 30_000,
    });
}