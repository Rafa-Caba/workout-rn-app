import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import {
    defaultTraineeWeekViewParams,
    getWorkoutWeekView,
    type GetWorkoutWeekArgs,
} from "@/src/services/workout/workoutWeek.service";
import type { WeekKey, WeekViewResponse } from "@/src/types/workoutDay.types";

export function useWorkoutWeekView(weekKey: WeekKey | null | undefined, args?: Partial<GetWorkoutWeekArgs>) {
    const enabled = Boolean(weekKey);

    return useQuery<WeekViewResponse, ApiAxiosError>({
        queryKey: ["workoutWeekView", weekKey, args ?? null],
        queryFn: () => {
            const wk = String(weekKey);
            const base = defaultTraineeWeekViewParams(wk as WeekKey);
            return getWorkoutWeekView({ ...base, ...(args ?? {}), weekKey: wk as WeekKey });
        },
        enabled,
        staleTime: 30_000,
    });
}